import { useState, type ReactNode } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Folder,
  FolderMinus,
  FolderPlus,
  MessageSquare,
  Pencil,
  Trash2,
} from 'lucide-react'
import type { Project } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { Sheet } from '../ui/Sheet'
import { cn } from '../../lib/util'

export type HistoryTarget =
  | { kind: 'conv'; id: string }
  | { kind: 'proj'; id: string }
  | { kind: 'newProj' }
  | null

type View = 'menu' | 'rename' | 'move' | 'delete'

const TINT = { blue: '#007AFF', violet: '#A06AF0', red: '#FF3B30', gray: '#8E8E93' }

export function HistorySheet({ target, onClose }: { target: HistoryTarget; onClose: () => void }) {
  const t = useT()
  const conversations = useStore((s) => s.conversations)
  const projects = useStore((s) => s.projects)
  const renameConversation = useStore((s) => s.renameConversation)
  const deleteConversation = useStore((s) => s.deleteConversation)
  const moveConversation = useStore((s) => s.moveConversation)
  const newProject = useStore((s) => s.newProject)
  const renameProject = useStore((s) => s.renameProject)
  const deleteProject = useStore((s) => s.deleteProject)
  const toast = useStore((s) => s.toast)

  const [view, setView] = useState<View>('menu')
  const [text, setText] = useState('')
  const [delChoice, setDelChoice] = useState<'keep' | 'all'>('keep')
  const [newName, setNewName] = useState('')
  const [showNew, setShowNew] = useState(false)

  const conv = target?.kind === 'conv' ? conversations.find((c) => c.id === target.id) : undefined
  const proj = target?.kind === 'proj' ? projects.find((p) => p.id === target.id) : undefined
  const projCount = proj ? conversations.filter((c) => c.projectId === proj.id).length : 0

  // reset transient state when a different target opens (React "adjust state on prop change" pattern)
  const key = target ? `${target.kind}:${'id' in target ? target.id : 'new'}` : '∅'
  const [boundKey, setBoundKey] = useState('∅')
  if (key !== boundKey) {
    setBoundKey(key)
    setView('menu')
    setDelChoice('keep')
    setShowNew(false)
    setNewName('')
    setText(conv?.title ?? proj?.name ?? '')
  }

  const projectName = (id?: string) =>
    id ? (projects.find((p) => p.id === id)?.name ?? t('chat.history.ungrouped')) : t('chat.history.ungrouped')

  return (
    <Sheet open={!!target} onClose={onClose} maxHeight="84%">
      <div className="px-4 pb-2">
        {/* ---- New project ---- */}
        {target?.kind === 'newProj' && (
          <InputBlock
            title={t('chat.history.newProject')}
            placeholder={t('chat.project.name.ph')}
            value={text}
            onChange={setText}
            confirm={t('common.save')}
            onConfirm={() => {
              if (text.trim()) {
                newProject(text.trim())
                toast(t('chat.project.created'), 'success')
              }
              onClose()
            }}
          />
        )}

        {/* ---- Conversation ---- */}
        {conv && view === 'menu' && (
          <>
            <ItemHeader icon={<MessageSquare size={18} />} tint={TINT.gray} title={conv.title} sub={conv.messages[conv.messages.length - 1]?.text.slice(0, 34) || t('common.empty')} />
            <div className="list-group divide-y divide-divider mt-4">
              <ActionRow icon={<Pencil size={15} />} tint={TINT.blue} label={t('chat.session.rename')} onClick={() => { setText(conv.title); setView('rename') }} />
              <ActionRow icon={<Folder size={15} />} tint={TINT.violet} label={t('chat.session.moveTo')} value={projectName(conv.projectId)} onClick={() => setView('move')} />
              <ActionRow icon={<Trash2 size={15} />} tint={TINT.red} danger chevron={false} label={t('common.delete')} onClick={() => setView('delete')} />
            </div>
          </>
        )}
        {conv && view === 'rename' && (
          <InputBlock
            title={t('chat.session.rename')}
            onBack={() => setView('menu')}
            value={text}
            onChange={setText}
            confirm={t('common.save')}
            onConfirm={() => {
              if (text.trim()) renameConversation(conv.id, text.trim())
              toast(t('common.saved'), 'success')
              onClose()
            }}
          />
        )}
        {conv && view === 'move' && (
          <>
            <HeaderBar title={t('chat.session.moveTo')} onBack={() => setView('menu')} />
            <div className="list-group divide-y divide-divider mt-3">
              <SelectRow icon={<FolderMinus size={15} />} tint={TINT.gray} label={t('chat.session.moveTo.none')} selected={!conv.projectId} onClick={() => { moveConversation(conv.id, undefined); toast(t('chat.session.moved'), 'success'); onClose() }} />
              {projects.map((p) => (
                <SelectRow key={p.id} icon={<Folder size={15} />} tint={TINT.violet} label={p.name} selected={conv.projectId === p.id} onClick={() => { moveConversation(conv.id, p.id); toast(t('chat.session.moved'), 'success'); onClose() }} />
              ))}
            </div>
            {showNew ? (
              <div className="flex gap-2 mt-3">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t('chat.project.name.ph')}
                  onKeyDown={(e) => e.key === 'Enter' && newName.trim() && (moveConversation(conv.id, newProject(newName.trim())), toast(t('chat.session.moved'), 'success'), onClose())}
                  className="flex-1 h-11 px-3.5 rounded-ios bg-ios-gray6 text-[15px] outline-none"
                />
                <button
                  disabled={!newName.trim()}
                  onClick={() => { const id = newProject(newName.trim()); moveConversation(conv.id, id); toast(t('chat.session.moved'), 'success'); onClose() }}
                  className="px-4 rounded-ios-lg text-white font-semibold text-[15px] bg-brand-primary disabled:opacity-40 press"
                >
                  {t('common.done')}
                </button>
              </div>
            ) : (
              <button onClick={() => setShowNew(true)} className="w-full flex items-center gap-3 px-4 py-3 mt-3 active:opacity-60">
                <span className="w-[29px] h-[29px] rounded-[8px] bg-ios-blue/10 flex items-center justify-center">
                  <FolderPlus size={15} className="text-ios-blue" />
                </span>
                <span className="text-[16px] text-ios-blue">{t('chat.project.newAndMove')}</span>
              </button>
            )}
          </>
        )}
        {conv && view === 'delete' && (
          <ConfirmBlock
            onBack={() => setView('menu')}
            title={t('chat.session.deleteConfirm')}
            body={t('chat.session.deleteBody')}
            confirm={t('common.delete')}
            onConfirm={() => { deleteConversation(conv.id); toast(t('chat.session.deleted')); onClose() }}
          />
        )}

        {/* ---- Project ---- */}
        {proj && view === 'menu' && (
          <>
            <ItemHeader icon={<Folder size={18} />} tint={TINT.violet} title={proj.name} sub={t('chat.session.count', { n: projCount })} />
            <div className="list-group divide-y divide-divider mt-4">
              <ActionRow icon={<Pencil size={15} />} tint={TINT.blue} label={t('chat.project.rename')} onClick={() => { setText(proj.name); setView('rename') }} />
              <ActionRow icon={<Trash2 size={15} />} tint={TINT.red} danger chevron={false} label={t('chat.project.delete')} onClick={() => setView('delete')} />
            </div>
          </>
        )}
        {proj && view === 'rename' && (
          <InputBlock
            title={t('chat.project.rename')}
            onBack={() => setView('menu')}
            value={text}
            onChange={setText}
            confirm={t('common.save')}
            onConfirm={() => {
              if (text.trim()) renameProject(proj.id, text.trim())
              toast(t('chat.project.renamed'), 'success')
              onClose()
            }}
          />
        )}
        {proj && view === 'delete' && (
          <ProjectDeleteBlock
            proj={proj}
            count={projCount}
            choice={delChoice}
            setChoice={setDelChoice}
            onBack={() => setView('menu')}
            onConfirm={() => { deleteProject(proj.id, delChoice === 'all'); toast(t('chat.project.deleted')); onClose() }}
          />
        )}
      </div>
    </Sheet>
  )
}

// ---- building blocks -------------------------------------------------------

function ItemHeader({ icon, tint, title, sub }: { icon: ReactNode; tint: string; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 px-1 pt-1">
      <span className="w-10 h-10 rounded-[11px] flex items-center justify-center text-white shrink-0" style={{ background: tint }}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[16px] font-semibold truncate">{title}</div>
        {sub && <div className="text-[12px] text-label-secondary truncate">{sub}</div>}
      </div>
    </div>
  )
}

function HeaderBar({ title, onBack }: { title: string; onBack?: () => void }) {
  const t = useT()
  return (
    <div className="relative h-7 flex items-center justify-center">
      {onBack && (
        <button onClick={onBack} className="absolute left-0 flex items-center text-ios-blue active:opacity-50">
          <ChevronLeft size={22} />
          <span className="text-[15px] -ml-1">{t('common.back')}</span>
        </button>
      )}
      <span className="text-[16px] font-semibold">{title}</span>
    </div>
  )
}

function ActionRow({
  icon,
  tint,
  label,
  value,
  onClick,
  danger,
  chevron = true,
}: {
  icon: ReactNode
  tint: string
  label: string
  value?: string
  onClick: () => void
  danger?: boolean
  chevron?: boolean
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 active:bg-black/[0.04]">
      <span className="w-[29px] h-[29px] rounded-[8px] flex items-center justify-center text-white shrink-0" style={{ background: tint }}>
        {icon}
      </span>
      <span className={cn('flex-1 text-left text-[16px]', danger && 'text-ios-red')}>{label}</span>
      {value && <span className="text-[14px] text-label-secondary max-w-[42%] truncate">{value}</span>}
      {chevron && <ChevronRight size={16} className="text-ios-gray3 shrink-0" />}
    </button>
  )
}

function SelectRow({
  icon,
  tint,
  label,
  desc,
  selected,
  onClick,
}: {
  icon: ReactNode
  tint: string
  label: string
  desc?: string
  selected?: boolean
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 active:bg-black/[0.04]">
      <span className="w-[29px] h-[29px] rounded-[8px] flex items-center justify-center text-white shrink-0" style={{ background: tint }}>
        {icon}
      </span>
      <div className="flex-1 text-left min-w-0">
        <div className="text-[16px] truncate">{label}</div>
        {desc && <div className="text-[12px] text-label-secondary truncate">{desc}</div>}
      </div>
      {selected ? <Check size={18} className="text-ios-blue shrink-0" /> : <span className="w-[18px] shrink-0" />}
    </button>
  )
}

function InputBlock({
  title,
  onBack,
  value,
  onChange,
  placeholder,
  confirm,
  onConfirm,
}: {
  title: string
  onBack?: () => void
  value: string
  onChange: (v: string) => void
  placeholder?: string
  confirm: string
  onConfirm: () => void
}) {
  return (
    <div className="pt-1">
      <HeaderBar title={title} onBack={onBack} />
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => e.key === 'Enter' && value.trim() && onConfirm()}
        className="w-full h-11 px-3.5 rounded-ios bg-ios-gray6 text-[16px] outline-none mt-4"
      />
      <button
        onClick={onConfirm}
        disabled={!value.trim()}
        className="w-full h-12 rounded-ios-lg text-white font-semibold text-[16px] mt-3 bg-brand-primary disabled:opacity-40 press"
      >
        {confirm}
      </button>
    </div>
  )
}

function ConfirmBlock({
  onBack,
  title,
  body,
  confirm,
  onConfirm,
}: {
  onBack: () => void
  title: string
  body: string
  confirm: string
  onConfirm: () => void
}) {
  const t = useT()
  return (
    <div className="pt-1">
      <HeaderBar title={confirm} onBack={onBack} />
      <div className="flex flex-col items-center text-center pt-4 pb-1">
        <div className="w-12 h-12 rounded-full bg-ios-red/10 flex items-center justify-center mb-3">
          <Trash2 size={22} className="text-ios-red" />
        </div>
        <div className="text-[16px] font-semibold">{title}</div>
        <div className="text-[13px] text-label-secondary mt-1 leading-snug px-4">{body}</div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 mt-4">
        <button onClick={onBack} className="h-12 rounded-ios-lg bg-ios-gray6 font-semibold text-[16px]">
          {t('common.cancel')}
        </button>
        <button onClick={onConfirm} className="h-12 rounded-ios-lg bg-ios-red text-white font-semibold text-[16px] press">
          {confirm}
        </button>
      </div>
    </div>
  )
}

function ProjectDeleteBlock({
  proj,
  count,
  choice,
  setChoice,
  onBack,
  onConfirm,
}: {
  proj: Project
  count: number
  choice: 'keep' | 'all'
  setChoice: (c: 'keep' | 'all') => void
  onBack: () => void
  onConfirm: () => void
}) {
  const t = useT()
  return (
    <div className="pt-1">
      <HeaderBar title={t('chat.project.delete')} onBack={onBack} />
      <div className="flex flex-col items-center text-center pt-4 pb-1">
        <div className="w-12 h-12 rounded-full bg-ios-red/10 flex items-center justify-center mb-3">
          <Trash2 size={22} className="text-ios-red" />
        </div>
        <div className="text-[16px] font-semibold">{t('chat.project.deleteTitle', { name: proj.name })}</div>
      </div>
      {count > 0 && (
        <>
          <div className="text-[13px] text-label-secondary px-1 pt-2 pb-1.5">{t('chat.project.deleteQuestion')}</div>
          <div className="list-group divide-y divide-divider">
            <SelectRow icon={<FolderMinus size={15} />} tint={TINT.gray} label={t('chat.project.keepChats')} desc={t('chat.project.keepChatsDesc')} selected={choice === 'keep'} onClick={() => setChoice('keep')} />
            <SelectRow icon={<Trash2 size={15} />} tint={TINT.red} label={t('chat.project.deleteChats')} desc={t('chat.project.deleteChatsDesc', { n: count })} selected={choice === 'all'} onClick={() => setChoice('all')} />
          </div>
        </>
      )}
      <div className="grid grid-cols-2 gap-2.5 mt-4">
        <button onClick={onBack} className="h-12 rounded-ios-lg bg-ios-gray6 font-semibold text-[16px]">
          {t('common.cancel')}
        </button>
        <button onClick={onConfirm} className="h-12 rounded-ios-lg bg-ios-red text-white font-semibold text-[16px] press">
          {t('chat.project.delete')}
        </button>
      </div>
    </div>
  )
}
