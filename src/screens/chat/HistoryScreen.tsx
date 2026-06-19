import { useState } from 'react'
import { Folder, FolderPlus, MessageSquare, MoreHorizontal, SquarePen } from 'lucide-react'
import type { Conversation, OverlayScreenProps, Project } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useLang, useT } from '../../i18n'
import { Page } from '../../components/Page'
import { IconButton, EmptyState } from '../../components/ui/atoms'
import { HistorySheet, type HistoryTarget } from '../../components/chat/HistorySheet'
import { useLongPress } from '../../lib/useLongPress'
import { formatRelative } from '../../lib/time'

export function HistoryScreen({ onBack }: OverlayScreenProps) {
  const t = useT()
  const conversations = useStore((s) => s.conversations)
  const projects = useStore((s) => s.projects)
  const newConversation = useStore((s) => s.newConversation)
  const setActive = useStore((s) => s.setActiveConversation)

  const [sheet, setSheet] = useState<HistoryTarget>(null)

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)
  const ungrouped = sorted.filter((c) => !c.projectId)

  const select = (id: string) => {
    setActive(id)
    onBack()
  }
  const manageConv = (id: string) => setSheet({ kind: 'conv', id })
  const manageProj = (id: string) => setSheet({ kind: 'proj', id })

  return (
    <Page
      title={t('chat.history.title')}
      onBack={onBack}
      bg="group"
      right={
        <>
          <IconButton onClick={() => setSheet({ kind: 'newProj' })} ariaLabel="new project">
            <FolderPlus size={21} />
          </IconButton>
          <IconButton
            onClick={() => {
              newConversation()
              onBack()
            }}
            ariaLabel="new chat"
          >
            <SquarePen size={21} />
          </IconButton>
        </>
      }
    >
      {conversations.length === 0 && projects.length === 0 ? (
        <div className="flex items-center justify-center" style={{ minHeight: 600 }}>
          <EmptyState
            icon={<MessageSquare size={30} />}
            title={t('chat.history.empty')}
            subtitle={t('chat.history.emptyHint')}
          />
        </div>
      ) : (
        <div className="pt-1">
          {projects.map((p) => (
            <ProjectGroup
              key={p.id}
              p={p}
              items={sorted.filter((c) => c.projectId === p.id)}
              onSelect={select}
              onManageConv={manageConv}
              onManageProject={manageProj}
            />
          ))}
          {ungrouped.length > 0 && (
            <div className="px-4 mb-4">
              <div className="flex items-center gap-1.5 px-1 pb-1.5 text-[14px] font-medium text-label-secondary">
                {t('chat.history.ungrouped')}
              </div>
              <div className="list-group divide-y divide-divider">
                {ungrouped.map((c) => (
                  <ConvRow key={c.id} c={c} onSelect={select} onManage={manageConv} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <HistorySheet target={sheet} onClose={() => setSheet(null)} />
    </Page>
  )
}

function ConvRow({
  c,
  onSelect,
  onManage,
}: {
  c: Conversation
  onSelect: (id: string) => void
  onManage: (id: string) => void
}) {
  const t = useT()
  const lang = useLang()
  const last = c.messages[c.messages.length - 1]
  const press = useLongPress(() => onManage(c.id), { onClick: () => onSelect(c.id) })

  return (
    <div className="flex items-center active:bg-black/[0.04]">
      <button
        {...press}
        className="flex items-center gap-3 flex-1 min-w-0 px-4 py-2.5 text-left select-none [-webkit-touch-callout:none]"
      >
        <div className="w-8 h-8 rounded-[9px] bg-ios-gray6 flex items-center justify-center shrink-0">
          <MessageSquare size={16} className="text-label-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-medium truncate">{c.title}</div>
          <div className="text-[12px] text-label-secondary truncate">
            {last ? last.text.slice(0, 30) || '—' : t('common.empty')} · {formatRelative(c.updatedAt, lang)}
          </div>
        </div>
      </button>
      <button
        onClick={() => onManage(c.id)}
        className="px-3 py-3 text-label-tertiary active:opacity-50"
        aria-label="manage conversation"
      >
        <MoreHorizontal size={18} />
      </button>
    </div>
  )
}

function ProjectGroup({
  p,
  items,
  onSelect,
  onManageConv,
  onManageProject,
}: {
  p: Project
  items: Conversation[]
  onSelect: (id: string) => void
  onManageConv: (id: string) => void
  onManageProject: (id: string) => void
}) {
  const t = useT()
  const press = useLongPress(() => onManageProject(p.id))

  return (
    <div className="px-4 mb-4">
      <div
        {...press}
        className="flex items-center px-1 pb-1.5 select-none [-webkit-touch-callout:none] rounded-lg active:bg-black/[0.03]"
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0 text-[14px] font-medium text-label-secondary">
          <Folder size={14} className="text-label-tertiary shrink-0" />
          <span className="truncate">{p.name}</span>
          <span className="text-label-tertiary shrink-0">· {items.length}</span>
        </div>
        <button
          onClick={() => onManageProject(p.id)}
          className="px-2 -mr-2 py-0.5 text-label-tertiary active:opacity-50"
          aria-label="manage project"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
      {items.length > 0 ? (
        <div className="list-group divide-y divide-divider">
          {items.map((c) => (
            <ConvRow key={c.id} c={c} onSelect={onSelect} onManage={onManageConv} />
          ))}
        </div>
      ) : (
        <div className="list-group px-4 py-3 text-[14px] text-label-tertiary">{t('chat.project.empty')}</div>
      )}
    </div>
  )
}
