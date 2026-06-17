import { CalendarClock, ChevronRight } from 'lucide-react'
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
    <button
      onClick={() => push('taskDetail', { id: conv.sourceTaskId })}
      className="shrink-0 mx-4 mt-2.5 flex items-center gap-3 rounded-ios-lg bg-brand-primary/[0.08] px-3.5 py-2.5 text-left active:opacity-70"
    >
      <CalendarClock size={20} className="text-brand-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-label-primary leading-tight truncate">
          {task?.name || conv.title}
        </div>
        <div className="text-[13px] text-label-secondary leading-tight mt-px truncate">
          {t('chat.sourceBanner.meta', { time: formatDateTime(conv.sourceTriggeredAt, lang) })}
        </div>
      </div>
      <ChevronRight size={18} className="text-label-tertiary shrink-0" />
    </button>
  )
}
