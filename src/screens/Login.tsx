import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ScanLine } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import { Spinner } from '../components/ui/atoms'
import { ScanLogin } from './ScanLogin'

function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="currentColor">
      <path d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 1 0 24 44c11 0 19.5-8 19.5-20 0-1.3-.1-2.3-.4-3.5z" />
      <path d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.9 41.9 44 36.7 44 28c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  )
}

export function Login() {
  const login = useStore((s) => s.login)
  const setScanLogin = useStore((s) => s.setScanLogin)
  const scanLoginOpen = useStore((s) => s.scanLoginOpen)
  const t = useT()
  const [loading, setLoading] = useState(false)

  const handleLogin = () => {
    if (loading) return
    setLoading(true)
    setTimeout(() => login(), 1500)
  }

  return (
    <div className="absolute inset-0 bg-surface overflow-hidden">
      <div className="absolute inset-0 flex flex-col pt-[64px] px-7 pb-10">
        {/* hero */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-8">
          <motion.img
            initial={{ scale: 0.92, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            src="/cortex-wordmark.svg"
            alt="Cortex"
            className="h-9 w-auto"
          />
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="text-[16px] font-medium text-label-primary mt-4 text-center"
          >
            {t('login.tagline')}
          </motion.p>
        </div>

        {/* sign-in */}
        <div className="space-y-3">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-[54px] rounded-ios-lg bg-brand-primary text-white flex items-center justify-center gap-3 text-[16px] font-semibold press disabled:opacity-70 active:opacity-90"
          >
            {loading ? (
              <>
                <Spinner size={20} className="text-white" />
                <span>{t('login.signingIn')}</span>
              </>
            ) : (
              <>
                <GoogleG />
                {t('login.google')}
              </>
            )}
          </button>

          {/* scan-to-sign-in (secondary) */}
          <button
            onClick={() => setScanLogin(true)}
            disabled={loading}
            className="w-full h-[50px] rounded-ios-lg bg-transparent border border-input flex items-center justify-center gap-2.5 text-[16px] font-semibold text-label-primary press disabled:opacity-60 active:bg-ios-gray6"
          >
            <ScanLine size={20} className="text-label-secondary" />
            {t('login.scan')}
          </button>

          <p className="text-[12px] text-label-secondary text-center leading-relaxed px-4">
            {t('login.terms')
              .split(/(\{terms\}|\{privacy\})/)
              .map((part, i) => {
                if (part === '{terms}')
                  return (
                    <a key={i} href="#" onClick={(e) => e.preventDefault()} className="underline underline-offset-2 decoration-label-tertiary active:opacity-60">
                      {t('login.termsLink')}
                    </a>
                  )
                if (part === '{privacy}')
                  return (
                    <a key={i} href="#" onClick={(e) => e.preventDefault()} className="underline underline-offset-2 decoration-label-tertiary active:opacity-60">
                      {t('login.privacyLink')}
                    </a>
                  )
                return <span key={i}>{part}</span>
              })}
          </p>
        </div>
      </div>

      <AnimatePresence>{scanLoginOpen && <ScanLogin />}</AnimatePresence>
    </div>
  )
}
