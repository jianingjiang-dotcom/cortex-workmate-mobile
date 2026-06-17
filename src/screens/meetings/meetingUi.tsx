import type { Meeting } from '../../lib/types'
import { useT } from '../../i18n'

// List-facing status pill. 转译 (= cloud-upload + transcribe) is one unified flow ridden by
// the single `status` field: 'analyzing' shows a blue 转译中 pill doubling as a micro progress
// bar; 'failed' shows red 转译失败 (so the user knows it needs a retry). 'done' has no pill;
// everything else is a neutral 未转写.
export function MeetingStatusPill({ meeting }: { meeting: Meeting }) {
  const t = useT()
  if (meeting.status === 'analyzing') {
    return (
      <span
        className="relative overflow-hidden inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium shrink-0 text-ios-blue bg-ios-blue/10"
        role="progressbar"
        aria-label={t('meet.status.analyzing')}
        aria-valuenow={meeting.analyzeProgress ?? 0}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* fill layer — square edges; the pill's overflow-hidden rounds the clip */}
        <span
          className="absolute inset-y-0 left-0 bg-ios-blue/20 transition-[width] duration-300 ease-linear"
          style={{ width: `${meeting.analyzeProgress ?? 0}%` }}
        />
        <span className="relative">{t('meet.status.analyzing')}</span>
      </span>
    )
  }
  if (meeting.status === 'failed') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium shrink-0 text-ios-red bg-ios-red/10">
        {t('meet.status.failed')}
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
