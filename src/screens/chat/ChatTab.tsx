import { useEffect } from 'react'
import { Bookmark, PanelLeft, Search, Sparkles, SquarePen } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { Bell } from '../../components/Bell'
import { Button, IconButton, Segmented } from '../../components/ui/atoms'
import { ChatThread } from '../../components/chat/ChatThread'
import { AgentBar } from '../../components/chat/AgentBar'
import { SourceBanner } from '../../components/chat/SourceBanner'

export function ChatTab() {
  const t = useT()
  const mode = useStore((s) => s.chatMode)
  const setMode = useStore((s) => s.setChatMode)
  const conversations = useStore((s) => s.conversations)
  const activeId = useStore((s) => s.activeConversationId)
  const setActive = useStore((s) => s.setActiveConversation)
  const newConversation = useStore((s) => s.newConversation)
  const push = useStore((s) => s.push)

  useEffect(() => {
    if (mode === 'normal' && !activeId && conversations.length) {
      const recent = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)[0]
      setActive(recent.id)
    }
  }, [mode, activeId, conversations, setActive])

  const activeConv = conversations.find((c) => c.id === activeId)

  return (
    <div className="absolute inset-0 bg-surface">
      {/* header */}
      <div className="absolute top-[54px] left-0 right-0 z-30 glass hairline-b">
        <div className="h-[44px] flex items-center px-2 relative">
          <div className="flex items-center w-[72px]">
            {mode === 'normal' && (
              <IconButton onClick={() => push('history')} ariaLabel="history">
                <PanelLeft size={22} />
              </IconButton>
            )}
            {mode === 'workmate' && (
              <IconButton onClick={() => push('chatFavorites')} ariaLabel="favorites">
                <Bookmark size={21} />
              </IconButton>
            )}
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 w-[214px]">
            <Segmented
              layoutId="chat-mode"
              options={[
                { value: 'workmate', label: t('chat.mode.workmate') },
                { value: 'normal', label: t('chat.mode.normal') },
              ]}
              value={mode}
              onChange={(v) => setMode(v)}
            />
          </div>
          <div className="flex items-center justify-end ml-auto">
            {mode === 'workmate' && (
              <IconButton onClick={() => push('chatSearch')} ariaLabel="search">
                <Search size={21} />
              </IconButton>
            )}
            <Bell />
          </div>
        </div>
      </div>

      {/* body */}
      {mode === 'workmate' ? (
        <ChatThread
          className="absolute top-[98px] bottom-[83px] left-0 right-0"
          target={{ mode: 'workmate' }}
          mode="workmate"
          allowLoadEarlier
        />
      ) : activeConv ? (
        <ChatThread
          key={activeConv.id}
          className="absolute top-[98px] bottom-[83px] left-0 right-0"
          target={{ mode: 'normal', conversationId: activeConv.id }}
          mode="normal"
          banner={activeConv.sourceTaskId ? <SourceBanner conversationId={activeConv.id} /> : undefined}
          accessory={<AgentBar />}
        />
      ) : (
        <div className="absolute top-[98px] bottom-[83px] left-0 right-0 flex flex-col items-center justify-center text-center px-10">
          <div className="w-[68px] h-[68px] rounded-[20px] bg-brand-gradient flex items-center justify-center text-white mb-4">
            <Sparkles size={30} />
          </div>
          <div className="text-[17px] font-semibold">{t('chat.normal.greetingTitle')}</div>
          <div className="text-[14px] text-label-secondary mt-1.5 leading-relaxed max-w-[260px]">
            {t('chat.normal.greetingBody')}
          </div>
          <div className="flex gap-2.5 mt-5">
            <Button variant="secondary" size="sm" onClick={() => push('history')}>
              {t('chat.history')}
            </Button>
            <Button size="sm" onClick={() => newConversation()}>
              <SquarePen size={16} />
              {t('chat.history.newChat')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
