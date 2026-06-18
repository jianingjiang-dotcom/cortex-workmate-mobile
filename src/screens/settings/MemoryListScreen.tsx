import { useState } from 'react'
import { Brain, Plus, Search, Trash2 } from 'lucide-react'
import type { MemoryItem, OverlayScreenProps } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { Page } from '../../components/Page'
import { Button, EmptyState, Highlight, IconButton, Row, SearchField, Section } from '../../components/ui/atoms'

export function MemoryListScreen({ onBack }: OverlayScreenProps) {
  const t = useT()
  const memories = useStore((s) => s.memories)
  const deleteMemory = useStore((s) => s.deleteMemory)
  const setComposeDraft = useStore((s) => s.setComposeDraft)
  const setChatMode = useStore((s) => s.setChatMode)
  const setTab = useStore((s) => s.setTab)
  const popAllOverlays = useStore((s) => s.popAllOverlays)
  const push = useStore((s) => s.push)
  const toast = useStore((s) => s.toast)

  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const active = memories.filter((m) => !m.deletedAt).sort((a, b) => b.createdAt - a.createdAt)
  const deletedCount = memories.filter((m) => m.deletedAt).length
  const filtered = q ? active.filter((m) => m.text.toLowerCase().includes(q)) : active
  const closeSearch = () => {
    setSearching(false)
    setQuery('')
  }

  // jump to Workmate with the composer prefilled — sending triggers a save-memory tool call
  const addViaChat = () => {
    setComposeDraft(t('memory.addPrompt'))
    setChatMode('workmate')
    setTab('chat')
    popAllOverlays()
  }

  const removeToTrash = (m: MemoryItem) => {
    deleteMemory(m.id)
    toast(t('memory.movedToTrash'), 'success')
  }

  const activeEmpty = active.length === 0

  return (
    <Page
      title={t('memory.title')}
      onBack={onBack}
      bg="group"
      right={
        <>
          {!activeEmpty && (
            <IconButton onClick={() => setSearching(true)} ariaLabel="search">
              <Search size={21} />
            </IconButton>
          )}
          <IconButton onClick={addViaChat} ariaLabel="add">
            <Plus size={23} />
          </IconButton>
        </>
      }
    >
      {!searching && (
        <p className="px-4 pt-0.5 pb-2 text-[14px] text-label-secondary leading-snug">{t('memory.subtitle')}</p>
      )}
      {searching && (
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={t('memory.search')}
          onClose={closeSearch}
          closeLabel={t('common.cancel')}
        />
      )}

      {activeEmpty && !searching ? (
        <EmptyState
          icon={<Brain size={30} />}
          title={t('memory.empty')}
          subtitle={t('memory.emptyHint')}
          action={<Button onClick={addViaChat}>{t('memory.add')}</Button>}
        />
      ) : q && filtered.length === 0 ? (
        <div className="text-center text-[14px] text-label-tertiary pt-16">{t('memory.noResults')}</div>
      ) : (
        <div className="px-4 mt-1">
          <div className="list-group divide-y divide-divider">
            {filtered.map((m) => (
              <div key={m.id} className="flex items-start gap-2 px-4 py-3.5">
                <p className="flex-1 text-[16px] leading-relaxed text-label-primary">
                  {q ? <Highlight text={m.text} query={query} /> : m.text}
                </p>
                <button
                  onClick={() => removeToTrash(m)}
                  aria-label="delete"
                  className="w-8 h-8 -mr-1 flex items-center justify-center rounded-full text-label-tertiary active:bg-black/[0.05] shrink-0"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* recycle bin entry — only when there are deleted memories */}
      {!searching && deletedCount > 0 && (
        <Section className="mt-4">
          <Row
            icon={<Trash2 size={17} />}
            iconBg="#8E8E93"
            title={t('memory.trash.title')}
            value={String(deletedCount)}
            chevron
            onClick={() => push('memoryTrash')}
          />
        </Section>
      )}
    </Page>
  )
}
