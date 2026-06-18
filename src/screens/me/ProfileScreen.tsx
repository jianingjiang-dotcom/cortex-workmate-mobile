import { useRef, useState } from 'react'
import { Camera, Copy } from 'lucide-react'
import type { OverlayScreenProps } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { Page } from '../../components/Page'
import { Avatar, Row, Section } from '../../components/ui/atoms'
import { ActionSheet } from '../../components/ui/Sheet'
import { cn, resizeImageToDataUrl } from '../../lib/util'

export function ProfileScreen({ onBack }: OverlayScreenProps) {
  const t = useT()
  const account = useStore((s) => s.account)
  const updateAccount = useStore((s) => s.updateAccount)
  const toast = useStore((s) => s.toast)
  const askConfirm = useStore((s) => s.askConfirm)

  const [name, setName] = useState(account.name)
  const [avatarImage, setAvatarImage] = useState<string | undefined>(account.avatarImage)
  const [avatarSheet, setAvatarSheet] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // a blank name is NOT a change (save() falls back to the old name), so it must not enable Save
  const dirty =
    (name.trim() !== '' && name.trim() !== account.name) || (avatarImage ?? '') !== (account.avatarImage ?? '')

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
    updateAccount({ name: name.trim() || account.name, avatarImage })
    toast(t('profile.saved'), 'neutral')
    onBack()
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      setAvatarImage(await resizeImageToDataUrl(f, 256))
    } catch {
      /* ignore */
    }
  }

  const copyId = () => {
    const p = navigator.clipboard?.writeText(account.id)
    if (p) p.then(() => toast(t('profile.idCopied'), 'neutral')).catch(() => toast(t('common.copyFailed'), 'error'))
    else toast(t('common.copyFailed'), 'error')
  }

  return (
    <Page
      title={t('profile.title')}
      onBack={handleBack}
      largeTitle={false}
      bg="group"
      right={
        <button
          onClick={save}
          disabled={!dirty}
          className={cn('text-[17px] font-semibold px-2', dirty ? 'text-ios-blue active:opacity-50' : 'text-label-tertiary')}
        >
          {t('common.save')}
        </button>
      }
    >
      {/* avatar (tap to upload / change / remove) */}
      <div className="flex flex-col items-center pt-4 pb-5">
        <button onClick={() => setAvatarSheet(true)} className="relative active:opacity-90" aria-label={t('profile.avatar')}>
          <Avatar src={avatarImage} gradient={account.avatarGradient} name={name} size={92} shape="circle" />
          <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-ios-blue ring-2 ring-grouped flex items-center justify-center">
            <Camera size={14} className="text-white" />
          </div>
        </button>
      </div>

      {/* name (editable) */}
      <div className="px-4">
        <div className="px-1 pb-1.5 text-[13px] font-medium text-label-secondary">{t('profile.name')}</div>
        <div className="bg-surface rounded-ios-lg px-3.5 py-3 border border-divider">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('profile.name')}
            className="w-full bg-transparent text-[16px] outline-none"
          />
        </div>
      </div>

      {/* account info (read-only) */}
      <Section title={t('profile.account')} className="mt-5">
        <Row title={t('profile.id')} value={account.id} onClick={copyId} right={<Copy size={15} className="text-ios-gray3 shrink-0" />} />
        <Row title={t('profile.email')} value={account.email} />
      </Section>

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
    </Page>
  )
}
