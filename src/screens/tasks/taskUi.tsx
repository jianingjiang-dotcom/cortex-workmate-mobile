import type { RunRecord, TaskStatus } from '../../lib/types'
import { cn } from '../../lib/util'
import { formatDateTime, formatDuration } from '../../lib/time'
import { useLang, useT, type TFn } from '../../i18n'
import { Spinner } from '../../components/ui/atoms'
import { CalendarClock, CheckCircle2, ChevronRight, Clock, Github, Globe, Mail, XCircle, type LucideIcon } from 'lucide-react'
import { useStore } from '../../store/useStore'

export function capLabel(cap: string, t: TFn): string {
  return t(`cap.${cap}`)
}

// Leading icon for a task, by its primary capability.
const CAP_ICON: Record<string, { Icon: LucideIcon; bg: string }> = {
  github: { Icon: Github, bg: '#6D6AF0' },
  web: { Icon: Globe, bg: '#5B7CFA' },
  calendar: { Icon: CalendarClock, bg: '#34C759' },
  email: { Icon: Mail, bg: '#FF9500' },
  scheduler: { Icon: Clock, bg: '#8E8E93' },
}

export function TaskIcon({ cap, size = 38 }: { cap?: string; size?: number }) {
  const m = CAP_ICON[cap ?? 'scheduler'] ?? CAP_ICON.scheduler
  const Icon = m.Icon
  return (
    <div
      className="flex items-center justify-center text-label-secondary shrink-0"
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.5)} />
    </div>
  )
}

export function TaskStatusPill({ status }: { status: TaskStatus }) {
  const t = useT()
  const meta: Record<TaskStatus, { color: string; bg: string }> = {
    idle: { color: 'text-label-secondary', bg: 'bg-black/[0.06] dark:bg-white/[0.1]' },
    running: { color: 'text-ios-blue', bg: 'bg-ios-blue/10' },
    success: { color: 'text-ios-green', bg: 'bg-ios-green/12' },
    failed: { color: 'text-ios-red', bg: 'bg-ios-red/10' },
    paused: { color: 'text-ios-orange', bg: 'bg-ios-orange/12' },
  }
  const m = meta[status]
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium', m.color, m.bg)}>
      {status === 'running' && <Spinner size={11} className="text-current" />}
      {t(`tasks.status.${status}`)}
    </span>
  )
}

export function RunRecordRow({ run, last }: { run: RunRecord; last?: boolean }) {
  const t = useT()
  const lang = useLang()
  const push = useStore((s) => s.push)
  return (
    <div className={cn('flex items-start gap-3 px-4 py-3', !last && 'border-b border-divider')}>
      <div className="mt-0.5 shrink-0">
        {run.status === 'success' ? (
          <CheckCircle2 size={20} className="text-ios-green" />
        ) : run.status === 'failed' ? (
          <XCircle size={20} className="text-ios-red" />
        ) : (
          <Spinner size={18} className="text-ios-blue" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[14px] font-medium">
            {run.status === 'success'
              ? t('tasks.run.success')
              : run.status === 'failed'
                ? t('tasks.run.failed')
                : t('tasks.run.running')}
          </div>
          <div className="text-[12px] text-label-tertiary shrink-0">{formatDateTime(run.startedAt, lang)}</div>
        </div>
        {(run.resultSummary || run.failureReason) && (
          <div className={cn('text-[14px] mt-0.5 leading-snug', run.failureReason ? 'text-ios-red' : 'text-label-secondary')}>
            {run.failureReason || run.resultSummary}
          </div>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          {run.durationMs != null && (
            <span className="text-[12px] text-label-tertiary">
              {t('tasks.detail.duration')} {formatDuration(run.durationMs, lang)}
            </span>
          )}
          {run.conversationId && (
            <button
              onClick={() => push('conversation', { id: run.conversationId })}
              className="text-[12px] font-medium text-ios-blue flex items-center active:opacity-60"
            >
              {t('tasks.run.openConversation')}
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
