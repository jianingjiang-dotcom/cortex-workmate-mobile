import { useEffect, useRef, useState } from 'react'
import { Mic, Pause, Upload } from 'lucide-react'
import type { OverlayScreenProps } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useLang, useT } from '../../i18n'
import { BackButton } from '../../components/Page'
import { formatDateTime } from '../../lib/time'
import { gradientFor } from '../../lib/util'
import { NameRecordingModal } from './NameRecordingModal'

// waveform geometry
const BAR_W = 3
const GAP = 2
const STEP = BAR_W + GAP
const SAMPLE_MS = 80 // one bar captured per this many ms of audio

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function RecordingScreen({ onBack }: OverlayScreenProps) {
  const t = useT()
  const lang = useLang()
  const createRecording = useStore((s) => s.createRecording)
  const toast = useStore((s) => s.toast)
  const askConfirm = useStore((s) => s.askConfirm)

  const [phase, setPhase] = useState<'intro' | 'recording' | 'denied'>('intro')
  const [paused, setPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')

  // audio + animation refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const samples = useRef<number[]>([])
  const offset = useRef(0) // eased scroll offset (px)
  const colorT = useRef(1) // 1 = recording (red), 0 = paused (gray), eased
  const pausedRef = useRef(false)
  const lastSampleAt = useRef(0)
  const raf = useRef<number>()
  const timer = useRef<ReturnType<typeof setInterval>>()
  const startAt = useRef(0)
  const stream = useRef<MediaStream>()
  const audioCtx = useRef<AudioContext>()
  const analyser = useRef<AnalyserNode>()
  const simulated = useRef(false)

  const cleanup = () => {
    if (raf.current) cancelAnimationFrame(raf.current)
    if (timer.current) clearInterval(timer.current)
    stream.current?.getTracks().forEach((tr) => tr.stop())
    audioCtx.current?.close().catch(() => {})
  }
  useEffect(() => () => cleanup(), [])

  const nextAmplitude = () => {
    if (!simulated.current && analyser.current) {
      const buf = new Uint8Array(analyser.current.fftSize)
      analyser.current.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const x = (buf[i] - 128) / 128
        sum += x * x
      }
      return Math.max(0.04, Math.min(1, Math.sqrt(sum / buf.length) * 2.4))
    }
    // simulated, speech-like: slow envelope × faster bursts × noise
    const k = samples.current.length
    const env = 0.45 + 0.55 * Math.abs(Math.sin(k * 0.045))
    const burst = 0.4 + 0.6 * Math.abs(Math.sin(k * 0.4 + Math.sin(k * 0.13)))
    return Math.max(0.05, Math.min(1, (0.3 + 0.7 * Math.random()) * env * burst))
  }

  const ensureSize = (cv: HTMLCanvasElement) => {
    const dpr = window.devicePixelRatio || 1
    const w = cv.clientWidth
    const h = cv.clientHeight
    const bw = Math.round(w * dpr)
    const bh = Math.round(h * dpr)
    if (cv.width !== bw || cv.height !== bh) {
      cv.width = bw
      cv.height = bh
    }
    return { w, h, dpr }
  }

  const draw = () => {
    const cv = canvasRef.current
    if (!cv) return
    const { w, h, dpr } = ensureSize(cv)
    if (!w || !h) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const now = performance.now()
    if (!pausedRef.current) {
      let guard = 0
      while (now - lastSampleAt.current >= SAMPLE_MS && guard < 8) {
        lastSampleAt.current += SAMPLE_MS
        samples.current.push(nextAmplitude())
        guard++
      }
    } else {
      lastSampleAt.current = now
    }

    const arr = samples.current
    const contentW = arr.length * STEP
    // recording: newest at right edge (grows from left until full); paused: newest at center
    const target = pausedRef.current ? contentW - w / 2 : Math.max(0, contentW - w)
    offset.current += (target - offset.current) * 0.16
    colorT.current += ((pausedRef.current ? 0 : 1) - colorT.current) * 0.1
    const off = offset.current
    const ct = colorT.current

    ctx.clearRect(0, 0, w, h)
    const cy = h / 2
    // baseline (theme-aware — canvas can't use CSS vars)
    const darkUi = document.documentElement.classList.contains('dark')
    ctx.fillStyle = darkUi ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
    ctx.fillRect(0, cy - 0.5, w, 1)
    // bars (color eased gray ↔ red)
    const cr = Math.round(lerp(184, 255, ct))
    const cg = Math.round(lerp(184, 59, ct))
    const cb = Math.round(lerp(190, 48, ct))
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`
    const maxH = h * 0.82
    const rad = BAR_W / 2
    const first = Math.max(0, Math.floor(off / STEP) - 1)
    for (let i = first; i < arr.length; i++) {
      const x = i * STEP - off
      if (x > w) break
      if (x < -STEP) continue
      const bh = Math.max(2, arr[i] * maxH)
      const y = cy - bh / 2
      if (ctx.roundRect) {
        ctx.beginPath()
        ctx.roundRect(x, y, BAR_W, bh, rad)
        ctx.fill()
      } else {
        ctx.fillRect(x, y, BAR_W, bh)
      }
    }
    // write-head cursor (prominent when paused)
    const headX = Math.min(Math.max(contentW - off, 0), w)
    ctx.fillStyle = `rgba(255,59,48,${(0.25 + (1 - ct) * 0.65).toFixed(3)})`
    ctx.fillRect(headX - 1, h * 0.06, 2, h * 0.88)
  }

  const startDraw = () => {
    if (raf.current) cancelAnimationFrame(raf.current)
    const loop = () => {
      draw()
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
  }

  const startRecording = (sim: boolean) => {
    simulated.current = sim
    samples.current = []
    offset.current = 0
    colorT.current = 1
    pausedRef.current = false
    lastSampleAt.current = performance.now()
    startAt.current = Date.now()
    setElapsed(0)
    setPaused(false)
    setPhase('recording')
    timer.current = setInterval(() => setElapsed(Date.now() - startAt.current), 100)
    startDraw()
  }

  const requestMic = async () => {
    try {
      const s = (await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
      ])) as MediaStream
      stream.current = s
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioCtx.current = ctx
      const src = ctx.createMediaStreamSource(s)
      const an = ctx.createAnalyser()
      an.fftSize = 1024
      src.connect(an)
      analyser.current = an
      startRecording(false)
    } catch {
      setPhase('denied')
    }
  }

  const pauseRecording = () => {
    if (timer.current) clearInterval(timer.current)
    pausedRef.current = true
    setPaused(true)
  }

  const resumeRecording = () => {
    pausedRef.current = false
    setPaused(false)
    startAt.current = Date.now() - elapsed
    lastSampleAt.current = performance.now()
    timer.current = setInterval(() => setElapsed(Date.now() - startAt.current), 100)
  }

  // 结束 = finish: pause (if needed) and prompt for a name to save
  const end = () => {
    if (!paused) pauseRecording()
    setName(`${t('meet.record')} · ${formatDateTime(Date.now(), lang)}`)
    setNaming(true)
  }

  // back out of the name prompt → stay on the (paused) recording screen; not a discard
  const cancelNaming = () => setNaming(false)

  const save = (title: string, transcribe: boolean) => {
    createRecording({ title: title.trim() || t('meet.record'), durationMs: elapsed, source: 'recording', transcribe })
    toast(t('meet.saved'), 'success')
    setNaming(false) // close the name modal so it doesn't linger during the overlay's exit
    cleanup()
    onBack()
  }

  // top-left back: while recording, confirm first (unsaved audio would be lost)
  const handleBack = () => {
    if (phase === 'recording') {
      askConfirm({
        title: t('meet.rec.exitConfirm'),
        message: t('meet.rec.exitBody'),
        confirmText: t('meet.rec.exit'),
        danger: true,
        onConfirm: () => {
          cleanup()
          onBack()
        },
      })
    } else {
      onBack()
    }
  }

  const mm = String(Math.floor(elapsed / 60000)).padStart(2, '0')
  const ss = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0')
  const tenth = Math.floor((elapsed % 1000) / 100)

  return (
    <div className="absolute inset-0 overflow-hidden bg-surface">
      {/* subtle ambient glow at the bottom */}
      <div
        className="absolute bottom-[-40px] left-1/2 -translate-x-1/2 w-[320px] h-[240px] rounded-full blur-[90px] opacity-[0.16] pointer-events-none"
        style={{ background: gradientFor('brand') }}
      />

      {/* top-left back (confirms before discarding an in-progress recording) */}
      <div className="absolute top-[54px] left-1 z-40">
        <BackButton onClick={handleBack} />
      </div>

      {phase === 'intro' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-9 text-center">
          <div className="w-20 h-20 rounded-[24px] flex items-center justify-center mb-6" style={{ background: gradientFor('sunset') }}>
            <Mic size={36} className="text-white" />
          </div>
          <h2 className="text-[22px] font-bold text-label-primary">{t('meet.rec.permTitle')}</h2>
          <p className="text-[14px] text-label-secondary mt-2.5 leading-relaxed">{t('meet.rec.permBody')}</p>
          <button onClick={requestMic} className="w-full h-13 mt-8 rounded-ios-lg bg-brand-primary text-white font-semibold text-[16px] py-3.5 press">
            {t('meet.rec.permAllow')}
          </button>
        </div>
      )}

      {phase === 'denied' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-9 text-center">
          <div className="w-20 h-20 rounded-[24px] bg-ios-gray6 flex items-center justify-center mb-6">
            <Mic size={36} className="text-label-tertiary" />
          </div>
          <h2 className="text-[22px] font-bold text-label-primary">{t('meet.rec.permDenied')}</h2>
          <p className="text-[14px] text-label-secondary mt-2.5 leading-relaxed">{t('meet.rec.permDeniedBody')}</p>
          <button onClick={() => startRecording(true)} className="w-full h-13 mt-8 rounded-ios-lg bg-brand-primary text-white font-semibold text-[16px] py-3.5 press">
            {t('meet.rec.useDemo')}
          </button>
          <button onClick={onBack} className="mt-3 text-[15px] text-label-secondary font-medium active:opacity-60 flex items-center gap-1.5">
            <Upload size={15} />
            {t('meet.rec.importInstead')}
          </button>
        </div>
      )}

      {phase === 'recording' && (
        <div className="absolute inset-0 flex flex-col pt-[84px] pb-12">
          {/* timer + status */}
          <div className="text-center">
            <div className="text-[56px] font-light tabular-nums tracking-tight leading-none">
              <span className="text-label-tertiary">{mm}:</span>
              <span className="text-label-primary">
                {ss}.{tenth}
              </span>
            </div>
            <div className="text-[14px] text-label-secondary mt-3 inline-flex items-center gap-2">
              {paused ? (
                <Pause size={13} fill="currentColor" className="text-label-tertiary" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-ios-red animate-pulse" />
              )}
              {paused ? t('meet.rec.paused') : t('meet.rec.title')}
            </div>
          </div>

          {/* scrolling waveform */}
          <div className="flex-1 flex items-center">
            <canvas ref={canvasRef} className="block w-full h-[210px]" />
          </div>

          {/* centered controls: [·] [pause/record toggle] [end] */}
          <div className="grid grid-cols-3 items-center px-12">
            <div />
            <div className="flex justify-center">
              {paused ? (
                <button
                  onClick={resumeRecording}
                  aria-label="resume recording"
                  className="w-[76px] h-[76px] rounded-full bg-surface shadow-ios-lg ring-1 ring-black/[0.06] flex items-center justify-center active:scale-95 transition-transform"
                >
                  <span className="w-[56px] h-[56px] rounded-full bg-ios-red" />
                </button>
              ) : (
                <button
                  onClick={pauseRecording}
                  aria-label="pause recording"
                  className="w-[76px] h-[76px] rounded-full bg-surface shadow-ios-lg ring-1 ring-black/[0.06] flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Pause size={30} fill="currentColor" className="text-ios-red" />
                </button>
              )}
            </div>
            <div className="flex justify-end">
              <button onClick={end} aria-label="end recording" className="w-12 h-12 flex items-center justify-center active:opacity-50">
                <span className="w-[24px] h-[24px] rounded-[6px] bg-label-primary" />
              </button>
            </div>
          </div>
        </div>
      )}

      <NameRecordingModal open={naming} initialName={name} onCancel={cancelNaming} onSave={save} />
    </div>
  )
}
