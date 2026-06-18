import { useState } from 'react'
import { CalendarClock, ChevronRight, MoreHorizontal, Pause, Play, Plus, X } from 'lucide-react'
import type { McpServer, OverlayScreenProps, Schedule } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useLang, useT } from '../../i18n'
import { Page } from '../../components/Page'
import { Button, EmptyState, IconButton, Pill, Row, Section, Segmented, ServerLogo } from '../../components/ui/atoms'
import { ActionSheet, CenterModal, Sheet } from '../../components/ui/Sheet'
import { Calendar } from '../../components/ui/Calendar'
import { buildSchedule } from '../../lib/schedule'
import { formatDateShort, formatRelative, formatTimeOnly, scheduleHuman, WEEKDAYS_EN, WEEKDAYS_ZH } from '../../lib/time'
import { cn } from '../../lib/util'
import { RunRecordRow, TaskStatusPill } from './taskUi'

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
          <div className="px-3 pb-1.5 text-[14px] font-medium text-label-secondary uppercase tracking-wide">
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
                  <span className="flex-1 text-[16px] font-medium truncate">{m.name}</span>
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
          <div className="px-3 pb-1.5 text-[14px] font-medium text-label-secondary uppercase tracking-wide">
            {t('tasks.detail.instruction')}
          </div>
          <div className="card px-4 py-3.5 text-[16px] leading-relaxed whitespace-pre-wrap">{task.instruction}</div>
        </div>

        {/* run records */}
        <div className="px-4 mt-5">
          <div className="px-3 pb-1.5 text-[14px] font-medium text-label-secondary uppercase tracking-wide">
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
                    toast(t('tasks.deleted'), 'delete')
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
          onClick={() => {
            togglePause(task.id)
            toast(task.paused ? t('tasks.resumed') : t('tasks.paused'), task.paused ? 'resume' : 'pause')
          }}
        >
          {task.paused ? <Play size={17} /> : <Pause size={17} />}
          {task.paused ? t('tasks.resume') : t('tasks.pause')}
        </Button>
        <Button
          className="flex-1"
          disabled={!canRun}
          onClick={() => {
            runTaskNow(task.id)
            toast(t('tasks.ranNow'), 'run')
          }}
        >
          <Play size={17} />
          {t('tasks.runNow')}
        </Button>
      </div>
    </>
  )
}

type EditMode = 'recurring' | 'dates' | 'interval'
type IntervalUnit = 'min' | 'hour' | 'day'

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
function hhmm(ts: number): string {
  return formatTimeOnly(ts) // 'HH:MM'
}
function combine(dayEpoch: number, time: string): number {
  const [h, m] = time.split(':').map(Number)
  return startOfDay(dayEpoch) + ((h || 0) * 60 + (m || 0)) * 60 * 1000
}

function initMode(s?: Schedule): EditMode {
  if (!s) return 'recurring'
  if (s.kind === 'interval') return 'interval'
  if (s.kind === 'dates' || s.kind === 'once') return 'dates'
  return 'recurring' // daily | weekly
}
function initWeekdays(s?: Schedule): number[] {
  if (s?.kind === 'daily') return [0, 1, 2, 3, 4, 5, 6]
  if (s?.weekdays?.length) return s.weekdays.slice().sort((a, b) => a - b)
  if (s?.weekday != null) return [s.weekday]
  return [1, 3, 5]
}
function initDates(s?: Schedule): number[] {
  if (s?.kind === 'dates' && s.dates?.length) return s.dates.slice().sort((a, b) => a - b)
  if (s?.kind === 'once') return [combine(Date.now(), s.timeOfDay ?? '09:00')]
  return []
}
function minsToUnit(mins: number): { count: number; unit: IntervalUnit } {
  if (mins % 1440 === 0 && mins >= 1440) return { count: mins / 1440, unit: 'day' }
  if (mins % 60 === 0 && mins >= 60) return { count: mins / 60, unit: 'hour' }
  return { count: mins, unit: 'min' }
}
function unitToMins(count: number, unit: IntervalUnit): number {
  const c = Math.max(1, Math.floor(count))
  return unit === 'day' ? c * 1440 : unit === 'hour' ? c * 60 : c
}

function TaskEditSheet({ open, onClose, taskId }: { open: boolean; onClose: () => void; taskId: string }) {
  const t = useT()
  const lang = useLang()
  const task = useStore((s) => s.tasks.find((x) => x.id === taskId))
  const saveTaskEdit = useStore((s) => s.saveTaskEdit)
  const toast = useStore((s) => s.toast)

  const [name, setName] = useState(task?.name ?? '')
  const [instruction, setInstruction] = useState(task?.instruction ?? '')
  const [mode, setMode] = useState<EditMode>(initMode(task?.schedule))
  const [weekdays, setWeekdays] = useState<number[]>(initWeekdays(task?.schedule))
  const [time, setTime] = useState(task?.schedule.timeOfDay ?? '09:00')
  const [dates, setDates] = useState<number[]>(initDates(task?.schedule))
  const initIv = minsToUnit(task?.schedule.intervalMinutes ?? 60)
  const [count, setCount] = useState(initIv.count)
  const [unit, setUnit] = useState<IntervalUnit>(initIv.unit)
  const [startAt, setStartAt] = useState<number | undefined>(task?.schedule.startAt)
  // calendar picker target: 'add' (new date) | number (edit date entry) | 'start' (interval start)
  const [picker, setPicker] = useState<null | 'add' | 'start' | number>(null)

  // re-sync when opening for a (possibly) different task
  const [boundId, setBoundId] = useState(taskId)
  if (open && boundId !== taskId && task) {
    setBoundId(taskId)
    setName(task.name)
    setInstruction(task.instruction)
    setMode(initMode(task.schedule))
    setWeekdays(initWeekdays(task.schedule))
    setTime(task.schedule.timeOfDay ?? '09:00')
    setDates(initDates(task.schedule))
    const iv = minsToUnit(task.schedule.intervalMinutes ?? 60)
    setCount(iv.count)
    setUnit(iv.unit)
    setStartAt(task.schedule.startAt)
  }

  const weekdayLabels = lang === 'zh' ? WEEKDAYS_ZH : WEEKDAYS_EN
  const everyDay = weekdays.length === 7

  const toggleWeekday = (i: number) =>
    setWeekdays((prev) => (prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort((a, b) => a - b)))

  const onPickDay = (dayEpoch: number) => {
    if (picker === 'add') {
      const tod = dates.length ? hhmm(dates[dates.length - 1]) : '09:00'
      setDates((prev) => [...prev, combine(dayEpoch, tod)].sort((a, b) => a - b))
    } else if (picker === 'start') {
      setStartAt(combine(dayEpoch, startAt != null ? hhmm(startAt) : '09:00'))
    } else if (typeof picker === 'number') {
      const idx = picker
      setDates((prev) => prev.map((d, i) => (i === idx ? combine(dayEpoch, hhmm(d)) : d)).sort((a, b) => a - b))
    }
    setPicker(null)
  }
  const setDateTime = (idx: number, tod: string) =>
    setDates((prev) => prev.map((d, i) => (i === idx ? combine(d, tod) : d)).sort((a, b) => a - b))
  const removeDate = (idx: number) => setDates((prev) => prev.filter((_, i) => i !== idx))

  const buildCurrent = (): Schedule =>
    mode === 'recurring'
      ? buildSchedule({ mode: 'recurring', time, weekdays })
      : mode === 'dates'
        ? buildSchedule({ mode: 'dates', dates })
        : buildSchedule({ mode: 'interval', intervalMinutes: unitToMins(count, unit), startAt })

  const valid = mode === 'recurring' ? weekdays.length >= 1 : mode === 'dates' ? dates.length >= 1 : count >= 1

  const built = task ? buildCurrent() : null
  const scheduleChanged =
    !!task &&
    !!built &&
    (built.kind !== task.schedule.kind ||
      built.timeOfDay !== task.schedule.timeOfDay ||
      (built.intervalMinutes ?? 0) !== (task.schedule.intervalMinutes ?? 0) ||
      (built.startAt ?? -1) !== (task.schedule.startAt ?? -1) ||
      JSON.stringify(built.weekdays ?? []) !== JSON.stringify(task.schedule.weekdays ?? []) ||
      JSON.stringify(built.dates ?? []) !== JSON.stringify(task.schedule.dates ?? []))
  const dirty =
    !!task && (name.trim() !== task.name || instruction.trim() !== task.instruction || scheduleChanged)

  const save = () => {
    if (!dirty || !valid) return
    saveTaskEdit(taskId, { name: name.trim() || task!.name, instruction: instruction.trim(), schedule: buildCurrent() })
    toast(t('tasks.edit.saved'), 'neutral')
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
          <Button className="flex-1" disabled={!dirty || !valid} onClick={save}>
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
            rows={6}
            className="w-full bg-transparent text-[16px] leading-relaxed outline-none resize-none"
          />
        </Field>

        <div>
          <div className="px-1 pb-1.5 text-[14px] font-medium text-label-secondary">{t('tasks.edit.trigger')}</div>
          <Segmented
            layoutId="task-edit-mode"
            options={[
              { value: 'recurring', label: t('tasks.edit.mode.recurring') },
              { value: 'dates', label: t('tasks.edit.mode.dates') },
              { value: 'interval', label: t('tasks.edit.mode.interval') },
            ]}
            value={mode}
            onChange={(v) => setMode(v)}
          />

          {/* Mode ①: recurring weekday rule (incl. every day) */}
          {mode === 'recurring' && (
            <div className="mt-3 space-y-2.5">
              <div className="flex gap-1">
                <button
                  onClick={() => setWeekdays([0, 1, 2, 3, 4, 5, 6])}
                  className={cn(
                    'px-3 h-9 rounded-[8px] text-[12px] font-medium shrink-0',
                    everyDay ? 'bg-brand-violet text-white' : 'bg-ios-gray6 text-label-secondary',
                  )}
                >
                  {t('tasks.edit.everyDayShortcut')}
                </button>
                {weekdayLabels.map((w, i) => (
                  <button
                    key={i}
                    onClick={() => toggleWeekday(i)}
                    className={cn(
                      'flex-1 h-9 rounded-[8px] text-[12px] font-medium transition-colors',
                      !everyDay && weekdays.includes(i) ? 'bg-brand-violet text-white' : 'bg-ios-gray6 text-label-secondary',
                    )}
                  >
                    {w.replace('周', '')}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-label-secondary shrink-0 min-w-[48px]">{t('tasks.edit.time')}</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-9 px-3 rounded-ios bg-surface border border-input text-[16px] outline-none"
                />
              </div>
            </div>
          )}

          {/* Mode ②: one or more specific date+time entries */}
          {mode === 'dates' && (
            <div className="mt-3 space-y-2">
              {dates.length === 0 ? (
                <div className="text-[14px] text-label-tertiary py-3 text-center">{t('tasks.edit.dates.empty')}</div>
              ) : (
                <div className="space-y-1.5">
                  {dates.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        onClick={() => setPicker(i)}
                        className="flex-1 h-9 px-3 rounded-ios bg-surface border border-input text-[16px] text-left active:opacity-60"
                      >
                        {formatDateShort(d, lang)}
                      </button>
                      <input
                        type="time"
                        value={hhmm(d)}
                        onChange={(e) => setDateTime(i, e.target.value)}
                        className="h-9 px-2.5 rounded-ios bg-surface border border-input text-[16px] outline-none"
                      />
                      <button
                        onClick={() => removeDate(i)}
                        aria-label="remove"
                        className="w-9 h-9 flex items-center justify-center rounded-full text-label-tertiary active:bg-ios-gray6 shrink-0"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setPicker('add')}
                className="flex items-center gap-1.5 h-9 px-3 text-[16px] font-medium text-ios-blue active:opacity-60"
              >
                <Plus size={18} /> {t('tasks.edit.addDate')}
              </button>
            </div>
          )}

          {/* Mode ③: interval + start time */}
          {mode === 'interval' && (
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-label-secondary shrink-0 min-w-[48px]">{t('tasks.edit.intervalEvery')}</span>
                <input
                  type="number"
                  value={count}
                  min={1}
                  onChange={(e) => setCount(Math.max(1, Math.floor(+e.target.value || 1)))}
                  className="w-16 h-9 px-3 rounded-ios bg-surface border border-input text-[16px] outline-none"
                />
                <div className="flex-1">
                  <Segmented
                    layoutId="task-iv-unit"
                    options={[
                      { value: 'min', label: t('tasks.edit.unit.min') },
                      { value: 'hour', label: t('tasks.edit.unit.hour') },
                      { value: 'day', label: t('tasks.edit.unit.day') },
                    ]}
                    value={unit}
                    onChange={(v) => setUnit(v)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-label-secondary shrink-0 min-w-[48px]">{t('tasks.edit.startTime')}</span>
                <button
                  onClick={() => setPicker('start')}
                  className="flex-1 h-9 px-3 rounded-ios bg-surface border border-input text-[16px] text-left active:opacity-60"
                >
                  {startAt != null ? formatDateShort(startAt, lang) : t('tasks.edit.startNow')}
                </button>
                {startAt != null && (
                  <>
                    <input
                      type="time"
                      value={hhmm(startAt)}
                      onChange={(e) => setStartAt(combine(startAt, e.target.value))}
                      className="h-9 px-2.5 rounded-ios bg-surface border border-input text-[16px] outline-none"
                    />
                    <button
                      onClick={() => setStartAt(undefined)}
                      aria-label="clear"
                      className="w-9 h-9 flex items-center justify-center rounded-full text-label-tertiary active:bg-ios-gray6 shrink-0"
                    >
                      <X size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <CenterModal open={picker !== null} onClose={() => setPicker(null)}>
        <Calendar
          min={startOfDay(Date.now())}
          value={typeof picker === 'number' ? dates[picker] : picker === 'start' ? startAt : undefined}
          onSelect={onPickDay}
        />
      </CenterModal>
    </Sheet>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-1 pb-1.5 text-[14px] font-medium text-label-secondary">{label}</div>
      <div className="bg-surface rounded-ios-lg px-3.5 py-3 border border-divider">{children}</div>
    </div>
  )
}
