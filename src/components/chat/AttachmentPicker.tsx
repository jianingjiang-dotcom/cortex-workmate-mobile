import { useState } from 'react'
import { Check } from 'lucide-react'
import type { Attachment } from '../../lib/types'
import { useT } from '../../i18n'
import { cn, formatBytes, uid } from '../../lib/util'
import { Sheet } from '../ui/Sheet'
import { EXT_COLOR, SAMPLE_FILES, SAMPLE_PHOTOS } from '../../data/attachments'

export function AttachmentPicker({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (atts: Attachment[]) => void
}) {
  const t = useT()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const close = () => {
    setSelected(new Set())
    onClose()
  }

  const add = () => {
    const atts: Attachment[] = []
    SAMPLE_PHOTOS.forEach((p) => {
      if (selected.has(p.id)) atts.push({ id: uid('att_'), kind: 'image', name: p.name, size: p.size, previewUrl: p.previewUrl })
    })
    SAMPLE_FILES.forEach((f) => {
      if (selected.has(f.id)) atts.push({ id: uid('att_'), kind: 'file', name: f.name, size: f.size, ext: f.ext })
    })
    if (atts.length) onAdd(atts)
    close()
  }

  const count = selected.size

  return (
    <Sheet
      open={open}
      onClose={close}
      title={t('chat.attach.title')}
      maxHeight="82%"
      footer={
        <button
          onClick={add}
          disabled={count === 0}
          className="w-full h-12 rounded-ios-lg text-white font-semibold text-[16px] press disabled:opacity-40 bg-brand-primary"
        >
          {count > 0 ? t('chat.attach.add', { n: count }) : t('chat.attach.addBtn')}
        </button>
      }
    >
      <div className="px-4 pb-2">
        {/* photos */}
        <div className="text-[14px] font-medium text-label-secondary px-1 pb-2">{t('chat.attach.photos')}</div>
        <div className="grid grid-cols-3 gap-2">
          {SAMPLE_PHOTOS.map((p) => {
            const on = selected.has(p.id)
            return (
              <button key={p.id} onClick={() => toggle(p.id)} className="relative aspect-square rounded-ios-lg overflow-hidden active:opacity-90">
                <img src={p.previewUrl} className="w-full h-full object-cover" alt={p.name} />
                {on && <div className="absolute inset-0 rounded-ios-lg ring-[3px] ring-inset ring-ios-purple" />}
                <div
                  className={cn(
                    'absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center border',
                    on ? 'bg-ios-purple border-ios-purple' : 'bg-black/25 border-white/80',
                  )}
                >
                  {on && <Check size={13} className="text-white" />}
                </div>
              </button>
            )
          })}
        </div>

        {/* files */}
        <div className="text-[14px] font-medium text-label-secondary px-1 pt-4 pb-2">{t('chat.attach.files')}</div>
        <div className="list-group divide-y divide-divider">
          {SAMPLE_FILES.map((f) => {
            const on = selected.has(f.id)
            return (
              <button key={f.id} onClick={() => toggle(f.id)} className="w-full flex items-center gap-3 px-3.5 py-2.5 active:bg-black/[0.04]">
                <div
                  className="w-9 h-9 rounded-[8px] flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ background: EXT_COLOR[f.ext] || '#8E8E93' }}
                >
                  {f.ext.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[16px] font-medium truncate">{f.name}</div>
                  <div className="text-[12px] text-label-secondary">{formatBytes(f.size)}</div>
                </div>
                <div
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center border shrink-0',
                    on ? 'bg-ios-purple border-ios-purple' : 'border-ios-gray3',
                  )}
                >
                  {on && <Check size={13} className="text-white" />}
                </div>
              </button>
            )
          })}
        </div>

      </div>
    </Sheet>
  )
}
