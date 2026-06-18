import { Plug } from 'lucide-react'
import type { OverlayScreenProps } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { useMcpConnect } from '../../lib/useMcpConnect'
import { Page } from '../../components/Page'
import { Button, EmptyState, ServerLogo, Spinner, Switch } from '../../components/ui/atoms'

export function McpDetailScreen({ params, onBack }: OverlayScreenProps) {
  const t = useT()
  const server = useStore((s) => s.mcpServers.find((m) => m.id === params?.id))
  const { busy, connect, disable } = useMcpConnect()

  if (!server) {
    return (
      <Page title="" onBack={onBack} largeTitle={false}>
        <EmptyState icon={<Plug size={28} />} title={t('common.empty')} />
      </Page>
    )
  }

  const state = busy[server.id]
  const authLabel = server.auth === 'oauth' ? t('mcp.authType.oauth') : t('mcp.authType.none')
  const tools = server.tools || []

  return (
    <Page onBack={onBack} largeTitle={false} bg="group">
      {/* header */}
      <div className="px-4 pt-2">
        <div className="card flex items-center gap-3.5 p-4">
          <ServerLogo logo={server.logo} gradient={server.gradient} name={server.letter || server.name} size={52} />
          <div className="flex-1 min-w-0">
            <div className="text-[18px] font-bold truncate">{server.name}</div>
            <div className="text-[14px] text-label-secondary truncate mt-0.5">
              {[server.publisher, authLabel].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>
      </div>

      {/* connect / enable control */}
      <div className="px-4 mt-3">
        {state ? (
          <div className="card flex items-center justify-center gap-2 h-12 text-[16px] text-label-secondary">
            <Spinner size={16} />
            {state === 'auth' ? t('mcp.authorizing') : t('mcp.connecting')}
          </div>
        ) : server.auth === 'oauth' && !server.authorized ? (
          // not yet authorized (or OAuth expired) → authorize button
          <Button full size="lg" onClick={() => connect(server)}>
            {t('mcp.detail.connectFull')}
          </Button>
        ) : (
          // authorized (or no-auth) → just a toggle; flipping on runs the connect beat
          <div className="card flex items-center gap-3 px-4 h-[52px]">
            <span className="flex-1 text-[16px] font-medium">
              {server.enabled ? t('mcp.detail.enabled') : t('mcp.detail.enable')}
            </span>
            <Switch checked={server.enabled} onChange={() => (server.enabled ? disable(server.id) : connect(server))} />
          </div>
        )}
      </div>

      {/* about */}
      <div className="px-4 mt-5">
        <div className="px-3 pb-1.5 text-[14px] font-medium text-label-secondary uppercase tracking-wide">
          {t('mcp.detail.about')}
        </div>
        <div className="card px-4 py-3.5 text-[16px] leading-relaxed text-label-primary">
          {server.about || server.desc}
        </div>
      </div>

      {/* tools */}
      {tools.length > 0 && (
        <div className="px-4 mt-5">
          <div className="px-3 pb-1.5 text-[14px] font-medium text-label-secondary uppercase tracking-wide">
            {t('mcp.detail.tools')} · {tools.length}
          </div>
          <div className="list-group divide-y divide-divider">
            {tools.map((tool) => (
              <div key={tool.name} className="px-4 py-3">
                <code className="text-[14px] font-mono text-brand-violet break-all">{tool.name}</code>
                <div className="text-[14px] text-label-secondary mt-1 leading-relaxed">{tool.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Page>
  )
}
