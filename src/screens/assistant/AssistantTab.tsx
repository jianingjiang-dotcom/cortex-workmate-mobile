import { CalendarClock, ChevronRight, Mic } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useT } from '../../i18n'
import { Page } from '../../components/Page'
import { Bell } from '../../components/Bell'
import { Avatar } from '../../components/ui/atoms'

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
      title: t('hub.tasks'),
      desc: t('hub.tasks.desc'),
      value: t('hub.activeTasks', { n: activeTasks }),
      onClick: () => push('taskList'),
    },
    {
      icon: <Mic size={22} />,
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

      {/* Workmate hero card — solid brand fill (the home destination, a brand moment).
          Everything on purple is white per DS; the avatar sits on a white disc. */}
      <div className="px-4 mt-2">
        <button
          onClick={() => setTab('chat')}
          className="w-full rounded-ios-lg shadow-ios flex items-center gap-4 p-4 text-left active:opacity-90 press"
          style={{ background: '#CC79FF' }}
        >
          <div className="w-[56px] h-[56px] rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden">
            {persona.avatarImage ? (
              <Avatar src="/workmate-avatar-white.png" size={56} shape="circle" />
            ) : (
              <SparkleGlyph fill="#CC79FF" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[18px] font-bold text-white">{persona.name}</div>
            <div className="text-[14px] text-white/85 truncate">{t('hub.enterChat')}</div>
          </div>
          <ChevronRight size={20} className="text-white/75" />
        </button>
      </div>

      {/* entries */}
      <div className="px-4 mt-3 space-y-3">
        {entries.map((e, i) => (
          <button
            key={i}
            onClick={e.onClick}
            className="w-full card flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-ios-gray6"
          >
            <div className="w-11 h-11 rounded-[12px] bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
              {e.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-semibold">{e.title}</div>
              <div className="text-[14px] text-label-secondary truncate">{e.desc}</div>
            </div>
            {e.value && <div className="text-[12px] text-label-secondary shrink-0">{e.value}</div>}
            <ChevronRight size={18} className="text-ios-gray3 shrink-0" />
          </button>
        ))}
      </div>
    </Page>
  )
}

function SparkleGlyph({ fill = 'white' }: { fill?: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={fill}>
      <path d="M12 2l1.8 5.5L19.5 9l-5.7 1.5L12 16l-1.8-5.5L4.5 9l5.7-1.5L12 2z" />
    </svg>
  )
}
