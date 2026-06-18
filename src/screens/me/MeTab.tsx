import { useState } from 'react'
import { Brain, Check, ChevronRight, Globe, LogOut, Moon, Plug, RefreshCw, Smartphone, Sparkles, Wand2 } from 'lucide-react'
import type { Lang, ThemeMode } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { Page } from '../../components/Page'
import { Bell } from '../../components/Bell'
import { Avatar, Row, Section } from '../../components/ui/atoms'
import { ActionSheet } from '../../components/ui/Sheet'
import { CURRENT_VERSION, updateAvailable } from '../../lib/version'

export function MeTab() {
  const t = useT()
  const account = useStore((s) => s.account)
  const lang = useStore((s) => s.lang)
  const setLang = useStore((s) => s.setLang)
  const resetDemo = useStore((s) => s.resetDemo)
  const logout = useStore((s) => s.logout)
  const askConfirm = useStore((s) => s.askConfirm)
  const toast = useStore((s) => s.toast)
  const push = useStore((s) => s.push)
  const themeMode = useStore((s) => s.themeMode)
  const setThemeMode = useStore((s) => s.setThemeMode)
  const updateDismissed = useStore((s) => s.updateDismissed)
  const [langOpen, setLangOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const showVersionHint = updateAvailable && !updateDismissed

  const switchLang = (l: Lang) => {
    setLang(l)
    setTimeout(() => toast(l === 'zh' ? '已切换为简体中文' : 'Switched to English', 'success'), 0)
  }

  const THEME_LABELS: Record<ThemeMode, string> = {
    light: t('me.theme.light'),
    dark: t('me.theme.dark'),
    system: t('me.theme.system'),
  }

  return (
    <Page title={t('me.title')} right={<Bell />} bottomTabInset>
      {/* account header → personal info center */}
      <div className="px-4 pt-1">
        <button
          onClick={() => push('profile')}
          className="w-full card flex items-center gap-4 px-4 py-4 text-left active:bg-black/[0.02]"
        >
          <Avatar src={account.avatarImage} gradient={account.avatarGradient} name={account.name} size={60} shape="circle" />
          <div className="min-w-0 flex-1">
            <div className="text-[20px] font-bold truncate">{account.name}</div>
            <div className="text-[14px] text-label-secondary truncate">{account.email}</div>
          </div>
          <ChevronRight size={20} className="text-ios-gray3 shrink-0" />
        </button>
      </div>

      {/* Workmate config */}
      <Section title={t('me.workmate')} noUppercase className="mt-5">
        <Row icon={<Sparkles size={17} />} iconBg="#A855F7" title={t('me.persona')} chevron onClick={() => push('persona')} />
        <Row icon={<Plug size={17} />} iconBg="#5B7CFA" title={t('me.mcp')} chevron onClick={() => push('mcpList')} />
        <Row icon={<Brain size={17} />} iconBg="#6D6AF0" title={t('me.memory')} chevron onClick={() => push('memoryList')} />
        <Row icon={<Wand2 size={17} />} iconBg="#34C759" title={t('me.skill')} chevron onClick={() => push('skillList')} />
      </Section>

      {/* preferences */}
      <Section title={t('me.preferences')} className="mt-5">
        <Row
          icon={<Globe size={17} />}
          iconBg="#5B7CFA"
          title={t('me.language')}
          value={lang === 'zh' ? t('me.language.zh') : t('me.language.en')}
          chevron
          onClick={() => setLangOpen(true)}
        />
        <Row
          icon={<Moon size={17} />}
          iconBg="#6D6AF0"
          title={t('me.theme')}
          value={THEME_LABELS[themeMode]}
          chevron
          onClick={() => setThemeOpen(true)}
        />
      </Section>

      {/* support */}
      <Section title={t('me.support')} className="mt-5">
        <Row
          icon={<Smartphone size={17} />}
          iconBg="#8E8E93"
          title={t('me.version')}
          value={showVersionHint ? undefined : CURRENT_VERSION}
          chevron
          onClick={() => push('about')}
          right={
            showVersionHint ? (
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="w-[7px] h-[7px] rounded-full bg-brand-primary" />
                <span className="text-[14px] text-brand-primary font-medium">{t('me.version.hint')}</span>
              </span>
            ) : undefined
          }
        />
        <Row
          icon={<RefreshCw size={17} />}
          iconBg="#FF9500"
          title={t('me.resetDemo')}
          chevron
          onClick={() =>
            askConfirm({
              title: t('me.resetConfirm'),
              message: t('me.resetBody'),
              confirmText: t('me.resetDemo'),
              danger: true,
              onConfirm: () => {
                resetDemo()
                toast(t('me.resetDone'), 'success')
              },
            })
          }
        />
      </Section>

      {/* logout */}
      <Section className="mt-5">
        <Row
          icon={<LogOut size={17} />}
          iconBg="#FF3B30"
          title={t('me.logout')}
          danger
          onClick={() =>
            askConfirm({
              title: t('me.logoutConfirm'),
              message: t('me.logoutBody'),
              confirmText: t('me.logout'),
              danger: true,
              onConfirm: logout,
            })
          }
        />
      </Section>

      <ActionSheet
        open={langOpen}
        onClose={() => setLangOpen(false)}
        title={t('me.language')}
        cancelLabel={t('common.cancel')}
        actions={[
          { label: t('me.language.zh'), icon: lang === 'zh' ? <Check size={20} /> : undefined, onClick: () => switchLang('zh') },
          { label: t('me.language.en'), icon: lang === 'en' ? <Check size={20} /> : undefined, onClick: () => switchLang('en') },
        ]}
      />

      <ActionSheet
        open={themeOpen}
        onClose={() => setThemeOpen(false)}
        title={t('me.theme')}
        cancelLabel={t('common.cancel')}
        actions={(['light', 'dark', 'system'] as ThemeMode[]).map((m) => ({
          label: THEME_LABELS[m],
          icon: themeMode === m ? <Check size={20} /> : undefined,
          onClick: () => setThemeMode(m),
        }))}
      />
    </Page>
  )
}
