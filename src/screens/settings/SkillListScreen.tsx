import { useState } from 'react'
import { Search } from 'lucide-react'
import type { OverlayScreenProps } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { Page } from '../../components/Page'
import { Avatar, Highlight, IconButton, SearchField, Switch } from '../../components/ui/atoms'
import { identityColorAt } from '../../lib/util'

export function SkillListScreen({ onBack }: OverlayScreenProps) {
  const t = useT()
  const skills = useStore((s) => s.skills)
  const toggleSkill = useStore((s) => s.toggleSkill)

  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const filtered = q ? skills.filter((sk) => sk.name.toLowerCase().includes(q)) : skills
  const closeSearch = () => {
    setSearching(false)
    setQuery('')
  }

  // rows rendered inline in the map (a nested <Item/> component would remount each
  // render and break the Switch toggle transition — see McpListScreen note)

  return (
    <Page
      title={t('skill.title')}
      onBack={onBack}
      bg="group"
      right={
        <IconButton onClick={() => setSearching(true)} ariaLabel="search">
          <Search size={21} />
        </IconButton>
      }
    >
      {!searching && (
        <p className="px-4 pt-0.5 pb-2 text-[14px] text-label-secondary leading-snug">{t('skill.subtitle')}</p>
      )}
      {searching && (
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={t('skill.search')}
          onClose={closeSearch}
          closeLabel={t('common.cancel')}
        />
      )}
      {q && filtered.length === 0 ? (
        <div className="text-center text-[14px] text-label-tertiary pt-16">{t('skill.noResults')}</div>
      ) : (
        <div className="px-4 mt-1">
          <div className="list-group divide-y divide-divider">
            {filtered.map((sk, i) => (
              <div key={sk.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar color={identityColorAt(i)} name={sk.letter || sk.name} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="text-[16px] font-medium truncate">
                    {q ? <Highlight text={sk.name} query={query} /> : sk.name}
                  </div>
                  <div className="text-[14px] text-label-secondary truncate mt-0.5">{sk.desc}</div>
                </div>
                <Switch checked={sk.enabled} onChange={() => toggleSkill(sk.id)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </Page>
  )
}
