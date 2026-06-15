import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import type { OverlayScreenProps, ScreenName } from '../lib/types'
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen'
import { TaskListScreen } from '../screens/tasks/TaskListScreen'
import { TaskDetailScreen } from '../screens/tasks/TaskDetailScreen'
import { MeetingListScreen } from '../screens/meetings/MeetingListScreen'
import { MeetingDetailScreen } from '../screens/meetings/MeetingDetailScreen'
import { RecordingScreen } from '../screens/meetings/RecordingScreen'
import { PersonaScreen } from '../screens/persona/PersonaScreen'
import { ProfileScreen } from '../screens/me/ProfileScreen'
import { AboutScreen } from '../screens/me/AboutScreen'
import { ConversationScreen } from '../screens/chat/ConversationScreen'
import { HistoryScreen } from '../screens/chat/HistoryScreen'
import { ChatSearchScreen } from '../screens/chat/ChatSearchScreen'
import { ChatFavoritesScreen } from '../screens/chat/ChatFavoritesScreen'
import { McpListScreen } from '../screens/settings/McpListScreen'
import { McpDetailScreen } from '../screens/settings/McpDetailScreen'
import { MemoryListScreen } from '../screens/settings/MemoryListScreen'
import { MemoryTrashScreen } from '../screens/settings/MemoryTrashScreen'
import { SkillListScreen } from '../screens/settings/SkillListScreen'

const REGISTRY: Record<ScreenName, (p: OverlayScreenProps) => JSX.Element> = {
  notifications: NotificationsScreen,
  taskList: TaskListScreen,
  taskDetail: TaskDetailScreen,
  meetingList: MeetingListScreen,
  meetingDetail: MeetingDetailScreen,
  recording: RecordingScreen,
  persona: PersonaScreen,
  profile: ProfileScreen,
  about: AboutScreen,
  history: HistoryScreen,
  chatSearch: ChatSearchScreen,
  chatFavorites: ChatFavoritesScreen,
  conversation: ConversationScreen,
  mcpList: McpListScreen,
  mcpDetail: McpDetailScreen,
  memoryList: MemoryListScreen,
  memoryTrash: MemoryTrashScreen,
  skillList: SkillListScreen,
}

const SPRING = { type: 'spring', stiffness: 420, damping: 40 } as const

export function Overlays() {
  const overlays = useStore((s) => s.overlays)
  const pop = useStore((s) => s.pop)

  return (
    <AnimatePresence>
      {overlays.map((o, i) => {
        const Comp = REGISTRY[o.name]
        const fromBottom = o.name === 'recording'
        const fromLeft = o.name === 'history'
        // search fades in place — no horizontal slide that drags the top status-bar area
        const fade = o.name === 'chatSearch'
        const init = fade
          ? { opacity: 0 }
          : fromBottom
            ? { y: '100%' }
            : fromLeft
              ? { x: '-100%' }
              : { x: '100%' }
        return (
          <motion.div
            key={o.key}
            className={`absolute inset-0 bg-grouped ${fade ? '' : 'shadow-[-8px_0_30px_rgba(0,0,0,0.10)]'}`}
            style={{ zIndex: 50 + i }}
            initial={init}
            animate={fade ? { opacity: 1 } : { x: 0, y: 0 }}
            exit={init}
            transition={fade ? { duration: 0.18 } : SPRING}
          >
            <Comp params={o.params} onBack={pop} />
          </motion.div>
        )
      })}
    </AnimatePresence>
  )
}
