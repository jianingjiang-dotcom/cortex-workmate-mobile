import { MessageCircle, Sparkles, User } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import type { TabKey } from '../lib/types'
import { cn } from '../lib/util'
import { updateAvailable } from '../lib/version'

const ACTIVE = '#7C5CFC'

export function TabBar() {
  const activeTab = useStore((s) => s.activeTab)
  const setTab = useStore((s) => s.setTab)
  const updateDismissed = useStore((s) => s.updateDismissed)
  const t = useT()
  const showMeDot = updateAvailable && !updateDismissed

  const tabs: { key: TabKey; label: string; Icon: typeof MessageCircle }[] = [
    { key: 'chat', label: t('tab.chat'), Icon: MessageCircle },
    { key: 'assistant', label: t('tab.assistant'), Icon: Sparkles },
    { key: 'me', label: t('tab.me'), Icon: User },
  ]

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 glass hairline-t h-[83px] pb-[22px] flex">
      {tabs.map(({ key, label, Icon }) => {
        const active = key === activeTab
        return (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 flex flex-col items-center justify-center gap-1 pt-2 active:opacity-60"
          >
            <span className="relative">
              <Icon
                size={26}
                strokeWidth={active ? 2.4 : 2}
                style={{ color: active ? ACTIVE : '#9A9AA0' }}
                fill={active ? ACTIVE : 'none'}
                fillOpacity={active ? 0.14 : 0}
              />
              {key === 'me' && showMeDot && (
                <span className="absolute -top-0.5 -right-1.5 w-[9px] h-[9px] rounded-full bg-ios-red ring-2 ring-surface" />
              )}
            </span>
            <span
              className={cn('text-[10px] font-medium tracking-tight')}
              style={{ color: active ? ACTIVE : '#9A9AA0' }}
            >
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
