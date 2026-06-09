import { AnimatePresence, motion } from 'framer-motion'
import { Check, Info, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import { cn } from '../lib/util'

export function ToastHost() {
  const toasts = useStore((s) => s.toasts)
  return (
    <div className="absolute top-[60px] left-0 right-0 z-[95] flex flex-col items-center gap-2 px-6 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 34 }}
            className="glass rounded-full pl-3 pr-4 py-2.5 shadow-ios-md flex items-center gap-2 max-w-[90%]"
          >
            <span
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0',
                t.kind === 'success' && 'bg-ios-green',
                t.kind === 'error' && 'bg-ios-red',
                t.kind === 'info' && 'bg-ios-gray',
              )}
            >
              {t.kind === 'success' ? <Check size={13} strokeWidth={3} /> : t.kind === 'error' ? <X size={13} strokeWidth={3} /> : <Info size={13} strokeWidth={3} />}
            </span>
            <span className="text-[14px] font-medium text-label-primary truncate">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function ConfirmHost() {
  const dialog = useStore((s) => s.confirmDialog)
  const close = useStore((s) => s.closeConfirm)
  const t = useT()
  // Keyed array children (not a Fragment) so AnimatePresence reliably unmounts the
  // backdrop + card on close — an unkeyed Fragment left the invisible inset-0 backdrop
  // mounted, silently blocking taps on the screen after the dialog dismissed.
  return (
    <AnimatePresence>
      {dialog && [
          <motion.div
            key="backdrop"
            className="absolute inset-0 z-[90] bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            // non-interactive the instant it starts leaving — a (briefly) lingering
            // backdrop never blocks taps, even if framer's exit-unmount is delayed.
            exit={{ opacity: 0, pointerEvents: 'none' }}
          />,
          <motion.div
            key="dialog"
            className="absolute inset-0 z-[91] flex items-center justify-center p-9 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-[272px] bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur rounded-[14px] overflow-hidden pointer-events-auto"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0, pointerEvents: 'none' }}
              transition={{ duration: 0.16 }}
            >
              <div className="px-5 pt-5 pb-4 text-center">
                <div className="text-[17px] font-semibold text-label-primary">{dialog.title}</div>
                {dialog.message && (
                  <div className="text-[13px] text-label-secondary mt-1.5 leading-snug">{dialog.message}</div>
                )}
              </div>
              <div className="grid grid-cols-2 border-t border-divider">
                <button
                  onClick={close}
                  className="h-[44px] text-[17px] text-ios-blue active:bg-black/[0.04] border-r border-divider"
                >
                  {dialog.cancelText || t('common.cancel')}
                </button>
                <button
                  onClick={() => {
                    close()
                    dialog.onConfirm()
                  }}
                  className={cn(
                    'h-[44px] text-[17px] font-semibold active:bg-black/[0.04]',
                    dialog.danger ? 'text-ios-red' : 'text-ios-blue',
                  )}
                >
                  {dialog.confirmText || t('common.confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>,
        ]}
    </AnimatePresence>
  )
}
