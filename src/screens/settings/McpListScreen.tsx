import { useState } from 'react'
import { Key, Search, Users } from 'lucide-react'
import type { McpServer, OverlayScreenProps } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { useMcpConnect } from '../../lib/useMcpConnect'
import { Page } from '../../components/Page'
import { Highlight, IconButton, SearchField, ServerLogo, Spinner, Switch } from '../../components/ui/atoms'

export function McpListScreen({ onBack }: OverlayScreenProps) {
  const t = useT()
  const mcpServers = useStore((s) => s.mcpServers)
  const push = useStore((s) => s.push)
  const { busy, connect, disable } = useMcpConnect()

  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const filtered = q ? mcpServers.filter((m) => m.name.toLowerCase().includes(q)) : mcpServers
  const closeSearch = () => {
    setSearching(false)
    setQuery('')
  }

  // rows are rendered inline in the map; the control is a sibling of the (left) detail
  // button — NOT nested — so we avoid button-in-button and keep the Switch transition.
  const renderControl = (m: McpServer) => {
    const state = busy[m.id]
    if (state) {
      return (
        <div className="flex items-center gap-1.5 text-[13px] text-label-secondary shrink-0 whitespace-nowrap">
          <Spinner size={15} />
          <span>{state === 'auth' ? t('mcp.authorizing') : t('mcp.connecting')}</span>
        </div>
      )
    }
    if (m.auth === 'oauth' && !m.authorized) {
      return (
        <button
          onClick={() => connect(m)}
          className="px-3.5 h-8 rounded-full bg-brand-primary/10 text-brand-violet text-[14px] font-semibold active:opacity-60 shrink-0"
        >
          {t('mcp.connect')}
        </button>
      )
    }
    return <Switch checked={m.enabled} onChange={() => (m.enabled ? disable(m.id) : connect(m))} />
  }

  return (
    <Page
      title={t('mcp.title')}
      onBack={onBack}
      bg="group"
      right={
        <IconButton onClick={() => setSearching(true)} ariaLabel="search">
          <Search size={21} />
        </IconButton>
      }
    >
      {!searching && (
        <p className="px-4 pt-0.5 pb-2 text-[14px] text-label-secondary leading-snug">{t('mcp.subtitle')}</p>
      )}
      {searching && (
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={t('mcp.search')}
          onClose={closeSearch}
          closeLabel={t('common.cancel')}
        />
      )}
      {q && filtered.length === 0 ? (
        <div className="text-center text-[14px] text-label-tertiary pt-16">{t('mcp.noResults')}</div>
      ) : (
        <div className="px-4 mt-1">
          <div className="list-group divide-y divide-divider">
            {filtered.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => push('mcpDetail', { id: m.id })}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-60"
                >
                  <ServerLogo logo={m.logo} gradient={m.gradient} name={m.letter || m.name} size={38} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[16px] font-medium truncate">
                        {q ? <Highlight text={m.name} query={query} /> : m.name}
                      </span>
                      {m.shared && <Users size={13} className="text-brand-violet shrink-0" aria-label={t('mcp.badge.shared')} />}
                      {m.auth === 'oauth' && m.authorized && (
                        <Key size={13} className="text-ios-green shrink-0" aria-label={t('mcp.badge.key')} />
                      )}
                    </div>
                    <div className="text-[13px] text-label-secondary truncate mt-0.5">{m.desc}</div>
                  </div>
                </button>
                {renderControl(m)}
              </div>
            ))}
          </div>
        </div>
      )}
    </Page>
  )
}
