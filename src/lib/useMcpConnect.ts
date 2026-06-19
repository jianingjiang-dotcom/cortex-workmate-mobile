import { useState } from 'react'
import type { McpServer } from './types'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'

type Busy = 'auth' | 'connecting'

/**
 * Shared MCP authorize→connect flow, used by the settings list, the detail
 * screen, and the in-chat connect card. `connect` runs the (mock) OAuth
 * round-trip when needed, then a brief "connecting…" beat, then enables.
 */
export function useMcpConnect() {
  const authorizeMcp = useStore((s) => s.authorizeMcp)
  const setMcpEnabled = useStore((s) => s.setMcpEnabled)
  const toast = useStore((s) => s.toast)
  const t = useT()
  const [busy, setBusy] = useState<Record<string, Busy>>({})

  const clearBusy = (id: string) =>
    setBusy((b) => {
      const n = { ...b }
      delete n[id]
      return n
    })

  const runConnect = (id: string, name: string, onDone?: () => void) => {
    setBusy((b) => ({ ...b, [id]: 'connecting' }))
    window.setTimeout(() => {
      setMcpEnabled(id, true)
      clearBusy(id)
      toast(t('mcp.connected', { name }), 'success')
      onDone?.()
    }, 900)
  }

  const connect = (m: McpServer, onDone?: () => void) => {
    if (m.auth === 'oauth' && !m.authorized) {
      toast(t('mcp.auth.opening'), 'loading')
      setBusy((b) => ({ ...b, [m.id]: 'auth' }))
      window.setTimeout(() => {
        authorizeMcp(m.id)
        runConnect(m.id, m.name, onDone)
      }, 1800)
    } else {
      runConnect(m.id, m.name, onDone)
    }
  }

  const disable = (id: string) => setMcpEnabled(id, false)

  return { busy, connect, disable }
}
