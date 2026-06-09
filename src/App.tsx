import { useEffect, useRef } from 'react'
import { useStore } from './store/useStore'
import { HomeIndicator, PhoneFrame, StatusBar } from './components/PhoneFrame'
import { ToastHost, ConfirmHost } from './components/Feedback'
import { Overlays } from './components/Overlays'
import { Main } from './screens/Main'
import { Login } from './screens/Login'
import { Onboarding } from './screens/Onboarding'

// View Transitions API (Chromium / Safari 18+); typed loosely as it's not in lib.dom yet.
type DocWithViewTransition = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> }
}

export default function App() {
  const authStatus = useStore((s) => s.authStatus)
  const scanLoginOpen = useStore((s) => s.scanLoginOpen)
  const theme = useStore((s) => s.theme)
  const themeMode = useStore((s) => s.themeMode)
  const setTheme = useStore((s) => s.setTheme)
  const dark = theme === 'dark'

  // when following the OS, resolve the effective theme + keep it live as the OS flips
  useEffect(() => {
    if (themeMode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => setTheme(mq.matches ? 'dark' : 'light')
    apply() // re-resolve on entering system mode / mount
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [themeMode, setTheme])

  // toggle the dark token set on <html> so CSS vars cascade to the stage + phone + portals.
  // After the first paint, run the flip inside a View Transition so the WHOLE page
  // crossfades between the two palettes (snapshot-based — independent of React node
  // identity and CSS-var transition quirks). Falls back to an instant flip if unsupported.
  const firstPaint = useRef(true)
  useEffect(() => {
    const el = document.documentElement
    const applyDark = () => el.classList.toggle('dark', dark)
    const start = (document as DocWithViewTransition).startViewTransition?.bind(document)
    const needsChange = el.classList.contains('dark') !== dark
    // first paint, no View-Transition support, or nothing actually changing (incl. the
    // pre-paint inline script having already applied .dark, and StrictMode's dev
    // double-invoke of effects) → flip instantly, never animate.
    if (firstPaint.current || !start || !needsChange) {
      firstPaint.current = false
      applyDark()
      return
    }
    start(applyDark)
  }, [dark])

  // status bar / home indicator render light (white) over the scanner OR dark theme
  const lightChrome = scanLoginOpen || dark

  return (
    <PhoneFrame>
      <div className="absolute inset-0">
        {authStatus === 'loggedOut' && <Login />}
        {authStatus === 'onboarding' && <Onboarding />}
        {authStatus === 'ready' && (
          <>
            <Main />
            <Overlays />
          </>
        )}
      </div>
      <StatusBar variant={lightChrome ? 'light' : 'dark'} />
      <HomeIndicator light={lightChrome} />
      <ToastHost />
      <ConfirmHost />
    </PhoneFrame>
  )
}
