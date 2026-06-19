import { useState } from 'react'
import { Bot, Check } from 'lucide-react'
import type { Agent, AgentOrg } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { Highlight, SearchField, Section } from '../ui/atoms'
import { Sheet } from '../ui/Sheet'

// Display order of the organization/team groups in the picker.
const ORG_ORDER: AgentOrg[] = ['builtin', 'cobo', 'salesBd', 'opsGrowth', 'rd', 'default']

/** Bottom-sheet agent picker: search + org-grouped rows with a check on the active one. */
export function AgentPickerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const agents = useStore((s) => s.agents)
  const activeAgentId = useStore((s) => s.activeAgentId)
  const setActiveAgent = useStore((s) => s.setActiveAgent)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const pick = (id: string) => {
    setActiveAgent(id)
    onClose()
  }

  const row = (a: Agent) => {
    const active = a.id === activeAgentId
    return (
      <button
        key={a.id}
        onClick={() => pick(a.id)}
        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left active:opacity-60 ${active ? 'bg-brand-primary/[0.06]' : ''}`}
      >
        <Bot size={20} className="text-brand-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-medium truncate">
            {q ? <Highlight text={a.name} query={query} /> : a.name}
          </div>
          {a.desc && (
            <div className="text-[14px] text-label-secondary truncate mt-0.5">
              {q ? <Highlight text={a.desc} query={query} /> : a.desc}
            </div>
          )}
        </div>
        {active && <Check size={19} className="text-brand-primary shrink-0" />}
      </button>
    )
  }

  const filtered = q
    ? agents.filter((a) => a.name.toLowerCase().includes(q) || (a.desc || '').toLowerCase().includes(q))
    : []

  return (
    <Sheet open={open} onClose={onClose} title={t('agent.title')}>
      <SearchField value={query} onChange={setQuery} placeholder={t('agent.search')} autoFocus={false} />
      {q ? (
        filtered.length === 0 ? (
          <div className="text-center text-[14px] text-label-tertiary pt-12 pb-4">{t('agent.noResults')}</div>
        ) : (
          <div className="pt-1">
            <Section>{filtered.map(row)}</Section>
          </div>
        )
      ) : (
        <div className="pt-1 space-y-4">
          {ORG_ORDER.map((org) => {
            const list = agents.filter((a) => a.org === org)
            if (list.length === 0) return null
            return (
              <Section key={org} title={t(`agent.org.${org}`)} noUppercase>
                {list.map(row)}
              </Section>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}
