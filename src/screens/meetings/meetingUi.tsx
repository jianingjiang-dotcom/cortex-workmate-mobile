import type { MeetingStatus } from '../../lib/types'
import { useT } from '../../i18n'

// List-facing status: the ONLY label is a neutral "未转写" for anything not yet
// transcribed (pending / failed / analyzing). Transcribed (done) shows no label,
// and failure is never surfaced here — it lives in the detail page.
export function MeetingStatusPill({ status }: { status: MeetingStatus }) {
  const t = useT()
  if (status === 'done') return null
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium shrink-0 text-label-secondary bg-black/[0.06] dark:bg-white/[0.1]">
      {t('meet.status.untranscribed')}
    </span>
  )
}
