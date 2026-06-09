import { RotateCcw, Trash2 } from 'lucide-react'
import type { MemoryItem, OverlayScreenProps } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { Page } from '../../components/Page'
import { EmptyState } from '../../components/ui/atoms'

export function MemoryTrashScreen({ onBack }: OverlayScreenProps) {
  const t = useT()
  const memories = useStore((s) => s.memories)
  const restoreMemory = useStore((s) => s.restoreMemory)
  const purgeMemory = useStore((s) => s.purgeMemory)
  const askConfirm = useStore((s) => s.askConfirm)
  const toast = useStore((s) => s.toast)

  const deleted = memories
    .filter((m) => m.deletedAt)
    .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0))

  const restore = (m: MemoryItem) => {
    restoreMemory(m.id)
    toast(t('memory.restored'), 'success')
  }
  const purge = (m: MemoryItem) =>
    askConfirm({
      title: t('memory.purgeConfirm'),
      message: t('memory.purgeBody'),
      confirmText: t('memory.purge'),
      danger: true,
      onConfirm: () => {
        purgeMemory(m.id)
        toast(t('memory.purged'), 'success')
      },
    })

  return (
    <Page title={t('memory.trash.title')} onBack={onBack} bg="group">
      {deleted.length === 0 ? (
        <EmptyState icon={<Trash2 size={30} />} title={t('memory.trash.empty')} subtitle={t('memory.trash.emptyHint')} />
      ) : (
        <>
          <div className="px-5 pt-1 pb-2 text-[13px] text-label-secondary leading-snug">{t('memory.trash.hint')}</div>
          <div className="px-4">
            <div className="list-group divide-y divide-divider">
              {deleted.map((m) => (
                <div key={m.id} className="flex items-center gap-2 px-4 py-3.5">
                  <p className="flex-1 text-[15px] leading-relaxed text-label-secondary">{m.text}</p>
                  <button
                    onClick={() => restore(m)}
                    className="px-3 h-8 rounded-full bg-brand-primary/10 text-brand-violet text-[13px] font-semibold active:opacity-60 shrink-0 flex items-center gap-1"
                  >
                    <RotateCcw size={14} />
                    {t('memory.restore')}
                  </button>
                  <button
                    onClick={() => purge(m)}
                    aria-label="purge"
                    className="w-8 h-8 flex items-center justify-center rounded-full text-label-tertiary active:bg-black/[0.05] shrink-0"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Page>
  )
}
