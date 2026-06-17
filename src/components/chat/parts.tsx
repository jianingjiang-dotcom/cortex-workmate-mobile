import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Bookmark,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Wrench,
  X,
  XCircle,
} from 'lucide-react'
import type { AppNotification, Message, ToolCallCard } from '../../lib/types'
import { cn } from '../../lib/util'
import { formatRelative, scheduleHuman } from '../../lib/time'
import { useStore, type MessageTarget } from '../../store/useStore'
import { useLang, useT } from '../../i18n'
import { continueAfterMcpConnect, resolveApprovalFlow } from '../../lib/engine'
import { useMcpConnect } from '../../lib/useMcpConnect'
import { Sheet } from '../ui/Sheet'
import { ServerLogo, Spinner } from '../ui/atoms'

// ---- Markdown --------------------------------------------------------------

export function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}

// ---- Vendor badge ----------------------------------------------------------

const VENDOR_COLOR: Record<string, string> = {
  Anthropic: '#D97757',
  OpenAI: '#10A37F',
  Google: '#4285F4',
  DeepSeek: '#4D6BFE',
}

export function VendorBadge({ vendor, size = 28 }: { vendor: string; size?: number }) {
  return (
    <div
      className="rounded-[8px] flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: VENDOR_COLOR[vendor] || '#8E8E93', fontSize: size * 0.5 }}
    >
      {vendor.charAt(0)}
    </div>
  )
}

// Recognizable, brand-colored SVG marks for each model vendor.
const VENDOR_MARK: Record<string, (s: number) => JSX.Element> = {
  Anthropic: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24">
      <g fill="#CC785C">
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x="11.1" y="2.6" width="1.8" height="6.4" rx="0.9" transform={`rotate(${i * 30} 12 12)`} />
        ))}
      </g>
    </svg>
  ),
  OpenAI: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24">
      <g fill="none" stroke="#0A0A0A" strokeWidth="2.1">
        {[0, 60, 120].map((a) => (
          <ellipse key={a} cx="12" cy="12" rx="9" ry="3.4" transform={`rotate(${a} 12 12)`} />
        ))}
      </g>
    </svg>
  ),
  Google: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24">
      <defs>
        <linearGradient id="gemini-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="55%" stopColor="#9168F0" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.6c0 5.7 4.7 10.4 10.4 10.4-5.7 0-10.4 4.7-10.4 10.4 0-5.7-4.7-10.4-10.4-10.4C7.3 12 12 7.3 12 1.6Z"
        fill="url(#gemini-mark)"
      />
    </svg>
  ),
  DeepSeek: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24">
      <path
        fill="#4D6BFE"
        d="M3.6 12.6c0-3.6 3-6.2 6.9-6.2 3.2 0 5.9 1.8 6.9 4.5.9-.2 1.7-.7 2.3-1.5.3-.4.9-.1.8.4-.2 1.2-.9 2.2-1.9 2.9.4 2.7-1.3 5.1-4 5.8.6-.8 1-1.8 1-2.9 0-.3-.5-.4-.7-.2-1.3 1.6-3.3 2.5-5.4 2.3-3.3-.3-5.9-2.4-5.9-5.1Z"
      />
      <circle cx="9.4" cy="11.4" r="1.15" fill="#fff" />
    </svg>
  ),
}

export function VendorLogo({ vendor, size = 32 }: { vendor: string; size?: number }) {
  const mark = VENDOR_MARK[vendor]
  return (
    <div
      className="rounded-[8px] bg-surface border border-divider flex items-center justify-center shrink-0 overflow-hidden"
      style={{ width: size, height: size }}
    >
      {mark ? (
        mark(Math.round(size * 0.64))
      ) : (
        <span className="font-bold text-label-secondary" style={{ fontSize: size * 0.45 }}>
          {vendor.charAt(0)}
        </span>
      )}
    </div>
  )
}

// ---- Thinking block --------------------------------------------------------

export function ThinkingBlock({ thinking, active }: { thinking: string; active: boolean }) {
  const t = useT()
  const [open, setOpen] = useState(active)
  useEffect(() => {
    if (active) setOpen(true)
  }, [active])
  return (
    <div className="mb-2">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-[13px] text-label-secondary active:opacity-60">
        <Sparkles size={14} className="text-label-tertiary" />
        <span>{active ? t('chat.thinking') : t('chat.thought')}</span>
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 pl-3 border-l-2 border-ios-gray4 text-[13px] leading-relaxed text-label-secondary">
              {thinking}
              {active && <span className="inline-block w-1 h-3 ml-0.5 bg-brand-violet/60 align-middle animate-pulse" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---- Tool call card --------------------------------------------------------

// JS-object-literal formatter for the params block (keys unquoted, strings single-quoted)
function jsKey(k: string) {
  return /^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`
}
function formatJsLike(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent)
  const pad1 = '  '.repeat(indent + 1)
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return '[\n' + value.map((v) => pad1 + formatJsLike(v, indent + 1)).join(',\n') + '\n' + pad + ']'
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    return (
      '{\n' +
      entries.map(([k, v]) => pad1 + jsKey(k) + ': ' + formatJsLike(v, indent + 1)).join(',\n') +
      '\n' +
      pad +
      '}'
    )
  }
  if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`
  return String(value)
}

// light syntax highlight: strings → green, booleans/null/numbers → orange
function highlightCode(code: string): (string | JSX.Element)[] {
  const re = /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g
  const out: (string | JSX.Element)[] = []
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index))
    if (m[1]) out.push(<span key={key++} className="text-ios-green">{m[1]}</span>)
    else out.push(<span key={key++} className="text-ios-orange">{m[2] ?? m[3]}</span>)
    last = re.lastIndex
  }
  if (last < code.length) out.push(code.slice(last))
  return out
}

function CodeBlock({ code, clampable, tone }: { code: string; clampable?: boolean; tone?: 'error' }) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const long = !!clampable && code.split('\n').length > 9
  const isError = tone === 'error'
  return (
    <div>
      <div className="relative">
        <pre
          className={cn(
            'text-[12px] font-mono leading-relaxed rounded-ios p-3 whitespace-pre-wrap break-words',
            isError ? 'bg-ios-red/[0.06] text-ios-red' : 'bg-ios-gray6 text-label-primary',
            long && !expanded && 'max-h-[180px] overflow-hidden',
          )}
        >
          <code>{isError ? code : highlightCode(code)}</code>
        </pre>
        {long && !expanded && (
          <div className="absolute left-0 right-0 bottom-0 h-9 rounded-b-ios bg-gradient-to-t from-ios-gray6 to-transparent pointer-events-none" />
        )}
      </div>
      {long && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-1.5 text-[12px] font-medium text-ios-blue flex items-center gap-1 active:opacity-60"
        >
          {expanded ? t('chat.toolcall.showLess') : t('chat.toolcall.showMore')}
          <ChevronDown size={13} className={cn('transition-transform', expanded && 'rotate-180')} />
        </button>
      )}
    </div>
  )
}

// Tool-call parameters as clean key–value rows (the chat-AI norm) instead of a raw
// JS/JSON dump. Falls back to the code block when a value is nested (object/array).
function ParamRows({ params }: { params: Record<string, unknown> }) {
  const entries = Object.entries(params)
  const complex = entries.some(([, v]) => v !== null && typeof v === 'object')
  if (complex) return <CodeBlock code={formatJsLike(params)} />
  return (
    <div className="rounded-ios bg-ios-gray6 divide-y divide-divider overflow-hidden">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-baseline gap-3 px-3 py-2">
          <span className="text-[12px] text-label-secondary shrink-0">{k}</span>
          <span className="flex-1 text-[12.5px] font-mono text-label-primary text-right break-all">
            {String(v)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ToolCallCardView({ card }: { card: ToolCallCard }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const awaiting = card.status === 'awaiting_approval'

  const statusIcon =
    card.status === 'running' ? (
      <Spinner size={15} className="text-ios-blue" />
    ) : card.status === 'success' ? (
      <CheckCircle2 size={17} className="text-ios-green" />
    ) : card.status === 'error' ? (
      <XCircle size={17} className="text-ios-red" />
    ) : (
      // Needs-you signal: orange status pill (dot + neutral label) — color via status,
      // not chrome, so the card stays neutral and the purple Approve stays the one accent.
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-medium text-label-primary shrink-0"
        style={{ backgroundColor: 'color-mix(in srgb, var(--orange) 16%, transparent)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--orange)' }} />
        {t('chat.toolcall.needsYou')}
      </span>
    )

  return (
    <div className="my-2 rounded-ios-lg border border-divider bg-surface overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left active:bg-black/[0.02]"
      >
        <div className="w-7 h-7 rounded-[8px] bg-ios-gray6 flex items-center justify-center text-label-secondary shrink-0">
          <Wrench size={15} />
        </div>
        <span className="flex-1 min-w-0 text-[14px] font-medium truncate">{card.title}</span>
        {statusIcon}
        <ChevronDown size={16} className={cn('text-ios-gray3 transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {/* Approval is actionable at the FIRST level — always visible for an awaiting card,
          never hidden behind the expand chevron. Expanding only reveals the call's
          fn/params (technical detail). After it resolves, `awaiting` is false so this
          drops away and the result shows in the expand region (as before). */}
      {awaiting && card.approvalId && (
        <div className="px-3 pb-3 pt-2.5 border-t border-divider">
          <ApprovalById notifId={card.approvalId} />
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-2.5 space-y-3 border-t border-divider">
              {card.fn && (
                <div>
                  <div className="text-[12px] font-medium text-label-secondary mb-1.5">{t('chat.toolcall')}</div>
                  <code className="inline-block text-[12.5px] font-mono bg-ios-gray6 rounded-md px-2 py-1">{card.fn}</code>
                </div>
              )}
              {card.params && Object.keys(card.params).length > 0 && (
                <div>
                  <div className="text-[12px] font-medium text-label-secondary mb-1.5">{t('chat.toolcall.params')}</div>
                  <ParamRows params={card.params} />
                </div>
              )}
              {!awaiting && card.result && (
                <div>
                  <div className="text-[12px] font-medium text-label-secondary mb-1.5">{t('chat.toolcall.result')}</div>
                  <CodeBlock code={card.result} clampable tone={card.status === 'error' ? 'error' : undefined} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---- Approval controls (shared in-chat + notification center) --------------

export function validityHuman(n: AppNotification, t: ReturnType<typeof useT>): string {
  if (n.validity === 'custom') return t('notif.customValidity', { n: n.customValidityDays ?? 0 })
  if (n.validity) return t(`notif.validity.${n.validity}`)
  return ''
}

function ApprovalById({ notifId }: { notifId: string }) {
  const notif = useStore((s) => s.notifications.find((n) => n.id === notifId))
  if (!notif) return null
  return <ApprovalControls notif={notif} />
}

export function ApprovalControls({ notif }: { notif: AppNotification }) {
  const t = useT()
  const toast = useStore((s) => s.toast)

  if (notif.approvalStatus && notif.approvalStatus !== 'pending') {
    const approved = notif.approvalStatus === 'approved'
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 text-[13px] font-medium',
          approved ? 'text-ios-green' : 'text-ios-red',
        )}
      >
        {approved ? <Check size={15} strokeWidth={3} /> : <X size={15} strokeWidth={3} />}
        {approved ? t('notif.approved', { validity: validityHuman(notif, t) }) : t('notif.rejected')}
      </div>
    )
  }

  const approve = () => {
    // No period picker anymore — grant with the former default (7 days).
    resolveApprovalFlow(notif.id, 'approved', '7d')
    toast(t('notif.approvedToast'), 'success')
  }
  const reject = () => {
    resolveApprovalFlow(notif.id, 'rejected')
    toast(t('notif.rejectedToast'))
  }

  return (
    <div className="flex gap-2.5">
      <button onClick={reject} className="flex-1 h-10 rounded-ios-lg bg-ios-gray6 text-label-primary font-semibold text-[15px] press">
        {t('notif.reject')}
      </button>
      <button onClick={approve} className="flex-1 h-10 rounded-ios-lg text-white font-semibold text-[15px] press" style={{ background: '#CC79FF' }}>
        {t('notif.approve')}
      </button>
    </div>
  )
}

// ---- Task-created card -----------------------------------------------------

export function TaskCreatedCard({ taskId }: { taskId: string }) {
  const task = useStore((s) => s.tasks.find((x) => x.id === taskId))
  const push = useStore((s) => s.push)
  const t = useT()
  const lang = useLang()
  if (!task) return null
  return (
    <div className="my-2 rounded-ios-lg border border-divider bg-surface overflow-hidden">
      <div className="flex items-center gap-2.5 px-3 py-2.5 hairline-b">
        <div className="w-7 h-7 rounded-[8px] bg-ios-gray6 flex items-center justify-center text-label-secondary shrink-0">
          <CalendarClock size={15} />
        </div>
        <span className="flex-1 min-w-0 text-[14px] font-medium truncate">{t('chat.taskCard.title')}</span>
        <CheckCircle2 size={17} className="text-ios-green shrink-0" />
      </div>
      <div className="px-3.5 py-3 space-y-2">
        <div className="text-[16px] font-semibold">{task.name}</div>
        <div className="flex items-center gap-2 text-[13px]">
          <span className="px-2 py-0.5 rounded-md bg-ios-gray6 text-label-secondary font-medium">
            {scheduleHuman(task.schedule, lang)}
          </span>
          {task.nextRunAt && (
            <span className="text-label-secondary">
              {t('chat.taskCard.next')} · {formatRelative(task.nextRunAt, lang)}
            </span>
          )}
        </div>
        <button
          onClick={() => push('taskDetail', { id: task.id })}
          className="text-[14px] font-semibold text-brand-primary active:opacity-60"
        >
          {t('chat.taskCard.view')} ›
        </button>
      </div>
    </div>
  )
}

// ---- Inline MCP connect card -----------------------------------------------
// Lets the user authorize + enable an MCP server right inside the conversation.
// Shares the exact authorize→connect flow (and store) with the MCP settings list.

export function McpConnectCard({ serverId, target }: { serverId: string; target: MessageTarget }) {
  const t = useT()
  const server = useStore((s) => s.mcpServers.find((m) => m.id === serverId))
  const { busy, connect } = useMcpConnect()
  if (!server) return null
  const state = busy[server.id]

  return (
    <div className="my-2 rounded-ios-lg border border-divider bg-surface overflow-hidden">
      <div className="flex items-center gap-3 px-3.5 py-3">
        <ServerLogo logo={server.logo} gradient={server.gradient} name={server.letter || server.name} size={36} />
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold truncate">{server.name}</div>
          <div className="text-[13px] text-label-secondary truncate">{server.desc}</div>
        </div>
        {server.enabled ? (
          <span className="flex items-center gap-1 text-[14px] font-semibold text-ios-green shrink-0">
            <CheckCircle2 size={16} />
            {t('mcp.connected.short')}
          </span>
        ) : state ? (
          <div className="flex items-center gap-1.5 text-[13px] text-label-secondary shrink-0 whitespace-nowrap">
            <Spinner size={15} />
            {state === 'auth' ? t('mcp.authorizing') : t('mcp.connecting')}
          </div>
        ) : (
          <button
            onClick={() => connect(server, () => continueAfterMcpConnect(target, server.name))}
            className="px-4 h-9 rounded-full bg-brand-primary text-white text-[14px] font-semibold shrink-0 press"
          >
            {t('mcp.connect')}
          </button>
        )}
      </div>
    </div>
  )
}

// ---- Message actions -------------------------------------------------------

export function MessageActions({
  message,
  target,
  allowRetry,
  onRetry,
  copyOnly,
}: {
  message: Message
  target: MessageTarget
  allowRetry?: boolean
  onRetry?: () => void
  copyOnly?: boolean // only the copy button (e.g. a read-only task-run result)
}) {
  const t = useT()
  const toast = useStore((s) => s.toast)
  const patchMessage = useStore((s) => s.patchMessage)
  const [reasonOpen, setReasonOpen] = useState(false)

  const copy = () => {
    navigator.clipboard?.writeText(message.text).catch(() => {})
    toast(t('common.copied'), 'success')
  }
  const like = () =>
    patchMessage(target, message.id, { reaction: message.reaction === 'up' ? null : 'up' })
  const toggleFav = () => {
    const was = message.favoritedAt
    patchMessage(target, message.id, (m) => ({ favoritedAt: m.favoritedAt ? undefined : Date.now() }))
    toast(was ? t('chat.fav.removed') : t('chat.fav.add'), 'success')
  }

  const reasons = ['chat.dislike.r1', 'chat.dislike.r2', 'chat.dislike.r3', 'chat.dislike.r4']

  return (
    <div className="flex items-center gap-1 mt-1.5 -ml-1.5 text-label-secondary">
      <ActionBtn onClick={copy}>
        <Copy size={15} />
      </ActionBtn>
      {!copyOnly && (
        <>
          <ActionBtn onClick={like} active={message.reaction === 'up'}>
            <ThumbsUp size={15} />
          </ActionBtn>
          <ActionBtn onClick={() => setReasonOpen(true)} active={message.reaction === 'down'}>
            <ThumbsDown size={15} />
          </ActionBtn>
          {target.mode === 'workmate' && (
            <ActionBtn onClick={toggleFav} active={!!message.favoritedAt}>
              <Bookmark size={15} className={cn(message.favoritedAt && 'fill-current')} />
            </ActionBtn>
          )}
          {allowRetry && onRetry && (
            <ActionBtn onClick={onRetry}>
              <RotateCcw size={15} />
            </ActionBtn>
          )}
        </>
      )}

      <Sheet open={reasonOpen} onClose={() => setReasonOpen(false)} title={t('chat.dislike.title')}>
        <div className="px-4 pb-2 space-y-2">
          {reasons.map((r) => (
            <button
              key={r}
              onClick={() => {
                patchMessage(target, message.id, { reaction: 'down', downvoteReason: t(r) })
                setReasonOpen(false)
                toast(t('chat.feedbackThanks'), 'success')
              }}
              className="w-full h-12 rounded-ios-lg bg-ios-gray6 text-[15px] font-medium active:bg-ios-gray5"
            >
              {t(r)}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  )
}

function ActionBtn({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-7 h-7 flex items-center justify-center rounded-full active:bg-black/[0.05]',
        active ? 'text-brand-violet' : 'text-label-secondary',
      )}
    >
      {children}
    </button>
  )
}
