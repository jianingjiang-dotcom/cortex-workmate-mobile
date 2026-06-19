import { AnimatePresence, motion } from 'framer-motion'
import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/util'

const SPRING = { type: 'spring', stiffness: 420, damping: 38 } as const

/** Renders sheet content at the phone-screen root so it escapes tab/overlay
 *  stacking contexts and always sits above the tab bar. */
function PhonePortal({ children }: { children: ReactNode }) {
  const target = typeof document !== 'undefined' ? document.getElementById('phone-screen') : null
  return target ? createPortal(children, target) : <>{children}</>
}

/** Bottom sheet with backdrop + drag-to-dismiss. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  maxHeight = '85%',
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  maxHeight?: string
}) {
  return (
    <PhonePortal>
    {/* Keyed array children (not a Fragment): AnimatePresence reliably calls
        safeToRemove per child on exit, so the panel + backdrop actually unmount.
        An unkeyed Fragment left the invisible inset-0 backdrop mounted, silently
        blocking taps on the screen behind after the sheet "closed". */}
    <AnimatePresence>
      {open && [
          <motion.div
            key="backdrop"
            className="absolute inset-0 z-[80] bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            // pointerEvents off the instant it starts leaving — guarantees the (briefly)
            // lingering backdrop never blocks taps on the screen behind, even if the
            // unmount is delayed (e.g. a throttled rAF stalls framer's exit completion).
            exit={{ opacity: 0, pointerEvents: 'none' }}
            onClick={onClose}
          />,
          <motion.div
            key="panel"
            className="absolute left-0 right-0 bottom-0 z-[81] bg-surface rounded-t-[20px] shadow-sheet flex flex-col"
            style={{ maxHeight }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose()
            }}
          >
            <div className="pt-2.5 pb-1 flex justify-center shrink-0">
              <div className="w-9 h-1 rounded-full bg-ios-gray4" />
            </div>
            {title && (
              <div className="px-5 pt-1 pb-2 text-[16px] font-semibold text-center shrink-0">{title}</div>
            )}
            <div className={cn('flex-1 min-h-0 scroll-y no-scrollbar overflow-y-auto', footer ? 'pb-2' : 'pb-8')}>
              {children}
            </div>
            {footer && <div className="shrink-0 px-4 pt-2.5 pb-8 bg-surface">{footer}</div>}
          </motion.div>,
        ]}
    </AnimatePresence>
    </PhonePortal>
  )
}

export interface SheetAction {
  label: string
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
  icon?: ReactNode
}

/** iOS-style action sheet. */
export function ActionSheet({
  open,
  onClose,
  title,
  message,
  actions,
  cancelLabel,
}: {
  open: boolean
  onClose: () => void
  title?: string
  message?: string
  actions: SheetAction[]
  cancelLabel: string
}) {
  return (
    <PhonePortal>
    <AnimatePresence>
      {open && [
          <motion.div
            key="backdrop"
            className="absolute inset-0 z-[82] bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            onClick={onClose}
          />,
          <motion.div
            key="panel"
            className="absolute left-0 right-0 bottom-0 z-[83] p-2 pb-3"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={SPRING}
          >
            <div className="rounded-[14px] overflow-hidden glass mb-2">
              {(title || message) && (
                <div className="px-4 py-3 text-center border-b border-divider">
                  {title && <div className="text-[14px] font-medium text-label-secondary">{title}</div>}
                  {message && <div className="text-[14px] text-label-secondary mt-0.5">{message}</div>}
                </div>
              )}
              {actions.map((a, i) => (
                <button
                  key={i}
                  disabled={a.disabled}
                  onClick={() => {
                    onClose()
                    a.onClick()
                  }}
                  className={cn(
                    'w-full h-[54px] flex items-center justify-center gap-2 text-[16px] active:bg-black/[0.06] disabled:opacity-40',
                    i > 0 && 'border-t border-divider',
                    a.destructive ? 'text-ios-red' : 'text-label-primary',
                  )}
                >
                  {a.icon}
                  {a.label}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="w-full h-[54px] rounded-[14px] bg-surface text-[16px] font-semibold text-label-primary active:bg-ios-gray6"
            >
              {cancelLabel}
            </button>
          </motion.div>,
        ]}
    </AnimatePresence>
    </PhonePortal>
  )
}

/** Centered modal card (for short forms / prompts). */
export function CenterModal({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  return (
    <PhonePortal>
    <AnimatePresence>
      {open && [
          <motion.div
            key="backdrop"
            className="absolute inset-0 z-[84] bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            onClick={onClose}
          />,
          <motion.div
            key="modal"
            className="absolute inset-0 z-[85] flex items-center justify-center p-8 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-[300px] bg-surface rounded-[16px] overflow-hidden pointer-events-auto shadow-ios-lg"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0, pointerEvents: 'none' }}
              transition={{ duration: 0.18 }}
            >
              {children}
            </motion.div>
          </motion.div>,
        ]}
    </AnimatePresence>
    </PhonePortal>
  )
}
