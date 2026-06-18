import { useState, type ReactNode, type UIEvent } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '../lib/util'
import { useT } from '../i18n'

export function BackButton({ label, onClick }: { label?: string; onClick: () => void }) {
  const t = useT()
  return (
    <button onClick={onClick} className="flex items-center text-label-primary -ml-1 pr-2 active:opacity-50 press">
      <ChevronLeft size={26} className="-mr-0.5" />
      <span className="text-[16px] font-normal truncate max-w-[120px]">{label ?? t('common.back')}</span>
    </button>
  )
}

/**
 * Standard iOS page. For `largeTitle` pages the big left-aligned title is PINNED
 * in the fixed header — it does NOT collapse into a centered nav title on scroll;
 * a frosted glass + hairline simply fades in once content scrolls under it.
 * Detail pages (`largeTitle={false}`) keep a centered inline nav title.
 */
export function Page({
  title,
  largeTitle = true,
  onBack,
  backLabel,
  right,
  left,
  children,
  bottomTabInset = false,
  bg = 'group',
}: {
  title?: ReactNode
  largeTitle?: boolean
  onBack?: () => void
  backLabel?: string
  right?: ReactNode
  left?: ReactNode
  children: ReactNode
  bottomTabInset?: boolean
  bg?: 'group' | 'white'
}) {
  const [scrolled, setScrolled] = useState(false)
  const handleScroll = (e: UIEvent<HTMLDivElement>) => setScrolled(e.currentTarget.scrollTop > 4)

  const showLarge = largeTitle && !!title
  // fixed header height: status bar (54) + action row (44) + pinned large title (52)
  const headerPad = showLarge ? 150 : 98

  return (
    <div className={cn('absolute inset-0', bg === 'group' ? 'bg-grouped' : 'bg-surface')}>
      {/* fixed header — spans from the very top so its frosted glass also covers the
          status-bar strip (content must never show sharply behind the system clock) */}
      <div className="absolute top-0 left-0 right-0 z-30">
        <div className={cn('transition-colors duration-200', scrolled && 'glass hairline-b')}>
          <div className="h-[54px]" aria-hidden /> {/* status-bar area */}
          {/* action row: back / left … right */}
          <div className="h-[44px] flex items-center px-2 relative">
            <div className="flex-1 flex items-center min-w-0">
              {onBack ? <BackButton label={backLabel} onClick={onBack} /> : left}
            </div>
            {/* detail pages keep a centered inline title */}
            {!largeTitle && title && (
              <div className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold truncate max-w-[58%] text-center pointer-events-none">
                {title}
              </div>
            )}
            <div className="flex-1 flex items-center justify-end gap-1">{right}</div>
          </div>
          {/* pinned large title */}
          {showLarge && (
            <div className="h-[52px] flex items-end px-4 pb-2">
              <h1 className="text-[32px] font-bold tracking-tight leading-tight truncate">{title}</h1>
            </div>
          )}
        </div>
      </div>

      {/* scroll body */}
      <div className="scroll-y no-scrollbar absolute inset-0" style={{ paddingTop: headerPad }} onScroll={handleScroll}>
        {children}
        <div className={cn(bottomTabInset ? 'h-[100px]' : 'h-[40px]')} />
      </div>
    </div>
  )
}
