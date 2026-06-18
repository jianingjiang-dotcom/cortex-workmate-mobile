import { useState } from 'react'
import { Bell, CalendarClock, Check, ChevronRight, Filter, ShieldCheck } from 'lucide-react'
import type { AppNotification, NotificationType, OverlayScreenProps } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useLang, useT } from '../../i18n'
import { Page } from '../../components/Page'
import { Button, EmptyState, IconButton, ServerLogo } from '../../components/ui/atoms'
import { Sheet } from '../../components/ui/Sheet'
import { dayBucket, formatDateShort, formatNotifTime } from '../../lib/time'
import { cn } from '../../lib/util'

const ALL_TYPES: NotificationType[] = ['task_status', 'approval', 'mcp_connect']

type PillColor = 'gray' | 'blue' | 'green' | 'red' | 'orange'

// Status pill is DERIVED live from the notification's status fields (and, for a
// connection request, the server's live enabled state). It is the only thing that
// changes when a status changes — the structured title stays stable.
function NotifStatusPill({ n }: { n: AppNotification }) {
  const t = useT()
  // subscribe to the related server so the pill flips to 已连接 the moment it connects
  const serverEnabled = useStore((s) =>
    n.type === 'mcp_connect' ? !!s.mcpServers.find((m) => m.id === n.relatedServerId)?.enabled : false,
  )

  let color: PillColor = 'gray'
  let key = 'notif.st.created'
  if (n.type === 'task_status') {
    const map: Record<string, [PillColor, string]> = {
      completed: ['green', 'notif.st.completed'],
      failed: ['red', 'notif.st.failed'],
      created: ['blue', 'notif.st.created'],
      started: ['blue', 'notif.st.started'],
    }
    ;[color, key] = map[n.taskStatusKind ?? 'created'] ?? map.created
  } else if (n.type === 'approval') {
    const map: Record<string, [PillColor, string]> = {
      pending: ['orange', 'notif.st.pending'],
      approved: ['green', 'notif.st.approved'],
      rejected: ['red', 'notif.st.rejected'],
    }
    ;[color, key] = map[n.approvalStatus ?? 'pending'] ?? map.pending
  } else {
    // mcp_connect
    color = serverEnabled ? 'green' : 'orange'
    key = serverEnabled ? 'notif.st.connected' : 'notif.st.toConnect'
  }
  const COLORS: Record<PillColor, string | null> = { gray: null, blue: '#407CFF', green: 'var(--green)', red: 'var(--red)', orange: 'var(--orange)' }
  const c = COLORS[color]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-medium',
        c ? 'text-label-primary' : 'bg-black/[0.06] dark:bg-white/[0.12] text-label-secondary',
      )}
      style={c ? { backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)` } : undefined}
    >
      {c && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} />}
      {t(key)}
    </span>
  )
}

// Category icon tile — fixed per type (structure cue, independent of status).
function NotifIcon({ n }: { n: AppNotification }) {
  const server = useStore((s) =>
    n.type === 'mcp_connect' ? s.mcpServers.find((m) => m.id === n.relatedServerId) : undefined,
  )
  if (n.type === 'mcp_connect') {
    return <ServerLogo logo={server?.logo} gradient={server?.gradient} name={server?.letter || server?.name} size={36} />
  }
  if (n.type === 'approval') {
    return (
      <div className="w-9 h-9 rounded-[10px] bg-ios-gray6 flex items-center justify-center shrink-0">
        <ShieldCheck size={20} className="text-label-secondary" />
      </div>
    )
  }
  return (
    <div className="w-9 h-9 rounded-[10px] bg-ios-gray6 flex items-center justify-center shrink-0">
      <CalendarClock size={20} className="text-label-secondary" />
    </div>
  )
}

export function NotificationsScreen({ onBack }: OverlayScreenProps) {
  const t = useT()
  const lang = useLang()
  const notifications = useStore((s) => s.notifications)
  const tasks = useStore((s) => s.tasks)
  const markAllRead = useStore((s) => s.markAllRead)
  const markRead = useStore((s) => s.markNotificationRead)
  const push = useStore((s) => s.push)
  const setTab = useStore((s) => s.setTab)
  const setChatMode = useStore((s) => s.setChatMode)
  const setJumpTo = useStore((s) => s.setJumpTo)
  const popAll = useStore((s) => s.popAllOverlays)
  const askConfirm = useStore((s) => s.askConfirm)
  const toast = useStore((s) => s.toast)

  const [filterOpen, setFilterOpen] = useState(false)
  const [selected, setSelected] = useState<Set<NotificationType>>(() => new Set(ALL_TYPES))
  const filtering = selected.size < ALL_TYPES.length

  const unread = notifications.filter((n) => !n.read).length
  const sorted = [...notifications].sort((a, b) => b.createdAt - a.createdAt)
  const visible = sorted.filter((n) => selected.has(n.type))
  // Day groups (newest first): 今天 / 昨天, then one section per older calendar date.
  const groups: { key: string; label: string; items: AppNotification[] }[] = []
  for (const n of visible) {
    const b = dayBucket(n.createdAt)
    const key = b === 'earlier' ? new Date(n.createdAt).toDateString() : b
    let g = groups.find((x) => x.key === key)
    if (!g) {
      const label =
        b === 'today'
          ? t('notif.group.today')
          : b === 'yesterday'
            ? t('notif.group.yesterday')
            : formatDateShort(n.createdAt, lang)
      g = { key, label, items: [] }
      groups.push(g)
    }
    g.items.push(n)
  }

  const toggleType = (k: NotificationType) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(k) ? next.delete(k) : next.add(k)
      return next
    })

  // Each category jumps to where it's resolved/reviewed.
  const navigate = (n: AppNotification) => {
    markRead(n.id)
    if (n.type === 'task_status') {
      if (n.relatedRunId) {
        const task = tasks.find((x) => x.id === n.relatedTaskId)
        const run = task?.runs.find((r) => r.id === n.relatedRunId)
        if (run?.conversationId) return push('conversation', { id: run.conversationId })
      }
      if (n.relatedTaskId) return push('taskDetail', { id: n.relatedTaskId })
      return
    }
    // approval + mcp_connect → jump back to the in-chat card (resolve in context)
    if (n.relatedMode === 'workmate' && n.relatedMessageId) {
      setChatMode('workmate')
      setTab('chat')
      popAll()
      setJumpTo(n.relatedMessageId)
      return
    }
    if (n.relatedMode === 'normal' && n.relatedConversationId) {
      return push('conversation', { id: n.relatedConversationId })
    }
  }

  const confirmMarkAll = () =>
    askConfirm({
      title: t('notif.markAllRead.confirm'),
      message: t('notif.markAllRead.confirmBody'),
      confirmText: t('notif.markAllRead'),
      cancelText: t('common.cancel'),
      onConfirm: () => {
        markAllRead()
        toast(t('notif.allRead'))
      },
    })

  const FILTERS: { key: NotificationType; label: string; icon: React.ReactNode }[] = [
    { key: 'task_status', label: t('notif.filter.task'), icon: <CalendarClock size={18} className="text-label-secondary" /> },
    { key: 'approval', label: t('notif.filter.approval'), icon: <ShieldCheck size={18} className="text-label-secondary" /> },
    { key: 'mcp_connect', label: t('notif.filter.mcp'), icon: <Filter size={18} className="text-label-secondary" /> },
  ]

  // One notification row: title + time on line 1, status pill on line 2 (no body).
  const Row = ({ n }: { n: AppNotification }) => (
    <button
      onClick={() => navigate(n)}
      className="w-full flex items-start gap-3 px-4 py-3 text-left active:bg-black/[0.04]"
    >
      <div className="relative shrink-0">
        <NotifIcon n={n} />
        {!n.read && (
          <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-ios-blue ring-2 ring-surface" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 text-[16px] font-medium leading-snug truncate">{n.title}</div>
          <span className="text-[12px] text-label-secondary shrink-0">{formatNotifTime(n.createdAt, lang)}</span>
        </div>
        <div className="mt-1.5">
          <NotifStatusPill n={n} />
        </div>
      </div>
      <ChevronRight size={18} className="text-ios-gray2 mt-1 shrink-0" />
    </button>
  )

  return (
    <Page
      title={t('notif.title')}
      onBack={onBack}
      bg="group"
      right={
        notifications.length > 0 ? (
          <div className="flex items-center gap-0.5">
            <IconButton
              ariaLabel="filter"
              onClick={() => setFilterOpen(true)}
              className={cn(filtering && 'text-brand-violet')}
            >
              <Filter size={20} className={cn(filtering && 'fill-current')} />
              {filtering && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-violet" />}
            </IconButton>
            {unread > 0 && (
              <button onClick={confirmMarkAll} className="text-[14px] font-semibold text-label-secondary -ml-1.5 pr-1 active:opacity-50 whitespace-nowrap">
                {t('notif.markAllRead')}
              </button>
            )}
          </div>
        ) : undefined
      }
    >
      {notifications.length === 0 ? (
        <EmptyState icon={<Bell size={30} />} title={t('notif.empty')} subtitle={t('notif.emptyHint')} />
      ) : groups.length === 0 ? (
        <EmptyState icon={<Filter size={30} />} title={t('notif.filter.empty')} />
      ) : (
        <div className="pt-1 pb-10">
          {groups.map((g) => (
            <div key={g.key} className="px-4 mb-2">
              <div className="px-1 pb-1 pt-2 text-[14px] font-medium text-label-secondary">{g.label}</div>
              <div className="list-group divide-y divide-divider">
                {g.items.map((n) => (
                  <Row key={n.id} n={n} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* type filter (multi-select) */}
      <Sheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title={t('notif.filter.title')}
        footer={
          <Button full onClick={() => setFilterOpen(false)}>
            {t('notif.filter.done')}
          </Button>
        }
      >
        <div className="px-4 pb-1">
          <div className="list-group divide-y divide-divider">
            {FILTERS.map((f) => {
              const on = selected.has(f.key)
              return (
                <button
                  key={f.key}
                  onClick={() => toggleType(f.key)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-black/[0.04]"
                >
                  <div className="w-7 h-7 flex items-center justify-center shrink-0 text-label-secondary">{f.icon}</div>
                  <span className="flex-1 text-[16px] text-label-primary">{f.label}</span>
                  {on && <Check size={20} className="text-ios-blue shrink-0" strokeWidth={2.5} />}
                </button>
              )
            })}
          </div>
        </div>
      </Sheet>
    </Page>
  )
}
