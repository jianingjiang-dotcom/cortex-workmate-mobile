import { Bot, FileText, Pencil, Quote, Sparkles } from 'lucide-react'
import type { Attachment, ChatMode, Message, TaskRunRef } from '../../lib/types'
import { cn, formatBytes } from '../../lib/util'
import { formatRelative } from '../../lib/time'
import { useLang, useT } from '../../i18n'
import { useStore, type MessageTarget } from '../../store/useStore'
import { Avatar } from '../ui/atoms'
import { Markdown, McpConnectCard, MessageActions, TaskCreatedCard, ToolCallCardView } from './parts'

const USER_BUBBLE = 'var(--bubble-user)'

function AttachmentThumb({ a }: { a: Attachment }) {
  if (a.kind === 'image' && a.previewUrl) {
    return <img src={a.previewUrl} className="w-[120px] h-[120px] object-cover rounded-ios-lg" alt={a.name} />
  }
  return (
    <div className="flex items-center gap-2 rounded-ios px-3 py-2.5 max-w-[220px]" style={{ background: USER_BUBBLE }}>
      <FileText size={18} className="shrink-0 text-label-secondary" />
      <div className="min-w-0">
        <div className="text-[13px] font-medium truncate text-label-primary">{a.name}</div>
        <div className="text-[11px] text-label-secondary">{formatBytes(a.size)}</div>
      </div>
    </div>
  )
}

// A quoted scheduled-task run shown above the user bubble (reply-context style).
function QuotedRunChip({ run }: { run: TaskRunRef }) {
  const t = useT()
  const lang = useLang()
  const failed = run.status === 'failed'
  return (
    <div
      className={cn(
        'max-w-[82%] rounded-[14px] rounded-br-[7px] border-l-[3px] pl-2.5 pr-3 py-2 mb-1',
        failed ? 'border-ios-red/70 bg-ios-red/[0.07]' : 'border-brand-primary/70 bg-brand-primary/[0.07]',
      )}
    >
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-label-secondary">
        <span className="truncate">
          {t('chat.quote.label')} · {run.taskName}
        </span>
      </div>
      <div className="text-[13.5px] text-label-primary leading-snug mt-0.5 line-clamp-3 whitespace-pre-wrap break-words">
        {run.summary}
      </div>
      <div className="text-[11px] text-label-tertiary mt-1">{formatRelative(run.startedAt, lang)}</div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-brand-violet"
          style={{ animation: `bounce 1s ${i * 0.15}s infinite ease-in-out` }}
        />
      ))}
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-4px);opacity:1}}`}</style>
    </div>
  )
}

export function MessageView({
  message,
  target,
  mode,
  onRetry,
  onEditUser,
  highlighted,
  readOnly,
}: {
  message: Message
  target: MessageTarget
  mode: ChatMode
  onRetry?: () => void
  onEditUser?: (m: Message) => void
  highlighted?: boolean
  readOnly?: boolean // hide the reply feedback bar (copy/like/dislike/retry) in view-only results
}) {
  const t = useT()
  const persona = useStore((s) => s.persona)
  // In Agents (normal) mode the reply is attributed to the active agent, not the Workmate persona.
  const activeAgent = useStore((s) => (mode === 'normal' ? s.agents.find((a) => a.id === s.activeAgentId) : undefined))

  // Jump-to highlight: drawn with an OUTLINE (offset) + background so it floats around
  // the content without affecting layout — no edge-hugging and no content shift when it
  // clears. Geometry is always present (transparent); only the colors fade.
  const hl = cn(
    'rounded-xl outline outline-2 outline-offset-[6px] transition-[background-color,outline-color] duration-500',
    highlighted ? 'outline-brand-primary/45 bg-brand-primary/[0.07]' : 'outline-transparent',
  )

  if (message.role === 'user') {
    return (
      <div data-mid={message.id} className={cn('flex flex-col items-end my-2.5', hl)}>
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-col items-end gap-1.5 mb-1.5">
            {message.attachments.map((a) => (
              <div key={a.id} className="rounded-ios-lg overflow-hidden">
                <AttachmentThumb a={a} />
              </div>
            ))}
          </div>
        )}
        {message.quotedRun && <QuotedRunChip run={message.quotedRun} />}
        {message.text && (
          <div
            className="max-w-[82%] rounded-[20px] rounded-br-[7px] px-3.5 py-2.5 text-label-primary text-[15px] leading-[1.45] whitespace-pre-wrap break-words"
            style={{ background: USER_BUBBLE }}
          >
            {message.text}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1 pr-1">
          {message.edited && <span className="text-[11px] text-label-tertiary">{t('chat.edited')}</span>}
          {mode === 'normal' && onEditUser && (
            <button
              onClick={() => onEditUser(message)}
              className="flex items-center gap-1 text-[12px] text-label-secondary active:opacity-60"
            >
              <Pencil size={12} />
              {t('common.edit')}
            </button>
          )}
        </div>
      </div>
    )
  }

  // assistant
  const pending = message.status === 'thinking' && !message.text && !(message.toolCalls && message.toolCalls.length)

  return (
    <div data-mid={message.id} className={cn('my-2.5 max-w-[90%]', hl)}>
      <div className="flex items-center gap-2 mb-1.5">
        {activeAgent ? (
          <>
            <Bot size={18} className="text-brand-primary shrink-0" />
            <span className="text-[13px] font-semibold brand-text">{activeAgent.name}</span>
          </>
        ) : (
          <>
            <Avatar src={persona.avatarImage} gradient={persona.avatarGradient} size={26} shape="circle" icon={<Sparkles size={14} />} />
            <span className="text-[13px] font-semibold brand-text">{persona.name}</span>
          </>
        )}
      </div>
      {message.toolCalls?.map((c) => (
        <ToolCallCardView key={c.id} card={c} />
      ))}
      {pending && <TypingDots />}
      {message.text && (
        <div className="relative">
          <Markdown>{message.text}</Markdown>
          {message.status === 'streaming' && (
            <span className="inline-block w-[3px] h-[15px] ml-0.5 align-middle bg-brand-violet animate-pulse rounded-full" />
          )}
        </div>
      )}
      {message.taskCreatedId && <TaskCreatedCard taskId={message.taskCreatedId} />}
      {message.mcpRequestId && <McpConnectCard serverId={message.mcpRequestId} target={target} />}
      {message.status === 'stopped' && (
        <div className="text-[12px] text-label-tertiary mt-1">{t('chat.stopped')}</div>
      )}
      {(message.status === 'done' || message.status === 'stopped') && message.text && (
        <MessageActions
          message={message}
          target={target}
          allowRetry={mode === 'normal'}
          onRetry={onRetry}
          copyOnly={readOnly}
        />
      )}
    </div>
  )
}
