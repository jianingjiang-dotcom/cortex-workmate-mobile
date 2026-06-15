import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import type { OverlayScreenProps } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { Page } from '../../components/Page'
import { Button, Pill, Spinner } from '../../components/ui/atoms'
import { CHANGELOG_KEYS, CURRENT_VERSION, LATEST_VERSION, RELEASE_DATE, updateAvailable } from '../../lib/version'

// Version / check-for-update. Auto-checks on open (~1.2s mock), then either shows the
// available update (with a changelog + a jump-to-App-Store CTA) or "up to date". The
// update is never installed in-app — the CTA hands off to the App Store.
type Phase = 'checking' | 'update' | 'latest'

export function AboutScreen({ onBack }: OverlayScreenProps) {
  const t = useT()
  const toast = useStore((s) => s.toast)
  const dismissUpdate = useStore((s) => s.dismissUpdate)
  const [phase, setPhase] = useState<Phase>('checking')
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const runCheck = () => {
    setPhase('checking')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setPhase(updateAvailable ? 'update' : 'latest'), 1200)
  }

  useEffect(() => {
    // NOTE: merely viewing the screen does NOT clear the new-version marker — the user
    // must choose to update (the App Store CTA) for that. So we only run the check here.
    runCheck()
    return () => {
      if (timer.current) clearTimeout(timer.current) // cancel a check still in flight on unmount
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Page title={t('about.title')} largeTitle={false} onBack={onBack}>
      {/* app identity — always shown */}
      <div className="px-5 pt-4 flex flex-col items-center text-center">
        <img src="/cortex-logo.png" alt="Cortex" className="w-[84px] h-[84px] rounded-[20px] shadow-ios-lg" />
        <div className="text-[20px] font-bold mt-3">{t('about.appName')}</div>
        <div className="text-[14px] text-label-secondary mt-1">{t('about.currentVersion', { v: CURRENT_VERSION })}</div>
      </div>

      {phase === 'checking' && (
        <div className="flex flex-col items-center gap-3 mt-10 text-label-secondary">
          <Spinner size={22} />
          <div className="text-[15px]">{t('about.checking')}</div>
        </div>
      )}

      {phase === 'latest' && (
        <div className="flex flex-col items-center text-center mt-10 px-8">
          <div className="w-[56px] h-[56px] rounded-full bg-ios-green/10 flex items-center justify-center">
            <Check size={30} className="text-ios-green" strokeWidth={2.5} />
          </div>
          <div className="text-[17px] font-semibold mt-3">{t('about.upToDate')}</div>
          <div className="text-[14px] text-label-secondary mt-1">{t('about.upToDateBody', { v: CURRENT_VERSION })}</div>
          <button onClick={runCheck} className="mt-5 text-[15px] text-ios-blue font-medium active:opacity-60">
            {t('about.recheck')}
          </button>
        </div>
      )}

      {phase === 'update' && (
        <div className="px-4 mt-6">
          <div className="card px-4 py-4">
            <div className="flex items-center gap-2">
              <Pill color="brand">{t('about.newVersion', { v: LATEST_VERSION })}</Pill>
              <span className="text-[13px] text-label-tertiary">{t('about.releasedOn', { date: RELEASE_DATE })}</span>
            </div>
            <div className="text-[14px] font-semibold mt-3.5">{t('about.whatsNew')}</div>
            <ul className="mt-2 space-y-2">
              {CHANGELOG_KEYS.map((k) => (
                <li key={k} className="flex gap-2.5 text-[14px] text-label-primary leading-snug">
                  <span className="mt-[7px] w-[5px] h-[5px] rounded-full bg-ios-blue shrink-0" />
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5">
            <Button
              variant="primary"
              full
              size="lg"
              onClick={() => {
                dismissUpdate() // chose to update → clear the row + tab marker
                toast(t('about.opening'), 'info')
              }}
            >
              {t('about.update')}
            </Button>
          </div>
          <button
            onClick={runCheck}
            className="w-full mt-3 text-center text-[15px] text-ios-blue font-medium active:opacity-60"
          >
            {t('about.recheck')}
          </button>
        </div>
      )}
    </Page>
  )
}
