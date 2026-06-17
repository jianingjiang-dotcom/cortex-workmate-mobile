import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUp, ChevronDown, FileText, Image as ImageIcon, Maximize2, Plus, Square, X } from 'lucide-react'
import type { Attachment, TaskRunRef } from '../../lib/types'
import { cn, resizeImageToDataUrl, uid } from '../../lib/util'
import { useT } from '../../i18n'
import { ActionSheet } from '../ui/Sheet'

export function ChatInput({
  onSend,
  streaming,
  onStop,
  placeholder,
  bottomInset,
  text,
  setText,
  focusNonce,
  quote,
  onClearQuote,
}: {
  onSend: (text: string, attachments: Attachment[]) => void
  streaming: boolean
  onStop: () => void
  placeholder: string
  bottomInset?: boolean
  text: string
  setText: (v: string) => void
  focusNonce?: number
  quote?: TaskRunRef | null
  onClearQuote?: () => void
}) {
  const t = useT()
  const [atts, setAtts] = useState<Attachment[]>([])
  const [sourceOpen, setSourceOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const canSend = (text.trim().length > 0 || atts.length > 0 || !!quote) && !streaming

  const onPick = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const picked: Attachment[] = []
    for (const f of Array.from(fileList)) {
      if (f.type.startsWith('image/')) {
        try {
          const previewUrl = await resizeImageToDataUrl(f)
          picked.push({ id: uid('att_'), kind: 'image', name: f.name, size: f.size, previewUrl })
        } catch {
          picked.push({ id: uid('att_'), kind: 'image', name: f.name, size: f.size })
        }
      } else {
        const ext = f.name.includes('.') ? f.name.split('.').pop()!.toUpperCase() : 'FILE'
        picked.push({ id: uid('att_'), kind: 'file', name: f.name, size: f.size, ext })
      }
    }
    setAtts((p) => [...p, ...picked])
  }

  const grow = () => {
    const el = taRef.current
    if (!el || expanded) return // full-screen editor is sized by flexbox
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const send = () => {
    if (!canSend) return
    onSend(text.trim(), atts)
    setText('')
    setAtts([])
    setExpanded(false)
    requestAnimationFrame(() => {
      if (taRef.current) taRef.current.style.height = 'auto'
    })
  }

  // re-grow the compact textarea after collapsing from full screen
  useEffect(() => {
    if (!expanded) grow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  // focus + place cursor at end when the composer is prefilled externally (e.g. "add memory")
  useEffect(() => {
    if (!focusNonce) return
    const el = taRef.current
    if (!el) return
    el.focus()
    const len = el.value.length
    el.setSelectionRange(len, len)
    grow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce])

  const phoneEl = typeof document !== 'undefined' ? document.getElementById('phone-screen') : null

  // ---- shared bits (rendered in either the compact bar or the full-screen editor) ----
  const chips = atts.length > 0 && (
    <div className="flex gap-2 px-1 pb-2 overflow-x-auto no-scrollbar">
      {atts.map((a) => (
        <div key={a.id} className="relative shrink-0">
          {a.kind === 'image' && a.previewUrl ? (
            <img src={a.previewUrl} className="w-16 h-16 rounded-ios object-cover" alt={a.name} />
          ) : (
            <div className="w-16 h-16 rounded-ios bg-ios-gray6 flex flex-col items-center justify-center px-1">
              <FileText size={20} className="text-label-secondary" />
              <span className="text-[9px] text-label-secondary truncate max-w-full mt-0.5">{a.name}</span>
            </div>
          )}
          <button
            onClick={() => setAtts((p) => p.filter((x) => x.id !== a.id))}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/55 text-white flex items-center justify-center"
            aria-label="remove attachment"
          >
            <X size={11} strokeWidth={3} />
          </button>
        </div>
      ))}
    </div>
  )

  // quoted scheduled-task run (a referenced execution result) pinned above the input
  const quoteChip = quote && (
    <div className="relative mb-2 flex gap-2.5 rounded-[12px] bg-brand-primary/[0.07] p-2.5 pr-10">
      <div className="w-[3px] self-stretch rounded-full bg-brand-primary/70 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-primary">
          <span className="truncate">{quote.taskName}</span>
        </div>
        <div className="text-[12.5px] text-label-secondary leading-snug line-clamp-2 mt-0.5 whitespace-pre-wrap break-words">{quote.summary}</div>
      </div>
      <button
        onClick={onClearQuote}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-label-tertiary active:opacity-50"
        aria-label="remove quote"
      >
        <X size={15} strokeWidth={2.2} />
      </button>
    </div>
  )

  const addBtn = (
    <button
      onClick={() => setSourceOpen(true)}
      disabled={streaming}
      aria-label="add attachment"
      className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-label-secondary active:bg-ios-gray6 disabled:opacity-40"
    >
      <Plus size={22} />
    </button>
  )

  const sendBtn = streaming ? (
    <button onClick={onStop} className="w-8 h-8 shrink-0 rounded-full bg-ios-gray flex items-center justify-center text-white press">
      <Square size={14} fill="currentColor" />
    </button>
  ) : (
    <button
      onClick={send}
      disabled={!canSend}
      aria-label={t('chat.send')}
      className={cn(
        'w-8 h-8 shrink-0 rounded-full flex items-center justify-center',
        canSend ? 'press bg-brand-primary text-white' : 'bg-ios-gray6 text-label-tertiary cursor-default',
      )}
    >
      <ArrowUp size={19} strokeWidth={2.6} />
    </button>
  )

  return (
    <div className={cn('relative shrink-0 glass hairline-t px-2.5 pt-2', bottomInset ? 'pb-[26px]' : 'pb-2.5')}>
      {/* compact bar (hidden while the full-screen editor is open) */}
      {!expanded && (
        <>
          {quoteChip}
          {chips}
          {/* one bordered pill: + (left) · field · send (right) */}
          <div className="flex items-center gap-1 bg-surface rounded-[22px] border border-input px-1.5 py-1 min-h-[44px]">
            {addBtn}
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                grow()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={1}
              placeholder={placeholder}
              className="flex-1 resize-none outline-none text-[16px] leading-[1.4] bg-transparent max-h-[120px] no-scrollbar placeholder:text-label-tertiary py-[7px] px-1"
            />
            {(text.includes('\n') || text.trim().length > 80) && (
              <button
                onClick={() => setExpanded(true)}
                aria-label="expand input"
                className="w-8 h-8 shrink-0 flex items-center justify-center text-label-tertiary active:opacity-50"
              >
                <Maximize2 size={16} />
              </button>
            )}
            {sendBtn}
          </div>
        </>
      )}

      <ActionSheet
        open={sourceOpen}
        onClose={() => setSourceOpen(false)}
        cancelLabel={t('common.cancel')}
        actions={[
          { label: t('chat.attach.photo'), icon: <ImageIcon size={20} />, onClick: () => photoRef.current?.click() },
          { label: t('chat.attach.file'), icon: <FileText size={20} />, onClick: () => fileRef.current?.click() },
        ]}
      />

      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files)
          e.target.value = ''
        }}
      />

      {/* full-screen expanded editor — covers the whole screen (over the header + tab bar),
          ChatGPT/Claude-style: collapse chevron top-left, big editor, composer pinned bottom */}
      {phoneEl &&
        expanded &&
        createPortal(
          <div
            className="z-50 flex flex-col input-rise bg-surface"
            style={{ position: 'absolute', top: 54, bottom: 0, left: 0, right: 0 }}
          >
            {/* top bar: collapse (chevron-down, left) + centered title */}
            <div className="relative h-12 shrink-0 flex items-center px-1.5 hairline-b">
              <button
                onClick={() => setExpanded(false)}
                aria-label="collapse input"
                className="w-10 h-10 flex items-center justify-center text-label-secondary active:opacity-50"
              >
                <ChevronDown size={24} />
              </button>
              <span className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold">
                {t('chat.compose.title')}
              </span>
            </div>

            {/* editor body */}
            <div className="flex-1 min-h-0 flex flex-col">
              {quote && <div className="shrink-0 px-4 pt-3">{quoteChip}</div>}
              <textarea
                ref={taRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                autoFocus
                className="flex-1 w-full px-4 pt-3 pb-3 resize-none outline-none text-[16px] leading-relaxed bg-transparent no-scrollbar placeholder:text-label-tertiary"
              />
              <div
                className="shrink-0 hairline-t px-3 pt-2.5"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
              >
                {chips}
                <div className="flex items-center gap-2">
                  {addBtn}
                  <div className="flex-1" />
                  {sendBtn}
                </div>
              </div>
            </div>
          </div>,
          phoneEl,
        )}
    </div>
  )
}
