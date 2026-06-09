import { CalendarClock, CheckCircle2, ChevronRight, Plus, XCircle } from 'lucide-react'
import type { OverlayScreenProps, ScheduledTask } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useLang, useT } from '../../i18n'
import { Page } from '../../components/Page'
import { Button, EmptyState, IconButton, Spinner } from '../../components/ui/atoms'
import { formatRelative, scheduleHuman } from '../../lib/time'
import { cn } from '../../lib/util'
import { TaskIcon } from './taskUi'

export function TaskListScreen({ onBack }: OverlayScreenProps) {
  const t = useT()
  const lang = useLang()
  const tasks = useStore((s) => s.tasks)
  const push = useStore((s) => s.push)
  const setTab = useStore((s) => s.setTab)
  const setChatMode = useStore((s) => s.setChatMode)
  const setComposeDraft = useStore((s) => s.setComposeDraft)
  const popAll = useStore((s) => s.popAllOverlays)

  // create a task by asking Workmate (prefill the composer, like the memory add flow)
  const addViaChat = () => {
    setComposeDraft(t('tasks.addPrompt'))
    setChatMode('workmate')
    setTab('chat')
    popAll()
  }

  const active = tasks
    .filter((x) => !x.paused)
    .sort((a, b) => (a.nextRunAt ?? Infinity) - (b.nextRunAt ?? Infinity))
  const paused = tasks.filter((x) => x.paused)

  const renderCard = (task: ScheduledTask) => {
    const lastResult =
      task.runs[0]?.status === 'failed' || task.status === 'failed'
        ? 'failed'
        : task.runs[0]?.status === 'success' || task.status === 'success'
          ? 'success'
          : undefined
    return (
      <button
        key={task.id}
        onClick={() => push('taskDetail', { id: task.id })}
        className="w-full card flex items-center gap-3 px-4 py-3 text-left active:bg-black/[0.02]"
      >
        <TaskIcon cap={task.capabilities[0]} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-semibold truncate flex-1">{task.name}</span>
            {task.status === 'running' && (
              <span className="flex items-center gap-1 text-[12px] text-ios-blue shrink-0">
                <Spinner size={12} className="text-current" />
                {t('tasks.status.running')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[12.5px] min-w-0">
            <span className="px-2 py-0.5 rounded-md bg-brand-violet/10 text-brand-violet font-medium shrink-0">
              {scheduleHuman(task.schedule, lang)}
            </span>
            <span className="text-label-secondary truncate">
              {task.paused
                ? t('tasks.status.paused')
                : task.nextRunAt
                  ? `${t('tasks.nextShort')} · ${formatRelative(task.nextRunAt, lang)}`
                  : '—'}
            </span>
          </div>
          {task.lastRunAt && task.status !== 'running' && (
            <div className="flex items-center gap-1 mt-1 text-[12px] text-label-tertiary">
              {lastResult === 'success' && <CheckCircle2 size={12} className="text-ios-green" />}
              {lastResult === 'failed' && <XCircle size={12} className="text-ios-red" />}
              {t('tasks.lastShort')} · {formatRelative(task.lastRunAt, lang)}
            </div>
          )}
        </div>
        <ChevronRight size={18} className="text-ios-gray3 shrink-0" />
      </button>
    )
  }

  return (
    <Page
      title={t('tasks.title')}
      onBack={onBack}
      bg="group"
      right={
        tasks.length > 0 ? (
          <IconButton onClick={addViaChat} ariaLabel="add">
            <Plus size={23} />
          </IconButton>
        ) : undefined
      }
    >
      <p className="px-4 pt-0.5 pb-2 text-[14px] text-label-secondary leading-snug">{t('tasks.subtitle')}</p>
      {tasks.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={30} />}
          title={t('tasks.empty')}
          subtitle={t('tasks.emptyHint')}
          action={<Button onClick={addViaChat}>{t('tasks.emptyCta')}</Button>}
        />
      ) : (
        <>
          <div className="px-4 pt-1 space-y-3">{active.map(renderCard)}</div>
          {paused.length > 0 && (
            <>
              <div className="px-5 pt-4 pb-1.5 text-[13px] font-medium text-label-secondary uppercase tracking-wide">
                {t('tasks.list.paused')}
              </div>
              <div className="px-4 space-y-3 opacity-60">{paused.map(renderCard)}</div>
            </>
          )}
        </>
      )}
    </Page>
  )
}
