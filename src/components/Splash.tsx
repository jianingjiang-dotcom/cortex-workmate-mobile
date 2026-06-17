import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * App launch splash — just the Cortex logo, centered, on a clean surface.
 * Shows once on mount, then fades out to reveal the app.
 */
export function Splash() {
  const [show, setShow] = useState(true)
  useEffect(() => {
    const tmo = setTimeout(() => setShow(false), 1600)
    return () => clearTimeout(tmo)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-[80] flex items-center justify-center"
          style={{ background: 'linear-gradient(150deg, #407CFF 0%, #CC79FF 52%, #FFA03B 100%)' }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
        >
          <motion.img
            src="/cortex-mark-white.svg"
            alt="Cortex"
            className="w-[116px] h-[116px]"
            initial={{ scale: 0.7, opacity: 0, y: 6 }}
            animate={{
              scale: [0.7, 1.04, 1],
              opacity: [0, 1, 1],
              y: [6, 0, 0],
            }}
            transition={{
              duration: 0.9,
              times: [0, 0.6, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
