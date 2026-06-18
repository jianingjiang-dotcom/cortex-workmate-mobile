import { useState } from 'react'
import { Bell, CalendarClock, ChevronRight, Mic, ShieldCheck } from 'lucide-react'
import type { AppNotification, NotificationType, OverlayScreenProps } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useLang, useT } from '../../i18n'
import { Page } from '../../components/Page'
import { Avatar, EmptyState, ServerLogo } from '../../components/ui/atoms'
import { dayBucket, formatDateShort, formatNotifTime } from '../../lib/time'
import { cn } from '../../lib/util'

// Top-level categories (the tab bar). Each maps to one or more notification types.
type TabKey = 'tasks' | 'meetings' | 'auth' | 'contacts'
const TAB_TYPES: Record<TabKey, NotificationType[]> = {
  tasks: ['task_status'],
  meetings: ['meeting'],
  auth: ['approval', 'mcp_connect'],
  contacts: ['contact_request'],
}
const TAB_ORDER: TabKey[] = ['tasks', 'meetings', 'auth', 'contacts']

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
  } else if (n.type === 'meeting') {
    ;[color, key] =
      n.meetingStatusKind === 'failed' ? ['red', 'notif.st.meetingFailed'] : ['green', 'notif.st.meetingReady']
  } else if (n.type === 'contact_request') {
    const map: Record<string, [PillColor, string]> = {
      pending: ['orange', 'notif.st.cReqPending'],
      approved: ['green', 'notif.st.cReqAccepted'],
      rejected: ['red', 'notif.st.cReqRejected'],
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
        'inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium',
        !c && 'bg-black/[0.06] dark:bg-white/[0.12] text-label-secondary',
      )}
      style={c ? { color: c, backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)` } : undefined}
    >
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
  if (n.type === 'contact_request') {
    return <Avatar gradient={n.requesterGradient} name={n.requesterName} size={36} shape="circle" />
  }
  const Icon = n.type === 'approval' ? ShieldCheck : n.type === 'meeting' ? Mic : CalendarClock
  return (
    <div className="w-9 h-9 rounded-[10px] bg-ios-gray6 flex items-center justify-center shrink-0">
      <Icon size={20} className="text-label-secondary" />
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

  const [activeTab, setActiveTab] = useState<TabKey>('tasks')

  const unread = notifications.filter((n) => !n.read).length
  // unread badge per tab
  const unreadByTab = (k: TabKey) =>
    notifications.filter((n) => !n.read && TAB_TYPES[k].includes(n.type)).length

  const sorted = [...notifications].sort((a, b) => b.createdAt - a.createdAt)
  const visible = sorted.filter((n) => TAB_TYPES[activeTab].includes(n.type))
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
    if (n.type === 'meeting') {
      if (n.relatedMeetingId) return push('meetingDetail', { id: n.relatedMeetingId })
      return
    }
    if (n.type === 'contact_request') {
      // resolved inline (accept/decline lives on the card); nothing to navigate to
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
        toast(t('notif.allRead'), 'readAll')
      },
    })

  const TAB_LABEL: Record<TabKey, string> = {
    tasks: t('notif.tab.tasks'),
    meetings: t('notif.tab.meetings'),
    auth: t('notif.tab.auth'),
    contacts: t('notif.tab.contacts'),
  }

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
          <div className="flex-1 min-w-0 text-[15px] font-medium leading-snug truncate">{n.title}</div>
          <span className="text-[12px] text-label-secondary shrink-0">{formatNotifTime(n.createdAt, lang)}</span>
        </div>
        <div className="mt-0.5">
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
        unread > 0 ? (
          <button onClick={confirmMarkAll} className="text-[14px] font-semibold text-label-secondary px-1 active:opacity-50 whitespace-nowrap">
            {t('notif.markAllRead')}
          </button>
        ) : undefined
      }
    >
      {/* category tabs */}
      <div className="sticky top-0 z-10 bg-grouped">
        <div className="flex items-center gap-6 px-4 overflow-x-auto no-scrollbar hairline-b">
          {TAB_ORDER.map((key) => {
            const active = key === activeTab
            const count = unreadByTab(key)
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className="relative shrink-0 flex items-center gap-1.5 py-3"
              >
                <span
                  className={cn(
                    'text-[15px] transition-colors',
                    active ? 'text-brand-primary font-semibold' : 'text-label-secondary font-medium',
                  )}
                >
                  {TAB_LABEL[key]}
                </span>
                {count > 0 && (
                  <span
                    className={cn(
                      'min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold flex items-center justify-center',
                      active ? 'bg-brand-primary text-white' : 'bg-black/[0.06] dark:bg-white/[0.12] text-label-secondary',
                    )}
                  >
                    {count}
                  </span>
                )}
                {active && (
                  <span className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full bg-brand-primary" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex items-center justify-center" style={{ minHeight: 600 }}>
          <EmptyState icon={<Bell size={30} />} title={t('notif.empty')} subtitle={t('notif.emptyHint')} />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex items-center justify-center" style={{ minHeight: 600 }}>
          <EmptyState icon={<Bell size={30} />} title={t('notif.tab.empty')} subtitle={t('notif.tab.emptyHint')} />
        </div>
      ) : (
        <div className="pt-2 pb-10">
          {groups.map((g) => (
            <div key={g.key} className="px-4 mb-2">
              <div className="px-1 pb-1 pt-1 text-[13px] font-medium text-label-secondary">{g.label}</div>
              <div className="list-group divide-y divide-divider">
                {g.items.map((n) => (
                  <Row key={n.id} n={n} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  )
}
