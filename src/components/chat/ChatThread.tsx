import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { ChatMode, Message, TaskRunRef } from '../../lib/types'
import { cn, solidFor, uid } from '../../lib/util'
import { useStore, type MessageTarget } from '../../store/useStore'
import { useT } from '../../i18n'
import { abortMessage, generateAssistant } from '../../lib/engine'
import { Avatar, Spinner } from '../ui/atoms'
import { CenterModal } from '../ui/Sheet'
import { MessageView } from './MessageView'
import { ChatInput } from './ChatInput'

const INITIAL_WINDOW = 8 // messages shown on entry
const PAGE_WINDOW = 8 // messages revealed each time the user scrolls to the top

export function ChatThread({
  target,
  mode,
  className,
  bottomInset,
  banner,
  allowLoadEarlier,
  readOnly,
  footer,
  accessory,
}: {
  target: MessageTarget
  mode: ChatMode
  className?: string
  bottomInset?: boolean
  banner?: ReactNode
  allowLoadEarlier?: boolean
  readOnly?: boolean // view-only: no composer, no edit/regenerate (e.g. a task-run result)
  footer?: ReactNode // rendered in place of the composer when readOnly (e.g. a 引用提问 bar)
  accessory?: ReactNode // toolbar rendered directly above the composer (e.g. the Agents-mode AgentBar)
}) {
  const t = useT()
  const persona = useStore((s) => s.persona)
  const messages = useStore((s) =>
    target.mode === 'workmate'
      ? s.workmateMessages
      : s.conversations.find((c) => c.id === target.conversationId)?.messages ?? [],
  )
  const appendMessage = useStore((s) => s.appendMessage)
  const mutateMessages = useStore((s) => s.mutateMessages)
  const jumpToMessageId = useStore((s) => s.jumpToMessageId)
  const clearJumpTo = useStore((s) => s.clearJumpTo)
  const composeDraft = useStore((s) => s.composeDraft)
  const clearComposeDraft = useStore((s) => s.clearComposeDraft)
  const composeQuote = useStore((s) => s.composeQuote)
  const clearComposeQuote = useStore((s) => s.clearComposeQuote)

  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [pendingQuote, setPendingQuote] = useState<TaskRunRef | null>(null)
  const [focusNonce, setFocusNonce] = useState(0)
  const [editing, setEditing] = useState<Message | null>(null)
  const [editText, setEditText] = useState('')
  const [visibleCount, setVisibleCount] = useState(INITIAL_WINDOW)
  const [loadingMore, setLoadingMore] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)
  const pendingPrepend = useRef<number | null>(null)
  const loadingRef = useRef(false)

  // ChatGPT-style: after a new turn is sent, lift that question to the top of the
  // viewport (smooth) and keep a trailing spacer so a short reply can still pin it there.
  const anchorId = useRef<string | null>(null)
  const [anchorTrigger, setAnchorTrigger] = useState(0)
  const [spacerH, setSpacerH] = useState(0)
  const spacerRef = useRef<HTMLDivElement>(null)

  const recomputeSpacer = () => {
    const el = scrollRef.current
    const id = anchorId.current
    if (!el || !id) return
    const node = el.querySelector(`[data-mid="${id}"]`) as HTMLElement | null
    if (!node) return
    const spacerNow = spacerRef.current?.offsetHeight ?? 0
    const contentH = el.scrollHeight - spacerNow // real content, minus the spacer
    const turnH = contentH - node.offsetTop // everything from the anchored turn down
    const needed = Math.max(0, el.clientHeight - turnH - 8)
    setSpacerH(needed)
  }

  const scrollToBottom = (smooth = false) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }

  useLayoutEffect(() => {
    setVisibleCount(INITIAL_WINDOW)
    anchorId.current = null
    setSpacerH(0)
    scrollToBottom(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.mode, (target as any).conversationId])

  useEffect(() => {
    if (nearBottom.current) scrollToBottom(false)
    // while a turn is anchored, keep the trailing spacer sized as the reply grows
    if (anchorId.current) recomputeSpacer()
  }, [messages])

  // a new turn was just sent → give room, then smoothly raise it to the top
  useEffect(() => {
    if (!anchorTrigger) return
    const el = scrollRef.current
    const id = anchorId.current
    if (!el || !id) return
    setSpacerH(el.clientHeight) // ensure enough room below for the question to reach the top
    const raf = requestAnimationFrame(() => {
      const node = el.querySelector(`[data-mid="${id}"]`) as HTMLElement | null
      if (node) el.scrollTo({ top: Math.max(0, node.offsetTop - 8), behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorTrigger])

  // reply finished streaming → settle the spacer, then stop anchoring future appends
  useEffect(() => {
    if (streamingId === null && anchorId.current) {
      recomputeSpacer()
      anchorId.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamingId])

  // keep the viewport anchored after older messages are prepended
  useLayoutEffect(() => {
    if (pendingPrepend.current != null && scrollRef.current) {
      const el = scrollRef.current
      el.scrollTop = el.scrollTop + (el.scrollHeight - pendingPrepend.current)
      pendingPrepend.current = null
    }
  }, [visibleCount])

  // jump from history search: expand the window, then (once the target renders) scroll + highlight
  useEffect(() => {
    if (!jumpToMessageId || target.mode !== 'workmate') return
    const idx = messages.findIndex((m) => m.id === jumpToMessageId)
    if (idx === -1) {
      clearJumpTo()
      return
    }
    const id = jumpToMessageId
    setVisibleCount((c) => Math.max(c, messages.length - idx))
    let tries = 0
    let raf = 0
    const tick = () => {
      const node = scrollRef.current?.querySelector(`[data-mid="${id}"]`) as HTMLElement | null
      if (node) {
        nearBottom.current = false
        node.scrollIntoView({ block: 'center', behavior: 'smooth' })
        setHighlightId(id)
        setTimeout(() => setHighlightId((h) => (h === id ? null : h)), 1800)
        clearJumpTo()
        return
      }
      if (tries++ < 20) raf = requestAnimationFrame(tick)
      else clearJumpTo()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToMessageId])

  // prefill the composer when arriving from "add memory" (Workmate thread only)
  useEffect(() => {
    if (composeDraft != null && target.mode === 'workmate') {
      setDraft(composeDraft)
      setFocusNonce((n) => n + 1)
      clearComposeDraft()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composeDraft, target.mode])

  // attach a quoted scheduled-task run when arriving from a run record (Workmate only)
  useEffect(() => {
    if (composeQuote != null && target.mode === 'workmate') {
      setPendingQuote(composeQuote)
      setFocusNonce((n) => n + 1)
      clearComposeQuote()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composeQuote, target.mode])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140
    if (allowLoadEarlier && el.scrollTop < 48 && !loadingMore && visibleCount < messages.length) {
      loadMore()
    }
  }

  const runAssistant = (userText: string, quotedRun?: TaskRunRef | null) => {
    const aId = uid('m_')
    appendMessage(target, { id: aId, role: 'assistant', text: '', status: 'thinking', createdAt: Date.now() })
    nearBottom.current = true
    setStreamingId(aId)
    generateAssistant(target, aId, userText, quotedRun ?? undefined).finally(() => setStreamingId(null))
  }

  const doSend = (text: string, attachments: Message['attachments'] = []) => {
    const userId = uid('m_')
    const quote = pendingQuote
    appendMessage(target, {
      id: userId,
      role: 'user',
      text,
      status: 'done',
      createdAt: Date.now(),
      attachments: attachments && attachments.length ? attachments : undefined,
      quotedRun: quote ?? undefined,
    })
    setPendingQuote(null)
    runAssistant(text, quote)
    // anchor this new turn to the top of the viewport (overrides runAssistant's nearBottom)
    nearBottom.current = false
    anchorId.current = userId
    setAnchorTrigger((n) => n + 1)
  }

  const stop = () => {
    if (streamingId) {
      abortMessage(streamingId)
      setStreamingId(null)
    }
  }

  const retry = (assistant: Message) => {
    const idx = messages.findIndex((m) => m.id === assistant.id)
    const prevUser = [...messages.slice(0, idx)].reverse().find((m) => m.role === 'user')
    if (!prevUser) return
    mutateMessages(target, (arr) => arr.slice(0, idx))
    runAssistant(prevUser.text)
  }

  const openEdit = (m: Message) => {
    setEditing(m)
    setEditText(m.text)
  }
  const submitEdit = () => {
    if (!editing) return
    const idx = messages.findIndex((m) => m.id === editing.id)
    const newText = editText.trim()
    mutateMessages(target, (arr) =>
      arr.slice(0, idx + 1).map((m) => (m.id === editing.id ? { ...m, text: newText, edited: true } : m)),
    )
    setEditing(null)
    runAssistant(newText)
  }

  const loadMore = () => {
    if (loadingRef.current || visibleCount >= messages.length) return
    loadingRef.current = true
    setLoadingMore(true)
    pendingPrepend.current = scrollRef.current?.scrollHeight ?? null
    setTimeout(() => {
      setVisibleCount((c) => Math.min(messages.length, c + PAGE_WINDOW))
      setLoadingMore(false)
      loadingRef.current = false
    }, 450)
  }

  const empty = messages.length === 0
  const windowed = !!allowLoadEarlier
  const shown = windowed ? messages.slice(Math.max(0, messages.length - visibleCount)) : messages
  const hasMore = windowed && visibleCount < messages.length

  return (
    <div className={cn('flex flex-col', className)}>
      {banner}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 scroll-y no-scrollbar px-4">
        {!empty && allowLoadEarlier && (
          <div className="flex justify-center items-center h-10">
            {loadingMore ? (
              <Spinner size={18} className="text-label-tertiary" />
            ) : !hasMore ? (
              <span className="text-[12px] text-label-tertiary">· {t('chat.threadStart')} ·</span>
            ) : null}
          </div>
        )}
        {empty ? (
          <Greeting
            mode={mode}
            personaName={persona.name}
            personaGradient={persona.avatarGradient}
            personaImage={persona.avatarImage}
            onPick={(s) => doSend(s)}
          />
        ) : (
          <div className="pt-2">
            {shown.map((m) => (
              <MessageView
                key={m.id}
                message={m}
                target={target}
                mode={mode}
                onRetry={readOnly ? undefined : () => retry(m)}
                onEditUser={readOnly ? undefined : openEdit}
                highlighted={m.id === highlightId}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
        {!empty && <div ref={spacerRef} aria-hidden style={{ height: spacerH }} />}
      </div>

      {readOnly ? (
        footer
      ) : (
        <>
          {accessory}
          <ChatInput
            onSend={doSend}
            streaming={!!streamingId}
            onStop={stop}
            placeholder={mode === 'workmate' ? t('chat.placeholder') : t('chat.placeholder.normal')}
            bottomInset={bottomInset}
            text={draft}
            setText={setDraft}
            focusNonce={focusNonce}
            quote={pendingQuote}
            onClearQuote={() => setPendingQuote(null)}
          />
        </>
      )}

      <CenterModal open={!!editing} onClose={() => setEditing(null)}>
        <div className="p-4">
          <div className="text-[16px] font-semibold text-center mb-3">{t('chat.editMessage.title')}</div>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            autoFocus
            className="w-full rounded-ios bg-ios-gray6 p-3 text-[16px] outline-none resize-none"
          />
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            <button onClick={() => setEditing(null)} className="h-10 rounded-ios-lg bg-ios-gray6 font-semibold text-[16px]">
              {t('common.cancel')}
            </button>
            <button
              onClick={submitEdit}
              disabled={!editText.trim()}
              className="h-10 rounded-ios-lg text-white font-semibold text-[16px] disabled:opacity-50 bg-brand-primary"
            >
              {t('common.confirm')}
            </button>
          </div>
        </div>
      </CenterModal>
    </div>
  )
}

function Greeting({
  mode,
  personaName,
  personaGradient,
  personaImage,
  onPick,
}: {
  mode: ChatMode
  personaName: string
  personaGradient: string
  personaImage?: string
  onPick: (s: string) => void
}) {
  const t = useT()
  const suggestions = ['chat.suggest.1', 'chat.suggest.2', 'chat.suggest.3', 'chat.suggest.4']
  return (
    <div className="flex flex-col items-center text-center pt-12 px-2">
      {mode === 'workmate' ? (
        <Avatar src={personaImage} gradient={personaGradient} size={64} shape="circle" icon={<SparkleIcon />} />
      ) : (
        <div className="w-16 h-16 rounded-[20px] flex items-center justify-center" style={{ background: solidFor('brand') }}>
          <SparkleIcon />
        </div>
      )}
      <h2 className="text-[20px] font-bold mt-4">
        {mode === 'workmate' ? t('chat.workmate.greetingTitle', { name: personaName }) : t('chat.normal.greetingTitle')}
      </h2>
      <p className="text-[14px] text-label-secondary mt-1.5 leading-relaxed max-w-[280px]">
        {mode === 'workmate' ? t('chat.workmate.greetingBody') : t('chat.normal.greetingBody')}
      </p>
      <div className="w-full grid grid-cols-1 gap-2 mt-6">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onPick(t(s))}
            className="text-left text-[14px] px-4 py-3 rounded-ios-lg bg-surface border border-divider shadow-ios active:bg-ios-gray6"
          >
            {t(s)}
          </button>
        ))}
      </div>
    </div>
  )
}

function SparkleIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
      <path d="M12 2l1.8 5.5L19.5 9l-5.7 1.5L12 16l-1.8-5.5L4.5 9l5.7-1.5L12 2z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" opacity="0.85" />
    </svg>
  )
}
