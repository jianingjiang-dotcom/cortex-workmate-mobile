import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { useT } from '../../i18n'
import { CenterModal } from '../../components/ui/Sheet'
import { cn } from '../../lib/util'

// Shared "name this recording" dialog for both the recording flow and audio import.
// Besides the name, it offers an opt-in 转译 checkbox (default on) — 转译 bundles the
// cloud-upload + transcription into one step that runs right after save.
export function NameRecordingModal({
  open,
  initialName,
  onCancel,
  onSave,
}: {
  open: boolean
  initialName: string
  onCancel: () => void
  onSave: (name: string, transcribe: boolean) => void
}) {
  const t = useT()
  const [name, setName] = useState(initialName)
  const [transcribe, setTranscribe] = useState(true)

  // re-seed each time the dialog opens (filename for imports, time-stamped name for recordings)
  useEffect(() => {
    if (open) {
      setName(initialName)
      setTranscribe(true)
    }
  }, [open, initialName])

  const submit = () => onSave(name.trim() || initialName, transcribe)

  return (
    <CenterModal open={open} onClose={onCancel}>
      <div className="p-4">
        <div className="text-[16px] font-semibold text-center mb-3">{t('meet.name.title')}</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={t('meet.name.ph')}
          autoFocus
          className="w-full h-11 px-3.5 rounded-ios bg-ios-gray6 text-[15px] outline-none"
        />

        {/* opt-in 转译 checkbox */}
        <button
          type="button"
          role="checkbox"
          aria-checked={transcribe}
          onClick={() => setTranscribe((v) => !v)}
          className="w-full mt-3 flex items-center gap-3 rounded-ios bg-ios-gray6 px-3.5 py-3 text-left active:opacity-80"
        >
          <span
            className={cn(
              'w-[22px] h-[22px] rounded-[6px] flex items-center justify-center shrink-0 transition-colors',
              transcribe ? 'bg-brand-primary' : 'border-[1.5px] border-ios-gray3',
            )}
          >
            {transcribe && <Check size={15} className="text-white" strokeWidth={3} />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] text-label-primary">{t('meet.name.transcribe')}</span>
            <span className="block text-[12px] text-label-secondary mt-0.5 leading-snug">
              {t('meet.name.transcribeHint')}
            </span>
          </span>
        </button>

        <div className="grid grid-cols-2 gap-2.5 mt-3.5">
          <button onClick={onCancel} className="h-11 rounded-ios-lg bg-ios-gray6 font-semibold text-[15px] press">
            {t('common.cancel')}
          </button>
          <button onClick={submit} className="h-11 rounded-ios-lg text-white font-semibold text-[15px] press bg-brand-primary">
            {t('common.save')}
          </button>
        </div>
      </div>
    </CenterModal>
  )
}
