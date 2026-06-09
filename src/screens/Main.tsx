import { type ReactNode } from 'react'
import { useStore } from '../store/useStore'
import { TabBar } from '../components/TabBar'
import { cn } from '../lib/util'
import { ChatTab } from './chat/ChatTab'
import { AssistantTab } from './assistant/AssistantTab'
import { MeTab } from './me/MeTab'

function TabPane({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div className={cn('absolute inset-0', active ? 'z-10' : 'z-0 invisible pointer-events-none')}>
      {children}
    </div>
  )
}

export function Main() {
  const activeTab = useStore((s) => s.activeTab)
  return (
    <div className="absolute inset-0">
      <TabPane active={activeTab === 'chat'}>
        <ChatTab />
      </TabPane>
      <TabPane active={activeTab === 'assistant'}>
        <AssistantTab />
      </TabPane>
      <TabPane active={activeTab === 'me'}>
        <MeTab />
      </TabPane>
      <TabBar />
    </div>
  )
}
