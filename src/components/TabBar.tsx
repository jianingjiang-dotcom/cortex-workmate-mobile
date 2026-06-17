import { MessageCircle, Sparkles, UserRound } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import type { TabKey } from '../lib/types'

const ACTIVE = '#CC79FF' // --accent
const INACTIVE = '#8E8E93' // --text-3

export function TabBar() {
  const activeTab = useStore((s) => s.activeTab)
  const setTab = useStore((s) => s.setTab)
  const t = useT()

  const tabs: { key: TabKey; label: string; Icon: typeof MessageCircle }[] = [
    { key: 'chat', label: t('tab.chat'), Icon: MessageCircle },
    { key: 'assistant', label: t('tab.assistant'), Icon: Sparkles },
    { key: 'me', label: t('tab.me'), Icon: UserRound },
  ]

  return (
    // Floating glass pill — inset from the edges, clears the home indicator.
    <div
      className="absolute inset-x-0 bottom-0 z-40 flex justify-center px-3 pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 26px)' }}
    >
      <div
        className="pointer-events-auto w-full flex items-stretch gap-1 p-1.5 rounded-full glass"
        style={{
          border: '1px solid var(--glass-border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.16), 0 1px 2px rgba(0,0,0,0.06)',
        }}
      >
        {tabs.map(({ key, label, Icon }) => {
          const active = key === activeTab
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[52px] px-2 rounded-full transition-opacity active:opacity-60"
            >
              <Icon size={24} style={{ color: active ? ACTIVE : INACTIVE }} />
              <span
                className="text-[11px] font-medium tracking-tight"
                style={{ color: active ? ACTIVE : INACTIVE }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
