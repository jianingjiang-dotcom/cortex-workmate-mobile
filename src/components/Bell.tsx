import { Bell as BellIcon } from 'lucide-react'
import { useStore } from '../store/useStore'

export function Bell({ color = 'blue' }: { color?: 'blue' | 'white' }) {
  const unread = useStore((s) => s.notifications.filter((n) => !n.read).length)
  const push = useStore((s) => s.push)
  return (
    <button
      aria-label="Notifications"
      onClick={() => push('notifications')}
      className="relative w-9 h-9 flex items-center justify-center rounded-full active:bg-black/[0.05] press"
    >
      {/* Utility icon → neutral --text-2 (ghost). White only on the gradient header. */}
      <BellIcon size={22} className={color === 'white' ? 'text-white' : 'text-label-secondary'} />
      {unread > 0 && (
        // Count badge: --accent purple circle, white 600 number, 18px min, 9+ cap (DS §4).
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-[5px] rounded-full text-white text-[12px] font-semibold flex items-center justify-center"
          style={{ background: '#CC79FF' }}
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  )
}
