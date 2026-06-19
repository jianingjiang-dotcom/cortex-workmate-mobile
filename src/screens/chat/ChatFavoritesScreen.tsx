import { useState } from 'react'
import { Bookmark, Search, Sparkles } from 'lucide-react'
import type { Message, OverlayScreenProps } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useLang, useT } from '../../i18n'
import { Page } from '../../components/Page'
import { Avatar, EmptyState, Highlight, IconButton, SearchField } from '../../components/ui/atoms'
import { formatRelative } from '../../lib/time'

// strip light markdown + collapse whitespace for a clean snippet
function clean(text: string): string {
  return text
    .replace(/[*#`>_~[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function ChatFavoritesScreen({ onBack }: OverlayScreenProps) {
  const t = useT()
  const lang = useLang()
  const messages = useStore((s) => s.workmateMessages)
  const persona = useStore((s) => s.persona)
  const setJumpTo = useStore((s) => s.setJumpTo)
  const patchMessage = useStore((s) => s.patchMessage)
  const toast = useStore((s) => s.toast)

  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const favs = messages
    .filter((m) => m.favoritedAt)
    .sort((a, b) => (b.favoritedAt ?? 0) - (a.favoritedAt ?? 0))
  const filtered = q ? favs.filter((m) => clean(m.text).toLowerCase().includes(q)) : favs

  const open = (m: Message) => {
    setJumpTo(m.id)
    onBack()
  }
  const unfav = (m: Message) => {
    patchMessage({ mode: 'workmate' }, m.id, { favoritedAt: undefined })
    toast(t('chat.fav.removed'), 'delete')
  }
  const closeSearch = () => {
    setSearching(false)
    setQuery('')
  }

  // render helper (not a nested component — avoids remount on each render)
  const renderList = (items: Message[]) => (
    <div className="px-4 mt-1">
      <div className="list-group divide-y divide-divider">
        {items.map((m) => (
          <div key={m.id} className="flex items-start gap-2 px-4 py-3">
            <button onClick={() => open(m)} className="flex items-start gap-3 flex-1 min-w-0 text-left active:opacity-60">
              <Avatar src={persona.avatarImage} gradient={persona.avatarGradient} size={30} shape="circle" icon={<Sparkles size={14} />} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[14px] font-semibold text-label-primary truncate">{persona.name}</span>
                  <span className="text-[12px] text-label-tertiary shrink-0">{formatRelative(m.favoritedAt ?? m.createdAt, lang)}</span>
                </div>
                <div className="text-[14px] text-label-secondary leading-snug line-clamp-2">
                  {q ? <Highlight text={clean(m.text)} query={query} /> : clean(m.text)}
                </div>
              </div>
            </button>
            <button
              onClick={() => unfav(m)}
              aria-label={t('favorites.unfavorite')}
              className="w-8 h-8 -mr-1 flex items-center justify-center rounded-full text-brand-violet active:bg-black/[0.05] shrink-0"
            >
              <Bookmark size={18} className="fill-current" />
            </button>
          </div>
        ))}
      </div>
      <div className="h-10" />
    </div>
  )

  return (
    <Page
      title={t('favorites.title')}
      onBack={onBack}
      bg="group"
      right={
        !searching && favs.length > 0 ? (
          <IconButton onClick={() => setSearching(true)} ariaLabel="search">
            <Search size={21} />
          </IconButton>
        ) : undefined
      }
    >
      {favs.length === 0 ? (
        // also catches unfavoriting the last item while a search session is open
        <div className="flex items-center justify-center" style={{ minHeight: 600 }}>
          <EmptyState icon={<Bookmark size={30} />} title={t('favorites.empty')} subtitle={t('favorites.emptyHint')} />
        </div>
      ) : searching ? (
        <>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={t('favorites.search')}
            onClose={closeSearch}
            closeLabel={t('common.cancel')}
          />
          {q && filtered.length === 0 ? (
            <div className="text-center text-[14px] text-label-tertiary pt-16">{t('favorites.noResults')}</div>
          ) : (
            renderList(filtered)
          )}
        </>
      ) : (
        <>
          <p className="px-4 pt-0.5 pb-2 text-[14px] text-label-secondary leading-snug">{t('favorites.subtitle')}</p>
          {renderList(favs)}
        </>
      )}
    </Page>
  )
}
