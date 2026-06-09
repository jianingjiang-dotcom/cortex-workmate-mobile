import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ScanLine } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import { Spinner } from '../components/ui/atoms'
import { ScanLogin } from './ScanLogin'

function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 1 0 24 44c11 0 19.5-8 19.5-20 0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.9 41.9 44 36.7 44 28c0-1.3-.1-2.3-.4-3.5z" />
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
      {/* gradient accents */}
      <div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-[90px] opacity-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle,#8A6AF0,#5B7CFA 60%,transparent)' }}
      />
      <div
        className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full blur-[90px] opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(circle,#FF9F5A,#C76AE0 60%,transparent)' }}
      />

      <div className="absolute inset-0 flex flex-col pt-[64px] px-7 pb-10">
        {/* hero */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="relative mb-7"
          >
            <div
              className="absolute inset-0 blur-2xl opacity-50 scale-110"
              style={{ background: 'conic-gradient(from 120deg,#5B7CFA,#C76AE0,#FF9F5A,#5B7CFA)', borderRadius: 28 }}
            />
            <img
              src="/cortex-logo.png"
              alt="Cortex"
              className="relative w-[96px] h-[96px] rounded-[24px] shadow-ios-lg"
            />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[30px] font-bold tracking-tight"
          >
            Cortex <span className="brand-text">Workmate</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="text-[17px] font-medium text-label-primary mt-3"
          >
            {t('login.tagline')}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.26 }}
            className="text-[14px] text-label-secondary mt-2 text-center leading-relaxed max-w-[280px]"
          >
            {t('login.subtitle')}
          </motion.p>
        </div>

        {/* sign-in */}
        <div className="space-y-4">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-[54px] rounded-ios-lg bg-surface border border-divider shadow-ios-md flex items-center justify-center gap-3 text-[17px] font-semibold press disabled:opacity-70"
          >
            {loading ? (
              <>
                <Spinner size={20} className="text-ios-gray" />
                <span className="text-label-secondary">{t('login.signingIn')}</span>
              </>
            ) : (
              <>
                <GoogleG />
                {t('login.google')}
              </>
            )}
          </button>

          {/* divider */}
          <div className="flex items-center gap-3 py-0.5">
            <div className="h-px flex-1 bg-divider" />
            <span className="text-[12px] text-label-tertiary">{t('login.or')}</span>
            <div className="h-px flex-1 bg-divider" />
          </div>

          {/* scan-to-sign-in (secondary) */}
          <button
            onClick={() => setScanLogin(true)}
            disabled={loading}
            className="w-full h-[50px] rounded-ios-lg border border-divider bg-white/70 dark:bg-white/[0.08] flex items-center justify-center gap-2.5 text-[16px] font-semibold text-label-primary press disabled:opacity-60"
          >
            <ScanLine size={20} className="text-brand-violet" />
            {t('login.scan')}
          </button>

          <p className="text-[12px] text-label-secondary text-center leading-relaxed px-4">
            {t('login.terms')}
          </p>
        </div>
      </div>

      <AnimatePresence>{scanLoginOpen && <ScanLogin />}</AnimatePresence>
    </div>
  )
}
