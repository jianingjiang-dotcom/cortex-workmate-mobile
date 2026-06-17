import { useRef, useState } from 'react'
import { AudioLines, Search, Upload } from 'lucide-react'
import type { Meeting, OverlayScreenProps } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useLang, useT } from '../../i18n'
import { Page } from '../../components/Page'
import { EmptyState, Highlight, IconButton, SearchField } from '../../components/ui/atoms'
import { dayBucket, formatDuration, formatTimeOnly } from '../../lib/time'
import { solidFor } from '../../lib/util'
import { MeetingStatusPill } from './meetingUi'
import { NameRecordingModal } from './NameRecordingModal'

export function MeetingListScreen({ onBack }: OverlayScreenProps) {
  const t = useT()
  const lang = useLang()
  const meetings = useStore((s) => s.meetings)
  const push = useStore((s) => s.push)
  const createRecording = useStore((s) => s.createRecording)
  const toast = useStore((s) => s.toast)
  const fileRef = useRef<HTMLInputElement>(null)

  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  // imported file awaiting the name + 转译 dialog (same dialog the recording flow uses)
  const [pendingImport, setPendingImport] = useState<{ name: string; durationMs: number } | null>(null)

  const onImport = (file: File) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    audio.preload = 'metadata'
    const finish = (durationMs: number) => {
      setPendingImport({ name: file.name.replace(/\.[^.]+$/, ''), durationMs })
      URL.revokeObjectURL(url)
    }
    audio.onloadedmetadata = () => finish(isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 60000)
    audio.onerror = () => finish(60000)
    audio.src = url
  }

  const saveImport = (name: string, transcribe: boolean) => {
    if (!pendingImport) return
    createRecording({ title: name, durationMs: pendingImport.durationMs, source: 'import', transcribe })
    setPendingImport(null)
    toast(t('meet.imported'), 'success')
  }

  const sorted = [...meetings].sort((a, b) => b.createdAt - a.createdAt)
  const buckets = ['today', 'yesterday', 'earlier'] as const
  const grouped = buckets
    .map((b) => ({ b, items: sorted.filter((m) => dayBucket(m.createdAt) === b) }))
    .filter((g) => g.items.length > 0)
  const filtered = sorted.filter((m) => m.title.toLowerCase().includes(q))
  const closeSearch = () => {
    setSearching(false)
    setQuery('')
  }

  const Row = ({ m }: { m: Meeting }) => (
    <button
      onClick={() => push('meetingDetail', { id: m.id })}
      className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-black/[0.03]"
    >
      <div
        className="w-11 h-11 rounded-[13px] flex items-center justify-center text-white shrink-0"
        style={{ background: solidFor(m.source === 'import' ? 'mint' : 'violet') }}
      >
        <AudioLines size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[16px] font-semibold truncate">
          {q ? <Highlight text={m.title} query={query} /> : m.title}
        </div>
        <div className="text-[13px] text-label-secondary tabular-nums">
          {formatTimeOnly(m.createdAt)} · {formatDuration(m.durationMs, lang)}
        </div>
      </div>
      <MeetingStatusPill meeting={m} />
    </button>
  )

  return (
    <>
      <Page
        title={t('meet.title')}
        onBack={onBack}
        bg="group"
        right={
          <>
            <IconButton onClick={() => fileRef.current?.click()} ariaLabel="upload audio">
              <Upload size={20} />
            </IconButton>
            {meetings.length > 0 && (
              <IconButton onClick={() => setSearching(true)} ariaLabel="search">
                <Search size={21} />
              </IconButton>
            )}
          </>
        }
      >
        {searching ? (
          <>
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder={t('meet.search.title')}
              onClose={closeSearch}
              closeLabel={t('common.cancel')}
            />
            {q && filtered.length === 0 ? (
              <div className="text-center text-[14px] text-label-tertiary pt-16">{t('meet.search.noResults')}</div>
            ) : (
              <div className="px-4 mt-1">
                <div className="list-group divide-y divide-divider">
                  {(q ? filtered : sorted).map((m) => (
                    <Row key={m.id} m={m} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="px-4 pt-0.5 pb-2 text-[14px] text-label-secondary leading-snug">{t('meet.subtitle')}</p>

            {meetings.length === 0 ? (
              <EmptyState icon={<AudioLines size={30} />} title={t('meet.empty')} subtitle={t('meet.emptyHint')} />
            ) : (
              <div className="mt-1">
                {grouped.map((g) => (
                  <div key={g.b} className="px-4 mb-4">
                    <div className="px-1 pb-1.5 text-[13px] font-medium text-label-secondary">{t(`meet.group.${g.b}`)}</div>
                    <div className="list-group divide-y divide-divider">
                      {g.items.map((m) => (
                        <Row key={m.id} m={m} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="h-[136px]" /> {/* clear the bottom record bar */}
          </>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onImport(f)
            e.target.value = ''
          }}
        />
      </Page>

      <NameRecordingModal
        open={!!pendingImport}
        initialName={pendingImport?.name ?? ''}
        onCancel={() => setPendingImport(null)}
        onSave={saveImport}
      />

      {/* bottom action bar — centered camcorder-style start-record button */}
      {!searching && (
        <div className="absolute bottom-0 left-0 right-0 z-40 glass hairline-t pt-3.5 pb-[28px] flex justify-center">
          <button
            onClick={() => push('recording')}
            aria-label={t('meet.startRecord')}
            className="flex flex-col items-center gap-1.5 press"
          >
            <span className="w-[66px] h-[66px] rounded-full border-[3px] border-label-primary/25 flex items-center justify-center">
              <span className="w-[30px] h-[30px] rounded-full bg-ios-red transition-transform" />
            </span>
            <span className="text-[12px] font-medium text-label-secondary">{t('meet.startRecord')}</span>
          </button>
        </div>
      )}
    </>
  )
}
