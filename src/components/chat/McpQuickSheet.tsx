import type { McpServer } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { useMcpConnect } from '../../lib/useMcpConnect'
import { ServerLogo, Spinner, Switch } from '../ui/atoms'
import { Sheet } from '../ui/Sheet'

/** Bottom-sheet MCP-server toggle list, opened from the Agents-mode toolbar. Reads/writes
 *  the SAME global `mcpServers`, so it stays in sync with 我的→MCP and the in-chat card. */
export function McpQuickSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const mcpServers = useStore((s) => s.mcpServers)
  const { busy, connect, disable } = useMcpConnect()

  // Same control logic as McpListScreen: busy → spinner; unauthorized oauth → 连接; else Switch.
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
    <Sheet open={open} onClose={onClose} title={t('mcp.title')}>
      <div className="px-4 pt-1">
        <div className="list-group divide-y divide-divider">
          {mcpServers.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <ServerLogo logo={m.logo} gradient={m.gradient} name={m.letter || m.name} size={38} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[16px] font-medium truncate">{m.name}</span>
                  {m.shared && (
                    <span className="shrink-0 inline-flex items-center rounded-full bg-ios-gray6 px-2 py-0.5 text-[12px] font-medium text-label-secondary">
                      {t('mcp.badge.shared')}
                    </span>
                  )}
                </div>
                <div className="text-[13px] text-label-secondary truncate mt-0.5">{m.desc}</div>
              </div>
              {renderControl(m)}
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
