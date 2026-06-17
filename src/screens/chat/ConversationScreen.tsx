import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import type { OverlayScreenProps } from '../../lib/types'
import { BackButton } from '../../components/Page'
import { ChatThread } from '../../components/chat/ChatThread'
import { SourceBanner } from '../../components/chat/SourceBanner'
import { Button, EmptyState } from '../../components/ui/atoms'
import { MessageSquare } from 'lucide-react'

export function ConversationScreen({ params, onBack }: OverlayScreenProps) {
  const convId = params?.id as string | undefined
  const conv = useStore((s) => s.conversations.find((c) => c.id === convId))
  const quoteRunInChat = useStore((s) => s.quoteRunInChat)
  const t = useT()

  if (!convId || !conv) {
    return (
      <div className="absolute inset-0 bg-surface">
        <div className="absolute top-[54px] left-0 right-0 z-30 h-[44px] flex items-center px-2">
          <BackButton onClick={onBack} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <EmptyState icon={<MessageSquare size={28} />} title={t('common.empty')} />
        </div>
      </div>
    )
  }

  // a scheduled-task run result is view-only (no composer) + a 引用提问 jump to Workmate
  const isTaskRun = !!(conv.sourceTaskId && conv.sourceRunId)

  return (
    <div className="absolute inset-0 bg-surface">
      <div className="absolute top-[54px] left-0 right-0 z-30 glass hairline-b h-[44px] flex items-center px-2">
        <div className="flex-1">
          <BackButton onClick={onBack} />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold truncate max-w-[60%] text-center">
          {conv.title}
        </div>
        <div className="flex-1" />
      </div>
      <ChatThread
        className="absolute top-[98px] inset-x-0 bottom-0"
        target={{ mode: 'normal', conversationId: convId }}
        mode="normal"
        bottomInset
        banner={<SourceBanner conversationId={convId} />}
        readOnly={isTaskRun}
        footer={
          isTaskRun ? (
            <div className="shrink-0 glass hairline-t px-4 pt-2.5 pb-[26px]">
              <Button full onClick={() => quoteRunInChat(conv.sourceTaskId!, conv.sourceRunId!)}>
                {t('tasks.run.quoteAsk')}
              </Button>
            </div>
          ) : undefined
        }
      />
    </div>
  )
}
