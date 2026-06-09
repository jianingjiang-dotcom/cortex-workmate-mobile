import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Lock pinch-zoom: iOS Safari ignores `user-scalable=no` in the viewport meta,
// so a stray pinch / double-tap can leave the phone-frame UI zoomed & panned
// into a broken-looking state. Blocking the gesture events keeps it native-like.
;(['gesturestart', 'gesturechange', 'gestureend'] as const).forEach((type) =>
  document.addEventListener(type as any, (e: Event) => e.preventDefault(), { passive: false }),
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
