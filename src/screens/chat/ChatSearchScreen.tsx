import { useMemo, useState } from 'react'
import { Search, Sparkles, User, X } from 'lucide-react'
import type { Message, OverlayScreenProps } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useLang, useT } from '../../i18n'
import { Avatar, EmptyState } from '../../components/ui/atoms'
import { formatRelative } from '../../lib/time'

// strip light markdown + collapse whitespace for a clean one-line snippet
function clean(text: string): string {
  return text
    .replace(/[*#`>_~[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function Snippet({ text, query }: { text: string; query: string }) {
  const i = text.toLowerCase().indexOf(query.toLowerCase())
  if (i === -1) return <span className="line-clamp-2">{text}</span>
  const start = Math.max(0, i - 24)
  return (
    <span className="line-clamp-2">
      {start > 0 ? '…' : ''}
      {text.slice(start, i)}
      <mark className="bg-brand-primary/20 text-brand-violet rounded px-0.5 font-medium">
        {text.slice(i, i + query.length)}
      </mark>
      {text.slice(i + query.length)}
    </span>
  )
}

export function ChatSearchScreen({ onBack }: OverlayScreenProps) {
  const t = useT()
  const lang = useLang()
  const messages = useStore((s) => s.workmateMessages)
  const persona = useStore((s) => s.persona)
  const setJumpTo = useStore((s) => s.setJumpTo)
  const [query, setQuery] = useState('')

  const q = query.trim()
  const results = useMemo(() => {
    if (!q) return []
    const ql = q.toLowerCase()
    return messages
      .map((m) => ({ m, text: clean(m.text) }))
      .filter((x) => x.text.toLowerCase().includes(ql))
      .reverse()
  }, [q, messages])

  const open = (m: Message) => {
    setJumpTo(m.id)
    onBack()
  }

  return (
    <div className="absolute inset-0 bg-surface">
      {/* search header */}
      <div className="absolute top-[54px] left-0 right-0 z-30 glass hairline-b h-[48px] flex items-center gap-2 px-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-label-tertiary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('chat.search.placeholder')}
            className="w-full h-9 bg-surface border border-input rounded-[12px] pl-9 pr-8 text-[16px] outline-none placeholder:text-label-tertiary"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-ios-gray3 text-white flex items-center justify-center"
            >
              <X size={12} strokeWidth={3} />
            </button>
          )}
        </div>
        <button onClick={onBack} className="text-[16px] text-label-secondary px-1 active:opacity-50 shrink-0">
          {t('common.cancel')}
        </button>
      </div>

      {/* body */}
      <div className="absolute top-[102px] inset-x-0 bottom-0 scroll-y no-scrollbar">
        {!q ? (
          <div className="h-full flex items-center justify-center -mt-12">
            <EmptyState icon={<Search size={30} />} title={t('chat.search.empty')} />
          </div>
        ) : results.length === 0 ? (
          <div className="h-full flex items-center justify-center -mt-12">
            <EmptyState icon={<Search size={30} />} title={t('chat.search.noResults')} />
          </div>
        ) : (
          <div>
            <div className="px-4 pt-2 pb-1 text-[14px] text-label-secondary">{t('chat.search.count', { n: results.length })}</div>
            <div className="list-group mx-4 divide-y divide-divider">
              {results.map(({ m, text }) => (
                <button
                  key={m.id}
                  onClick={() => open(m)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left active:bg-black/[0.04]"
                >
                  {m.role === 'assistant' ? (
                    <Avatar src={persona.avatarImage} gradient={persona.avatarGradient} size={30} shape="circle" icon={<Sparkles size={14} />} />
                  ) : (
                    <div className="w-[30px] h-[30px] rounded-[9px] bg-ios-gray5 flex items-center justify-center shrink-0">
                      <User size={16} className="text-label-secondary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[14px] font-semibold text-label-primary">
                        {m.role === 'assistant' ? persona.name : t('chat.search.you')}
                      </span>
                      <span className="text-[12px] text-label-tertiary shrink-0">{formatRelative(m.createdAt, lang)}</span>
                    </div>
                    <div className="text-[14px] text-label-secondary leading-snug">
                      <Snippet text={text} query={q} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="h-10" />
          </div>
        )}
      </div>
    </div>
  )
}
