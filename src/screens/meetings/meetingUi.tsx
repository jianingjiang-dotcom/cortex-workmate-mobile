import type { Meeting } from '../../lib/types'
import { useT } from '../../i18n'

// List-facing status pill. Transcription failure is never surfaced here (it stays a
// neutral "未转写" and lives in the detail page) — but the CLOUD-UPLOAD stage is the
// exception: while uploading the pill doubles as a micro progress bar, and an upload
// failure shows red so the user knows the file isn't safe in the cloud yet.
export function MeetingStatusPill({ meeting }: { meeting: Meeting }) {
  const t = useT()
  if (meeting.uploadStatus === 'uploading') {
    return (
      <span
        className="relative overflow-hidden inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium shrink-0 text-ios-blue bg-ios-blue/10"
        role="progressbar"
        aria-label={t('meet.upload.uploading')}
        aria-valuenow={meeting.uploadProgress ?? 0}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* fill layer — square edges; the pill's overflow-hidden rounds the clip */}
        <span
          className="absolute inset-y-0 left-0 bg-ios-blue/20 transition-[width] duration-300 ease-linear"
          style={{ width: `${meeting.uploadProgress ?? 0}%` }}
        />
        <span className="relative">{t('meet.upload.uploading')}</span>
      </span>
    )
  }
  if (meeting.uploadStatus === 'failed') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium shrink-0 text-ios-red bg-ios-red/10">
        {t('meet.upload.failed')}
      </span>
    )
  }
  if (meeting.status === 'done') return null
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium shrink-0 text-label-secondary bg-black/[0.06] dark:bg-white/[0.1]">
      {t('meet.status.untranscribed')}
    </span>
  )
}
