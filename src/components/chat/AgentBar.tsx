import { useState } from 'react'
import { Bot, ChevronUp } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { cn } from '../../lib/util'
import { AgentPickerSheet } from './AgentPickerSheet'
import { McpQuickSheet } from './McpQuickSheet'

/** Agents-mode accessory row above the composer: pick the active agent + toggle MCP
 *  servers. Each pill opens a bottom Sheet. Rendered only in Agents (normal) mode
 *  (ChatTab passes it as `accessory`). */
export function AgentBar() {
  const t = useT()
  const agents = useStore((s) => s.agents)
  const activeAgentId = useStore((s) => s.activeAgentId)
  const enabledCount = useStore((s) => s.mcpServers.filter((m) => m.enabled).length)
  const [agentOpen, setAgentOpen] = useState(false)
  const [mcpOpen, setMcpOpen] = useState(false)
  const active = agents.find((a) => a.id === activeAgentId) ?? agents[0]

  const pill = 'flex items-center gap-1.5 h-8 rounded-full bg-surface border border-divider active:opacity-60'

  return (
    <div className="shrink-0 glass hairline-t px-2.5 py-2 flex items-center gap-2">
      <button onClick={() => setAgentOpen(true)} className={cn(pill, 'pl-2.5 pr-2.5 min-w-0 max-w-[58%]')}>
        <Bot size={17} className="text-brand-primary shrink-0" />
        <span className="text-[14px] font-medium truncate">{active.name}</span>
        <ChevronUp size={14} className="text-label-tertiary shrink-0" />
      </button>
      <button onClick={() => setMcpOpen(true)} className={cn(pill, 'pl-1.5 pr-2.5 shrink-0')}>
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-brand-primary text-white text-[12px] font-semibold">
          {enabledCount}
        </span>
        <span className="text-[14px] font-medium">{t('chat.servers')}</span>
        <ChevronUp size={14} className="text-label-tertiary" />
      </button>

      <AgentPickerSheet open={agentOpen} onClose={() => setAgentOpen(false)} />
      <McpQuickSheet open={mcpOpen} onClose={() => setMcpOpen(false)} />
    </div>
  )
}
