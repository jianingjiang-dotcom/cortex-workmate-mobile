import { useEffect, useMemo, useRef, useState } from 'react'
import { AudioLines, Check, CloudOff, Copy, MoreHorizontal, Pause, Play, RotateCcw, RotateCw, Search } from 'lucide-react'
import type { Meeting, OverlayScreenProps, SummaryTemplate } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useLang, useT } from '../../i18n'
import { BackButton } from '../../components/Page'
import { Button, EmptyState, Highlight, IconButton, Pill, SearchField, Segmented, Spinner, Switch } from '../../components/ui/atoms'
import { ActionSheet, CenterModal, Sheet } from '../../components/ui/Sheet'
import { Markdown } from '../../components/chat/parts'
import { SUMMARY_TEMPLATES } from '../../data/seed'
import { formatClock, formatDateTime, formatDuration } from '../../lib/time'
import { clamp, cn, solidFor, speakerColor } from '../../lib/util'

// Suggest a template: re-transcribe keeps the current one; first transcribe guesses by title
// (mirrors analysisFor's keyword routing so the suggestion tends to match the scenario).
function defaultTemplate(m: Meeting): SummaryTemplate {
  if (m.template) return m.template
  if (/面试|访谈|interview/i.test(m.title)) return 'interview'
  if (/客户|customer|client/i.test(m.title)) return 'customer'
  if (/评审|会议|周会|review|meeting/i.test(m.title)) return 'meeting'
  return 'generic'
}

export function MeetingDetailScreen({ params, onBack }: OverlayScreenProps) {
  const t = useT()
  const lang = useLang()
  const meeting = useStore((s) => s.meetings.find((m) => m.id === params?.id))
  const transcribe = useStore((s) => s.transcribeMeeting)
  const uploadMeeting = useStore((s) => s.uploadMeeting)
  const renameMeeting = useStore((s) => s.renameMeeting)
  const deleteMeeting = useStore((s) => s.deleteMeeting)
  const askConfirm = useStore((s) => s.askConfirm)
  const toast = useStore((s) => s.toast)

  const [tab, setTab] = useState<'transcript' | 'summary'>('transcript')
  const [menuOpen, setMenuOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameText, setRenameText] = useState('')
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')

  // transcribe / re-transcribe sheet
  const [transcribeOpen, setTranscribeOpen] = useState(false)
  const [transcribeMode, setTranscribeMode] = useState<'first' | 're'>('first')
  const [tpl, setTpl] = useState<SummaryTemplate>('generic')
  const [regenTranscript, setRegenTranscript] = useState(false)
  const [note, setNote] = useState('')

  // player state
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const [speed, setSpeed] = useState(1)
  const trackRef = useRef<HTMLDivElement>(null)
  const segRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  const duration = meeting?.durationMs ?? 0

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setPos((p) => {
        const np = p + 100 * speed
        if (np >= duration) {
          setPlaying(false)
          return duration
        }
        return np
      })
    }, 100)
    return () => clearInterval(id)
  }, [playing, speed, duration])

  const activeSeg = useMemo(() => {
    if (!meeting?.transcript) return undefined
    return (
      meeting.transcript.find((s) => pos >= s.startMs && pos < s.endMs) ||
      (pos >= duration ? meeting.transcript[meeting.transcript.length - 1] : undefined)
    )
  }, [meeting, pos, duration])

  useEffect(() => {
    if (playing && activeSeg && segRefs.current[activeSeg.id]) {
      segRefs.current[activeSeg.id]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [activeSeg?.id, playing])

  if (!meeting) {
    return (
      <div className="absolute inset-0 bg-surface">
        <div className="absolute top-[54px] left-0 right-0 z-30 h-[44px] flex items-center px-2">
          <BackButton onClick={onBack} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <EmptyState icon={<AudioLines size={28} />} title={t('common.empty')} />
        </div>
      </div>
    )
  }

  const seekFromEvent = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect()
    if (!r) return
    setPos(clamp(((clientX - r.left) / r.width) * duration, 0, duration))
  }
  const startDrag = (e: React.PointerEvent) => {
    seekFromEvent(e.clientX)
    const move = (ev: PointerEvent) => seekFromEvent(ev.clientX)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const failureText = meeting.failureReason?.startsWith('meet.') ? t(meeting.failureReason) : meeting.failureReason
  const isDone = meeting.status === 'done'
  const qd = query.trim().toLowerCase()
  const segments = meeting.transcript ?? []
  const shownSegments = qd ? segments.filter((s) => s.text.toLowerCase().includes(qd)) : segments
  const closeSearch = () => {
    setSearching(false)
    setQuery('')
  }

  const copyTranscript = () => {
    const txt = segments.map((s) => `${s.speaker}: ${s.text}`).join('\n')
    const p = navigator.clipboard?.writeText(txt)
    if (p) p.then(() => toast(t('meet.copied'), 'neutral')).catch(() => toast(t('common.copyFailed'), 'error'))
    else toast(t('common.copyFailed'), 'error')
  }

  const copySummary = () => {
    const p = navigator.clipboard?.writeText(meeting.summaryMarkdown || '')
    if (p) p.then(() => toast(t('meet.copiedSummary'), 'neutral')).catch(() => toast(t('common.copyFailed'), 'error'))
    else toast(t('common.copyFailed'), 'error')
  }

  const openTranscribe = (mode: 'first' | 're') => {
    setTranscribeMode(mode)
    setTpl(defaultTemplate(meeting)) // re → current template; first → guessed by title
    setRegenTranscript(false) // default: only regenerate the summary
    setNote(meeting.summaryNote ?? '') // re → prefill the last note; first → empty
    setTranscribeOpen(true)
  }
  const startTranscribe = () => {
    transcribe(meeting.id, {
      template: tpl,
      // a first transcribe always builds the transcript; the store derives the path from status
      regenerateTranscript: transcribeMode === 're' ? regenTranscript : true,
      note: note.trim() || undefined,
    })
    setTranscribeOpen(false)
  }

  return (
    <div className="absolute inset-0 bg-surface flex flex-col">
      {/* header */}
      <div className="absolute top-[54px] left-0 right-0 z-30 glass hairline-b h-[44px] flex items-center px-2">
        <div className="flex-1">
          <BackButton onClick={onBack} />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold truncate max-w-[50%] text-center">
          {meeting.title}
        </div>
        <div className="flex-1 flex justify-end items-center">
          {isDone && (
            <IconButton onClick={() => setSearching(true)} ariaLabel="search transcript">
              <Search size={20} />
            </IconButton>
          )}
          <IconButton onClick={() => setMenuOpen(true)} ariaLabel="more">
            <MoreHorizontal size={22} />
          </IconButton>
        </div>
      </div>

      <div className="absolute top-[98px] inset-x-0 bottom-0 flex flex-col">
        {/* player — always visible */}
        <div className="px-5 pt-3 pb-3 border-b border-divider">
          <div ref={trackRef} onPointerDown={startDrag} className="relative h-9 flex items-center cursor-pointer touch-none">
            <div className="w-full h-1.5 rounded-full bg-ios-gray5 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${duration ? (pos / duration) * 100 : 0}%`, background: solidFor('brand') }} />
            </div>
            <div
              className="absolute w-3.5 h-3.5 rounded-full bg-surface shadow-md -ml-1.5"
              style={{ left: `${duration ? (pos / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-[12px] text-label-secondary tabular-nums -mt-0.5">
            <span>{formatClock(pos)}</span>
            <span>{formatClock(duration)}</span>
          </div>

          <div className="flex items-center justify-center gap-8 mt-2">
            <button onClick={() => setPos((p) => clamp(p - 15000, 0, duration))} className="text-label-secondary active:opacity-50 flex flex-col items-center">
              <RotateCcw size={26} strokeWidth={1.75} />
              <span className="text-[12px] mt-1 text-label-secondary">15</span>
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="w-14 h-14 rounded-full flex items-center justify-center text-label-primary press bg-ios-gray5"
            >
              {playing ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={() => setPos((p) => clamp(p + 15000, 0, duration))} className="text-label-secondary active:opacity-50 flex flex-col items-center">
              <RotateCw size={26} strokeWidth={1.75} />
              <span className="text-[12px] mt-1 text-label-secondary">15</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 mt-4">
            <span className="text-[12px] text-label-secondary tabular-nums">
              {formatDateTime(meeting.createdAt, lang)} · {formatDuration(meeting.durationMs, lang)}
            </span>
            <button
              onClick={() => setSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))}
              className="text-[12px] font-medium text-label-secondary bg-ios-gray6 rounded-full px-3 py-1"
            >
              {t('meet.player.speed')} {speed}x
            </button>
          </div>
        </div>

        {isDone ? (
          <>
            {searching ? (
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder={t('meet.search.content')}
                onClose={closeSearch}
                closeLabel={t('common.cancel')}
              />
            ) : (
              <div className="px-4 py-2.5">
                <Segmented
                  layoutId="meet-tab"
                  options={[
                    { value: 'transcript', label: t('meet.tab.transcript') },
                    { value: 'summary', label: t('meet.tab.summary') },
                  ]}
                  value={tab}
                  onChange={setTab}
                />
              </div>
            )}

            <div ref={scrollRef} className="flex-1 scroll-y no-scrollbar px-4 pb-8">
              {searching || tab === 'transcript' ? (
                qd && shownSegments.length === 0 ? (
                  <div className="text-center text-[14px] text-label-tertiary pt-12">{t('meet.search.noResults')}</div>
                ) : (
                  <div className="space-y-1">
                    {shownSegments.map((seg) => {
                      const c = speakerColor(seg.speakerIndex)
                      const active = !qd && activeSeg?.id === seg.id
                      return (
                        <button
                          key={seg.id}
                          ref={(el) => (segRefs.current[seg.id] = el)}
                          onClick={() => setPos(seg.startMs)}
                          className={cn('w-full text-left rounded-ios-lg px-3 py-2.5 transition-colors', active ? '' : 'active:bg-black/[0.03]')}
                          style={active ? { background: c.bg } : undefined}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full" style={{ background: c.dot }} />
                            <span className="text-[12px] font-semibold" style={{ color: c.text }}>
                              {seg.speaker}
                            </span>
                            <span className="text-[12px] text-label-tertiary tabular-nums">{formatClock(seg.startMs)}</span>
                          </div>
                          <div className={cn('text-[16px] leading-normal', active ? 'text-label-primary font-medium' : 'text-label-primary/85')}>
                            {qd ? <Highlight text={seg.text} query={query} /> : seg.text}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              ) : (
                <>
                  {(meeting.template || meeting.summaryUpdatedAt) && (
                    <div className="flex items-center gap-2 px-1 pt-1.5 pb-1">
                      {meeting.template && <Pill color="brand">{t('meet.template.' + meeting.template)}</Pill>}
                      {meeting.summaryUpdatedAt && (
                        <span className="text-[12px] text-label-secondary truncate">
                          {t('meet.summary.updatedAt', { time: formatDateTime(meeting.summaryUpdatedAt, lang) })}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="card px-4 py-3.5 mt-1 relative">
                    <button
                      onClick={copySummary}
                      aria-label="copy summary"
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center text-label-secondary active:bg-black/[0.06]"
                    >
                      <Copy size={16} />
                    </button>
                    <Markdown>{meeting.summaryMarkdown || ''}</Markdown>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-0 pb-12">
            <NonDone
              meeting={meeting}
              failure={failureText}
              onTranscribe={() => openTranscribe('first')}
              onRetryUpload={() => uploadMeeting(meeting.id)}
            />
          </div>
        )}
      </div>

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        cancelLabel={t('common.cancel')}
        actions={[
          ...(isDone ? [{ label: t('meet.retranscribe'), onClick: () => openTranscribe('re') }] : []),
          ...(isDone ? [{ label: t('meet.copyTranscript'), onClick: copyTranscript }] : []),
          {
            label: t('common.rename'),
            onClick: () => {
              setRenameText(meeting.title)
              setRenameOpen(true)
            },
          },
          {
            label: t('common.delete'),
            destructive: true,
            onClick: () =>
              askConfirm({
                title: t('meet.deleteConfirm'),
                message: t('meet.deleteBody'),
                confirmText: t('common.delete'),
                danger: true,
                onConfirm: () => {
                  deleteMeeting(meeting.id)
                  toast(t('meet.deleted'), 'delete')
                  onBack()
                },
              }),
          },
        ]}
      />

      <CenterModal open={renameOpen} onClose={() => setRenameOpen(false)}>
        <div className="p-4">
          <div className="text-[16px] font-semibold text-center mb-3">{t('common.rename')}</div>
          <input
            value={renameText}
            onChange={(e) => setRenameText(e.target.value)}
            autoFocus
            className="w-full h-11 px-3.5 rounded-ios bg-ios-gray6 text-[16px] outline-none"
          />
          <div className="grid grid-cols-2 gap-2.5 mt-3.5">
            <button onClick={() => setRenameOpen(false)} className="h-10 rounded-ios-lg bg-ios-gray6 font-semibold text-[16px]">
              {t('common.cancel')}
            </button>
            <button
              onClick={() => {
                if (renameText.trim()) {
                  renameMeeting(meeting.id, renameText.trim())
                  toast(t('meet.renamed'), 'neutral')
                }
                setRenameOpen(false)
              }}
              className="h-10 rounded-ios-lg text-white font-semibold text-[16px] bg-brand-primary"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </CenterModal>

      {/* transcribe / re-transcribe: pick a summary template (+ optional transcript regen) */}
      <Sheet
        open={transcribeOpen}
        onClose={() => setTranscribeOpen(false)}
        title={t(transcribeMode === 're' ? 'meet.retranscribe.title' : 'meet.template.title')}
        footer={
          <Button full size="lg" onClick={startTranscribe}>
            {t(transcribeMode === 're' ? 'meet.retranscribe.start' : 'meet.template.start')}
          </Button>
        }
      >
        <div className="px-4 pb-1">
          <div className="list-group divide-y divide-divider">
            {SUMMARY_TEMPLATES.map(({ key }) => {
              const on = tpl === key
              return (
                <button
                  key={key}
                  onClick={() => setTpl(key)}
                  className="w-full flex items-center gap-3 py-3 text-left active:bg-black/[0.04]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[16px] text-label-primary">{t('meet.template.' + key)}</div>
                    <div className="text-[14px] text-label-secondary mt-0.5">{t('meet.template.' + key + '.desc')}</div>
                  </div>
                  {on && <Check size={20} className="text-ios-purple shrink-0" strokeWidth={2.5} />}
                </button>
              )
            })}
          </div>

          {transcribeMode === 're' && (
            <div className="card mt-3 px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[16px] text-label-primary">{t('meet.retranscribe.regenTranscript')}</div>
                <div className="text-[12px] text-label-tertiary mt-0.5 leading-snug">{t('meet.retranscribe.regenHint')}</div>
              </div>
              <Switch checked={regenTranscript} onChange={setRegenTranscript} />
            </div>
          )}

          {/* optional background note — gives the AI more context for the summary */}
          <div className="mt-3">
            <div className="pb-1.5 text-[14px] font-medium text-label-secondary">{t('meet.template.note')}</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('meet.template.note.ph')}
              rows={2}
              className="w-full rounded-ios-lg bg-surface border border-input px-3 py-2.5 text-[16px] leading-snug outline-none resize-none placeholder:text-label-tertiary"
            />
          </div>
        </div>
      </Sheet>
    </div>
  )
}

function NonDone({
  meeting,
  failure,
  onTranscribe,
  onRetryUpload,
}: {
  meeting: Meeting
  failure?: string // resolved transcription-failure text (from the parent)
  onTranscribe: () => void
  onRetryUpload: () => void
}) {
  const t = useT()
  const { status, analyzeProgress: progress, analyzeStage: stage } = meeting

  // ---- cloud-upload stage (gates everything below) ----
  if (meeting.uploadStatus === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-10 text-center">
        <Spinner size={34} className="text-ios-purple" />
        <div className="text-[16px] font-semibold mt-4">
          {t('meet.upload.uploading')} {meeting.uploadProgress ?? 0}%
        </div>
        <div className="w-full max-w-[240px] h-1.5 rounded-full bg-ios-gray5 overflow-hidden mt-4">
          <div
            className="h-full rounded-full bg-ios-purple transition-all duration-300"
            style={{ width: `${meeting.uploadProgress ?? 0}%` }}
          />
        </div>
      </div>
    )
  }
  if (meeting.uploadStatus === 'failed') {
    const reason = meeting.uploadFailReason
    return (
      <div className="flex flex-col items-center justify-center h-full px-10 text-center">
        <div className="w-[72px] h-[72px] rounded-[20px] flex items-center justify-center mb-4 bg-ios-gray5 text-label-secondary">
          <CloudOff size={30} />
        </div>
        <div className="text-[16px] font-semibold">{t('meet.upload.failed')}</div>
        {reason && (
          <div className="text-[14px] text-ios-red mt-1.5">{reason.startsWith('meet.') ? t(reason) : reason}</div>
        )}
        <button
          onClick={onRetryUpload}
          className="mt-6 h-11 px-6 rounded-ios-lg text-white font-semibold text-[16px] press bg-brand-primary"
        >
          {t('meet.upload.retry')}
        </button>
      </div>
    )
  }

  if (status === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-10 text-center">
        <Spinner size={34} className="text-brand-violet" />
        <div className="text-[16px] font-semibold mt-4">{stage ? t(stage) : t('meet.status.analyzing')}</div>
        <div className="w-full max-w-[240px] h-1.5 rounded-full bg-ios-gray5 overflow-hidden mt-4">
          <div className="h-full rounded-full bg-brand-violet transition-all duration-300" style={{ width: `${progress ?? 0}%` }} />
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center h-full px-10 text-center">
      <div className="w-[72px] h-[72px] rounded-[20px] flex items-center justify-center mb-4 bg-ios-gray5 text-label-secondary">
        <AudioLines size={30} />
      </div>
      <div className="text-[16px] font-semibold">
        {status === 'failed' ? t('meet.status.failed') : t('meet.transcript.empty')}
      </div>
      {status === 'failed' && failure && <div className="text-[14px] text-ios-red mt-1.5">{failure}</div>}
      <button
        onClick={onTranscribe}
        className="mt-6 h-11 px-6 rounded-ios-lg text-white font-semibold text-[16px] press bg-brand-primary"
      >
        {status === 'failed' ? t('meet.retranscribe') : t('meet.transcribe')}
      </button>
    </div>
  )
}
