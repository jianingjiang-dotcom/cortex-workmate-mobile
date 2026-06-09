import { useState } from 'react'
import { ChevronRight, MoreHorizontal, Pause, Play } from 'lucide-react'
import type { McpServer, OverlayScreenProps, Schedule, ScheduleKind } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useLang, useT } from '../../i18n'
import { Page } from '../../components/Page'
import { Button, EmptyState, IconButton, Pill, Row, Section, ServerLogo } from '../../components/ui/atoms'
import { ActionSheet, Sheet } from '../../components/ui/Sheet'
import { formatRelative, scheduleHuman, WEEKDAYS_EN, WEEKDAYS_ZH } from '../../lib/time'
import { cn } from '../../lib/util'
import { RunRecordRow, TaskStatusPill } from './taskUi'
import { CalendarClock } from 'lucide-react'

const KIND_LABEL: Record<ScheduleKind, string> = {
  daily: 'tasks.edit.everyDay',
  weekly: 'tasks.edit.everyWeek',
  interval: 'tasks.edit.interval',
  once: 'tasks.edit.everyDay',
}

export function TaskDetailScreen({ params, onBack }: OverlayScreenProps) {
  const t = useT()
  const lang = useLang()
  const task = useStore((s) => s.tasks.find((x) => x.id === params?.id))
  const mcpServers = useStore((s) => s.mcpServers)
  const push = useStore((s) => s.push)
  const runTaskNow = useStore((s) => s.runTaskNow)
  const togglePause = useStore((s) => s.togglePauseTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const askConfirm = useStore((s) => s.askConfirm)
  const toast = useStore((s) => s.toast)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  if (!task) {
    return (
      <Page title="" onBack={onBack} largeTitle={false}>
        <EmptyState icon={<CalendarClock size={28} />} title={t('common.empty')} />
      </Page>
    )
  }

  // paused tasks can still be run manually (one-off); only block while already running
  const canRun = task.status !== 'running'
  const linkedMcp = (task.mcpServerNames ?? [])
    .map((name) => mcpServers.find((m) => m.name === name))
    .filter((m): m is McpServer => !!m)

  return (
    <>
      <Page
        title={task.name}
        onBack={onBack}
        largeTitle={false}
        bg="group"
        right={
          <IconButton onClick={() => setMenuOpen(true)} ariaLabel="more">
            <MoreHorizontal size={22} />
          </IconButton>
        }
      >
        {/* overview */}
        <Section title={t('tasks.detail.overview')} className="mt-2">
          <Row title={t('tasks.detail.status')} right={<TaskStatusPill status={task.status} />} />
          <Row title={t('tasks.detail.schedule')} value={scheduleHuman(task.schedule, lang)} />
          <Row title={t('tasks.lastRun')} value={task.lastRunAt ? formatRelative(task.lastRunAt, lang) : t('tasks.never')} />
          <Row title={t('tasks.nextRun')} value={task.paused || !task.nextRunAt ? '—' : formatRelative(task.nextRunAt, lang)} />
        </Section>

        {/* required MCP servers */}
        <div className="px-4 mt-5">
          <div className="px-3 pb-1.5 text-[13px] font-medium text-label-secondary uppercase tracking-wide">
            {t('tasks.detail.mcp')}
          </div>
          {linkedMcp.length === 0 ? (
            <div className="card px-4 py-3 text-[14px] text-label-secondary">{t('tasks.detail.mcpNone')}</div>
          ) : (
            <div className="list-group divide-y divide-divider">
              {linkedMcp.map((m) => (
                <button
                  key={m.id}
                  onClick={() => push('mcpDetail', { id: m.id })}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-black/[0.03]"
                >
                  <ServerLogo logo={m.logo} gradient={m.gradient} name={m.letter || m.name} size={30} />
                  <span className="flex-1 text-[15px] font-medium truncate">{m.name}</span>
                  <Pill color={m.enabled ? 'green' : 'gray'}>
                    {m.enabled ? t('mcp.connected.short') : t('mcp.notConnected')}
                  </Pill>
                  <ChevronRight size={16} className="text-ios-gray3 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* instruction */}
        <div className="px-4 mt-5">
          <div className="px-3 pb-1.5 text-[13px] font-medium text-label-secondary uppercase tracking-wide">
            {t('tasks.detail.instruction')}
          </div>
          <div className="card px-4 py-3.5 text-[15px] leading-relaxed whitespace-pre-wrap">{task.instruction}</div>
        </div>

        {/* run records */}
        <div className="px-4 mt-5">
          <div className="px-3 pb-1.5 text-[13px] font-medium text-label-secondary uppercase tracking-wide">
            {t('tasks.detail.runs')}
          </div>
          {task.runs.length === 0 ? (
            <div className="card px-4 py-6 text-center text-[14px] text-label-secondary">{t('tasks.detail.noRuns')}</div>
          ) : (
            <div className="list-group">
              {task.runs.map((r, i) => (
                <RunRecordRow key={r.id} run={r} last={i === task.runs.length - 1} />
              ))}
            </div>
          )}
        </div>

        <div className="h-[96px]" /> {/* clear the bottom action bar */}

        <ActionSheet
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          cancelLabel={t('common.cancel')}
          actions={[
            { label: t('common.edit'), onClick: () => setEditOpen(true) },
            {
              label: t('common.delete'),
              destructive: true,
              onClick: () =>
                askConfirm({
                  title: t('tasks.deleteConfirm'),
                  message: t('tasks.deleteBody'),
                  confirmText: t('common.delete'),
                  danger: true,
                  onConfirm: () => {
                    deleteTask(task.id)
                    toast(t('tasks.deleted'))
                    onBack()
                  },
                }),
            },
          ]}
        />

        <TaskEditSheet open={editOpen} onClose={() => setEditOpen(false)} taskId={task.id} />
      </Page>

      {/* pinned bottom action bar — pause/resume primary, run-now secondary, equal width */}
      <div className="absolute bottom-0 left-0 right-0 z-40 glass hairline-t px-4 pt-2.5 pb-[26px] flex gap-2.5">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={!canRun}
          onClick={() => {
            runTaskNow(task.id)
            toast(t('tasks.ranNow'))
          }}
        >
          <Play size={17} />
          {t('tasks.runNow')}
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            togglePause(task.id)
            toast(task.paused ? t('tasks.resumed') : t('tasks.paused'))
          }}
        >
          {task.paused ? <Play size={17} /> : <Pause size={17} />}
          {task.paused ? t('tasks.resume') : t('tasks.pause')}
        </Button>
      </div>
    </>
  )
}

function buildSchedule(kind: ScheduleKind, time: string, weekdays: number[], minutes: number): Schedule {
  if (kind === 'interval') {
    const isHour = minutes % 60 === 0 && minutes >= 60
    const n = isHour ? minutes / 60 : minutes
    return {
      kind: 'interval',
      intervalMinutes: minutes,
      humanZh: isHour ? `每 ${n} 小时` : `每 ${n} 分钟`,
      humanEn: isHour ? `Every ${n} hour${n > 1 ? 's' : ''}` : `Every ${n} minute${n > 1 ? 's' : ''}`,
    }
  }
  if (kind === 'weekly') {
    const days = (weekdays.length ? weekdays : [1]).slice().sort((a, b) => a - b)
    const zhDays = days.map((d) => WEEKDAYS_ZH[d].replace('周', '')).join('、')
    const enDays = days.map((d) => WEEKDAYS_EN[d]).join(', ')
    return {
      kind: 'weekly',
      weekday: days[0], // back-compat single weekday
      weekdays: days,
      timeOfDay: time,
      humanZh: `每周${zhDays} ${time}`,
      humanEn: `Every ${enDays} at ${time}`,
    }
  }
  return {
    kind: 'daily',
    timeOfDay: time,
    humanZh: `每天 ${time}`,
    humanEn: `Every day at ${time}`,
  }
}

function TaskEditSheet({ open, onClose, taskId }: { open: boolean; onClose: () => void; taskId: string }) {
  const t = useT()
  const lang = useLang()
  const task = useStore((s) => s.tasks.find((x) => x.id === taskId))
  const saveTaskEdit = useStore((s) => s.saveTaskEdit)
  const toast = useStore((s) => s.toast)

  const initWeekdays = (s?: Schedule): number[] => {
    if (s?.weekdays?.length) return s.weekdays.slice().sort((a, b) => a - b)
    if (s?.weekday != null) return [s.weekday]
    return [1]
  }

  const [name, setName] = useState(task?.name ?? '')
  const [instruction, setInstruction] = useState(task?.instruction ?? '')
  const [kind, setKind] = useState<ScheduleKind>(task?.schedule.kind ?? 'daily')
  const [time, setTime] = useState(task?.schedule.timeOfDay ?? '09:00')
  const [weekdays, setWeekdays] = useState<number[]>(initWeekdays(task?.schedule))
  const [minutes, setMinutes] = useState(task?.schedule.intervalMinutes ?? 30)

  // re-sync when opening for a (possibly) different task
  const [boundId, setBoundId] = useState(taskId)
  if (open && boundId !== taskId && task) {
    setBoundId(taskId)
    setName(task.name)
    setInstruction(task.instruction)
    setKind(task.schedule.kind)
    setTime(task.schedule.timeOfDay ?? '09:00')
    setWeekdays(initWeekdays(task.schedule))
    setMinutes(task.schedule.intervalMinutes ?? 30)
  }

  const kinds: ScheduleKind[] = ['daily', 'weekly', 'interval']
  const weekdayLabels = lang === 'zh' ? WEEKDAYS_ZH : WEEKDAYS_EN

  const toggleWeekday = (i: number) => {
    setWeekdays((prev) => {
      if (prev.includes(i)) return prev.length === 1 ? prev : prev.filter((d) => d !== i)
      return [...prev, i].sort((a, b) => a - b)
    })
  }

  // dirty-gate: Save only enabled once something actually changed
  const sortedWeekdays = weekdays.slice().sort((a, b) => a - b)
  const dirty =
    !!task &&
    (name.trim() !== task.name ||
      instruction.trim() !== task.instruction ||
      kind !== task.schedule.kind ||
      (kind !== 'interval' && time !== (task.schedule.timeOfDay ?? '09:00')) ||
      (kind === 'interval' && Math.max(1, minutes) !== (task.schedule.intervalMinutes ?? 30)) ||
      (kind === 'weekly' && JSON.stringify(sortedWeekdays) !== JSON.stringify(initWeekdays(task.schedule))))

  const save = () => {
    if (!dirty) return
    const schedule = buildSchedule(kind === 'once' ? 'daily' : kind, time, sortedWeekdays, Math.max(1, minutes))
    saveTaskEdit(taskId, { name: name.trim() || task!.name, instruction: instruction.trim(), schedule })
    toast(t('tasks.edit.saved'), 'success')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('tasks.edit.title')}
      footer={
        <div className="flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button className="flex-1" disabled={!dirty} onClick={save}>
            {t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="px-4 space-y-4 pt-1">
        <Field label={t('tasks.edit.name')}>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent text-[16px] outline-none" />
        </Field>
        <Field label={t('tasks.edit.instruction')}>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={8}
            className="w-full bg-transparent text-[15px] leading-relaxed outline-none resize-none"
          />
        </Field>

        <div>
          <div className="px-1 pb-1.5 text-[13px] font-medium text-label-secondary">{t('tasks.edit.trigger')}</div>
          <div className="flex gap-1.5">
            {kinds.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn(
                  'flex-1 h-9 rounded-[9px] text-[13px] font-medium',
                  kind === k ? 'bg-ios-blue text-white' : 'bg-ios-gray6 text-label-primary',
                )}
              >
                {t(KIND_LABEL[k])}
              </button>
            ))}
          </div>

          {kind === 'weekly' && (
            <div className="flex gap-1 mt-2.5">
              {weekdayLabels.map((w, i) => (
                <button
                  key={i}
                  onClick={() => toggleWeekday(i)}
                  className={cn(
                    'flex-1 h-9 rounded-[8px] text-[12px] font-medium transition-colors',
                    weekdays.includes(i) ? 'bg-brand-violet text-white' : 'bg-ios-gray6 text-label-secondary',
                  )}
                >
                  {w.replace('周', '')}
                </button>
              ))}
            </div>
          )}

          {kind === 'interval' ? (
            <div className="flex items-center gap-2 mt-2.5">
              <input
                type="number"
                value={minutes}
                min={1}
                onChange={(e) => setMinutes(+e.target.value)}
                className="w-24 h-10 px-3 rounded-ios bg-ios-gray6 text-[15px] outline-none"
              />
              <span className="text-[14px] text-label-secondary">{t('tasks.edit.intervalMinutes')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2.5">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-10 px-3 rounded-ios bg-ios-gray6 text-[15px] outline-none"
              />
              <span className="text-[14px] text-label-secondary">{t('tasks.edit.time')}</span>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-1 pb-1.5 text-[13px] font-medium text-label-secondary">{label}</div>
      <div className="bg-surface rounded-ios-lg px-3.5 py-3 border border-divider">{children}</div>
    </div>
  )
}
