import { useRef, useState } from 'react'
import { Camera, Check } from 'lucide-react'
import type { OverlayScreenProps } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { Page } from '../../components/Page'
import { Avatar } from '../../components/ui/atoms'
import { ActionSheet, Sheet } from '../../components/ui/Sheet'
import { VendorLogo } from '../../components/chat/parts'
import { cn } from '../../lib/util'

function SparkleIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="white">
      <path d="M12 2l1.8 5.5L19.5 9l-5.7 1.5L12 16l-1.8-5.5L4.5 9l5.7-1.5L12 2z" />
    </svg>
  )
}

// Read an image file, downscale to a square thumbnail data URL (keeps localStorage small).
function resizeImageToDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('no ctx'))
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('img load'))
    }
    img.src = url
  })
}

export function PersonaScreen({ onBack }: OverlayScreenProps) {
  const t = useT()
  const persona = useStore((s) => s.persona)
  const models = useStore((s) => s.models)
  const setPersona = useStore((s) => s.setPersona)
  const toast = useStore((s) => s.toast)
  const askConfirm = useStore((s) => s.askConfirm)

  const [name, setName] = useState(persona.name)
  const [description, setDescription] = useState(persona.description)
  const [avatarImage, setAvatarImage] = useState<string | undefined>(persona.avatarImage)
  const [systemPrompt, setSystemPrompt] = useState(persona.systemPrompt)
  const [modelId, setModelId] = useState(persona.modelId)
  const [modelOpen, setModelOpen] = useState(false)
  const [avatarSheet, setAvatarSheet] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const model = models.find((m) => m.id === modelId)

  const dirty =
    // a blank name isn't a change (save falls back to the old name), so it must not enable Save
    (name.trim() !== '' && name.trim() !== persona.name) ||
    description !== persona.description ||
    systemPrompt !== persona.systemPrompt ||
    modelId !== persona.modelId ||
    (avatarImage ?? '') !== (persona.avatarImage ?? '')

  const handleBack = () => {
    if (!dirty) return onBack()
    askConfirm({
      title: t('persona.unsavedTitle'),
      message: t('persona.unsavedBody'),
      confirmText: t('persona.discard'),
      cancelText: t('common.cancel'),
      danger: true,
      onConfirm: onBack,
    })
  }

  const save = () => {
    if (!dirty) return
    setPersona({ name: name.trim() || persona.name, description, avatarImage, systemPrompt, modelId })
    toast(t('persona.saved'), 'success')
    onBack()
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      setAvatarImage(await resizeImageToDataUrl(f))
    } catch {
      /* ignore */
    }
  }

  return (
    <Page
      onBack={handleBack}
      largeTitle={false}
      bg="group"
      right={
        <button
          onClick={save}
          disabled={!dirty}
          className={cn('text-[16px] font-semibold px-2', dirty ? 'text-ios-blue active:opacity-50' : 'text-label-tertiary')}
        >
          {t('common.save')}
        </button>
      }
    >
      {/* avatar (tap to upload) */}
      <div className="flex flex-col items-center pt-4 pb-6">
        <button onClick={() => setAvatarSheet(true)} className="relative active:opacity-90">
          <Avatar src={avatarImage} gradient={persona.avatarGradient} size={88} shape="circle" icon={<SparkleIcon />} />
          <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-ios-blue ring-2 ring-ios-gray6 flex items-center justify-center">
            <Camera size={14} className="text-white" />
          </div>
        </button>
      </div>

      <div className="px-4 space-y-5">
        <Field label={t('persona.name')}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('persona.name.ph')}
            className="w-full bg-transparent text-[16px] outline-none"
          />
        </Field>

        <Field label={t('persona.desc')}>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('persona.desc.ph')}
            className="w-full bg-transparent text-[16px] outline-none"
          />
        </Field>

        <Field label={t('persona.prompt')}>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder={t('persona.prompt.ph')}
            rows={6}
            className="w-full bg-transparent text-[16px] leading-relaxed outline-none resize-none"
          />
        </Field>

        <div>
          <div className="px-1 pb-1.5 text-[14px] font-medium text-label-secondary">{t('persona.model')}</div>
          <button
            onClick={() => setModelOpen(true)}
            className="w-full bg-surface rounded-ios-lg px-3.5 py-3 flex items-center gap-3 active:bg-ios-gray6"
          >
            {model && <VendorLogo vendor={model.vendor} size={34} />}
            <div className="flex-1 text-left">
              <div className="text-[16px] font-medium">{model?.name}</div>
              <div className="text-[12px] text-label-secondary">{model?.vendor}</div>
            </div>
            <svg width="8" height="14" viewBox="0 0 8 14" className="text-ios-gray3" fill="none">
              <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <ActionSheet
        open={avatarSheet}
        onClose={() => setAvatarSheet(false)}
        cancelLabel={t('common.cancel')}
        actions={[
          { label: avatarImage ? t('persona.changePhoto') : t('persona.uploadPhoto'), onClick: () => fileRef.current?.click() },
          ...(avatarImage
            ? [{ label: t('persona.removePhoto'), destructive: true, onClick: () => setAvatarImage(undefined) }]
            : []),
        ]}
      />

      <Sheet open={modelOpen} onClose={() => setModelOpen(false)} title={t('chat.model.title')}>
        <div className="px-4 space-y-2 pt-1">
          {models.map((m) => {
            const active = m.id === modelId
            return (
              <button
                key={m.id}
                onClick={() => {
                  setModelId(m.id)
                  setModelOpen(false)
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-3 rounded-ios-lg border text-left',
                  active ? 'border-ios-blue bg-ios-blue/[0.05]' : 'border-divider bg-surface',
                )}
              >
                <VendorLogo vendor={m.vendor} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="text-[16px] font-medium">{m.name}</div>
                  <div className="text-[12px] text-label-secondary">
                    {m.vendor}
                    {m.desc ? ` · ${m.desc}` : ''}
                  </div>
                </div>
                {active && <Check size={20} className="text-ios-blue" />}
              </button>
            )
          })}
        </div>
      </Sheet>
    </Page>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-1 pb-1.5 text-[14px] font-medium text-label-secondary">{label}</div>
      <div className="bg-surface rounded-ios-lg px-3.5 py-3">{children}</div>
    </div>
  )
}
