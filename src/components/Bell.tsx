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
      <BellIcon size={22} strokeWidth={2} className={color === 'white' ? 'text-white' : 'text-ios-blue'} />
      {unread > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-ios-red text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  )
}
