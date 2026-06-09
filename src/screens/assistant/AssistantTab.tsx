import { CalendarClock, ChevronRight, Mic } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { Page } from '../../components/Page'
import { Bell } from '../../components/Bell'
import { Avatar } from '../../components/ui/atoms'
import { gradientFor } from '../../lib/util'

export function AssistantTab() {
  const t = useT()
  const persona = useStore((s) => s.persona)
  const tasks = useStore((s) => s.tasks)
  const meetings = useStore((s) => s.meetings)
  const push = useStore((s) => s.push)
  const setTab = useStore((s) => s.setTab)

  const activeTasks = tasks.filter((x) => !x.paused).length

  const entries = [
    {
      icon: <CalendarClock size={22} />,
      g: 'ocean',
      title: t('hub.tasks'),
      desc: t('hub.tasks.desc'),
      value: t('hub.activeTasks', { n: activeTasks }),
      onClick: () => push('taskList'),
    },
    {
      icon: <Mic size={22} />,
      g: 'violet',
      title: t('hub.meetings'),
      desc: t('hub.meetings.desc'),
      value: t('hub.recordings', { n: meetings.length }),
      onClick: () => push('meetingList'),
    },
  ]

  return (
    <Page title={t('hub.title')} right={<Bell />} bottomTabInset>
      <div className="px-4 pb-2 -mt-1">
        <div className="text-[14px] text-label-secondary">{t('hub.subtitle')}</div>
      </div>

      {/* Workmate card */}
      <div className="px-4 mt-2">
        <button
          onClick={() => setTab('chat')}
          className="w-full rounded-ios-xl p-4 flex items-center gap-3.5 text-left text-white active:opacity-90 press"
          style={{ background: gradientFor(persona.avatarGradient) }}
        >
          <Avatar src={persona.avatarImage} gradient="brand" size={52} icon={<SparkleGlyph />} className="!bg-white/20 backdrop-blur" />
          <div className="flex-1 min-w-0">
            <div className="text-[18px] font-bold">{persona.name}</div>
            <div className="text-[13px] text-white/85 truncate">{t('hub.enterChat')}</div>
          </div>
          <ChevronRight size={20} className="text-white/70" />
        </button>
      </div>

      {/* entries */}
      <div className="px-4 mt-5 space-y-3">
        {entries.map((e, i) => (
          <button
            key={i}
            onClick={e.onClick}
            className="w-full card flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-ios-gray6"
          >
            <div className="w-11 h-11 rounded-[13px] flex items-center justify-center text-white shrink-0" style={{ background: gradientFor(e.g) }}>
              {e.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-semibold">{e.title}</div>
              <div className="text-[13px] text-label-secondary truncate">{e.desc}</div>
            </div>
            {e.value && <div className="text-[13px] text-label-secondary shrink-0">{e.value}</div>}
            <ChevronRight size={18} className="text-ios-gray3 shrink-0" />
          </button>
        ))}
      </div>
    </Page>
  )
}

function SparkleGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
      <path d="M12 2l1.8 5.5L19.5 9l-5.7 1.5L12 16l-1.8-5.5L4.5 9l5.7-1.5L12 2z" />
    </svg>
  )
}
