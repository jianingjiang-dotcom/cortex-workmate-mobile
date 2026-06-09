import { CalendarClock } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useLang, useT } from '../../i18n'
import { formatDateTime } from '../../lib/time'

export function SourceBanner({ conversationId }: { conversationId: string }) {
  const conv = useStore((s) => s.conversations.find((c) => c.id === conversationId))
  const task = useStore((s) => s.tasks.find((x) => x.id === conv?.sourceTaskId))
  const push = useStore((s) => s.push)
  const t = useT()
  const lang = useLang()
  if (!conv?.sourceTaskId || !conv.sourceTriggeredAt) return null
  return (
    <div className="shrink-0 mx-4 mt-2.5 rounded-ios-lg bg-brand-violet/[0.08] border border-brand-violet/15 flex items-center gap-2.5 px-3 py-2.5">
      <CalendarClock size={18} className="text-brand-violet shrink-0" />
      <div className="flex-1 text-[12.5px] leading-snug text-label-primary">
        {t('chat.sourceBanner', {
          name: task?.name || conv.title,
          time: formatDateTime(conv.sourceTriggeredAt, lang),
        })}
      </div>
      {conv.sourceTaskId && (
        <button
          onClick={() => push('taskDetail', { id: conv.sourceTaskId })}
          className="text-[13px] font-semibold text-brand-violet active:opacity-60 shrink-0"
        >
          {t('chat.sourceBanner.view')}
        </button>
      )}
    </div>
  )
}
