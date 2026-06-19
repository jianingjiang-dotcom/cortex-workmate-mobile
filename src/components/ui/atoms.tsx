import { motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { ChevronRight, Search, X } from 'lucide-react'
import { cn, solidFor } from '../../lib/util'

// ---- Spinner ---------------------------------------------------------------

export function Spinner({ size = 18, className, color }: { size?: number; className?: string; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn('animate-spin', className)}
      style={color ? { color } : undefined}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// ---- Avatar ----------------------------------------------------------------

export function Avatar({
  gradient,
  color,
  name,
  size = 40,
  shape = 'squircle',
  icon,
  src,
  className,
}: {
  gradient?: string
  color?: string // explicit fill — overrides gradient (e.g. identityColor() for letter avatars)
  name?: string
  size?: number
  shape?: 'circle' | 'squircle'
  icon?: ReactNode
  src?: string
  className?: string
}) {
  const radius = shape === 'circle' ? size / 2 : size * 0.28
  if (src) {
    // The bundled Workmate mascot art has a pale halo / built-in padding that makes
    // it read smaller than sibling glyph tiles — crop it to fill. Uploaded photos
    // (data URLs) are already full-bleed, so they render untouched.
    const isMascot = src === '/workmate-avatar.png'
    return (
      <div
        className={cn('overflow-hidden shrink-0', className)}
        style={{ width: size, height: size, borderRadius: radius }}
      >
        <img
          src={src}
          alt={name || ''}
          className="w-full h-full object-cover"
          style={isMascot ? { transform: 'scale(1.34)' } : undefined}
        />
      </div>
    )
  }
  return (
    <div
      className={cn('flex items-center justify-center text-white font-semibold shrink-0', className)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: color || solidFor(gradient),
        fontSize: size * 0.4,
      }}
    >
      {icon ? icon : name ? name.trim().charAt(0).toUpperCase() : null}
    </div>
  )
}

// ---- ServerLogo (real brand logo via URL, with graceful fallback) ----------

export function ServerLogo({
  logo,
  gradient,
  name,
  size = 40,
}: {
  logo?: string
  gradient?: string
  name?: string
  size?: number
}) {
  const [errored, setErrored] = useState(false)
  const radius = size * 0.28
  if (logo && !errored) {
    return (
      <div
        className="flex items-center justify-center shrink-0 bg-white border border-divider overflow-hidden"
        style={{ width: size, height: size, borderRadius: radius }}
      >
        <img
          src={logo}
          alt={name || ''}
          onError={() => setErrored(true)}
          className="object-contain"
          style={{ width: Math.round(size * 0.62), height: Math.round(size * 0.62) }}
        />
      </div>
    )
  }
  // fallback: gradient + first letter (matches the old Avatar tile)
  return (
    <div
      className="flex items-center justify-center text-white font-semibold shrink-0"
      style={{ width: size, height: size, borderRadius: radius, background: solidFor(gradient), fontSize: size * 0.4 }}
    >
      {name ? name.trim().charAt(0).toUpperCase() : null}
    </div>
  )
}

// ---- Button ----------------------------------------------------------------

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  loading,
  full,
  size = 'md',
  className,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: BtnVariant
  disabled?: boolean
  loading?: boolean
  full?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  type?: 'button' | 'submit'
}) {
  const sizes = {
    sm: 'h-9 px-4 text-[14px] rounded-ios',
    md: 'h-11 px-5 text-[16px] rounded-ios-lg',
    lg: 'h-[52px] px-6 text-[16px] rounded-ios-lg',
  }
  const variants: Record<BtnVariant, string> = {
    primary: 'bg-brand-primary text-white shadow-ios-md active:brightness-95',
    secondary: 'bg-ios-gray6 text-label-primary active:bg-ios-gray5',
    ghost: 'text-ios-purple active:bg-black/[0.04]',
    destructive: 'bg-ios-gray6 text-ios-red active:bg-ios-gray5',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 font-semibold press whitespace-nowrap disabled:opacity-50 disabled:active:scale-100',
        sizes[size],
        variants[variant],
        full && 'w-full',
        className,
      )}
    >
      {loading && <Spinner size={18} className="text-current" />}
      {!loading && children}
    </button>
  )
}

// ---- IconButton ------------------------------------------------------------

export function IconButton({
  children,
  onClick,
  className,
  ariaLabel,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  ariaLabel?: string
}) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'relative w-9 h-9 flex items-center justify-center rounded-full text-label-secondary active:bg-black/[0.05] press',
        className,
      )}
    >
      {children}
    </button>
  )
}

// ---- Segmented control -----------------------------------------------------

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  layoutId = 'seg',
  className,
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  layoutId?: string
  className?: string
}) {
  return (
    <div className={cn('relative flex p-[2px] rounded-[10px] bg-black/[0.06] dark:bg-white/[0.06]', className)}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative flex-1 h-8 flex items-center justify-center text-[14px] z-10 transition-colors',
              active ? 'text-brand-primary font-semibold' : 'text-label-secondary font-medium',
            )}
          >
            {active && (
              <motion.div
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                className="absolute inset-0 bg-surface dark:bg-[#48484a] rounded-[8px] shadow-ios"
              />
            )}
            <span className="relative z-10 whitespace-nowrap">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ---- Switch ----------------------------------------------------------------

export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative w-[51px] h-[31px] rounded-full shrink-0"
      style={{ backgroundColor: 'rgba(120,120,128,0.24)' }} // constant gray track
    >
      {/* accent (purple) fill fades in/out via opacity (always interpolates smoothly —
          unlike a background-color transition between var() and rgba, which can snap) */}
      <span
        className="absolute inset-0 rounded-full transition-opacity duration-300 ease-in-out"
        style={{ backgroundColor: 'var(--purple)', opacity: checked ? 1 : 0 }}
      />
      {/* knob slides via a GPU transform */}
      <span
        className="absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  )
}

// ---- Grouped list (iOS settings style) -------------------------------------

export function Section({
  title,
  footer,
  children,
  className,
  noUppercase,
}: {
  title?: string
  footer?: string
  children: ReactNode
  className?: string
  noUppercase?: boolean
}) {
  return (
    <div className={cn('px-4', className)}>
      {title && (
        <div
          className={cn(
            'px-3 pb-1.5 pt-1 text-[14px] font-medium text-label-secondary',
            !noUppercase && 'uppercase tracking-wide',
          )}
        >
          {title}
        </div>
      )}
      <div className="list-group divide-y divide-divider">{children}</div>
      {footer && <div className="px-3 pt-1.5 text-[14px] text-label-secondary leading-snug">{footer}</div>}
    </div>
  )
}

export function Row({
  icon,
  iconBg,
  title,
  subtitle,
  value,
  right,
  onClick,
  danger,
  chevron,
  className,
}: {
  icon?: ReactNode
  iconBg?: string
  title: ReactNode
  subtitle?: ReactNode
  value?: ReactNode
  right?: ReactNode
  onClick?: () => void
  danger?: boolean
  chevron?: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5 text-left min-h-[48px]',
        onClick && 'active:bg-black/[0.04]',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'w-[29px] h-[29px] flex items-center justify-center shrink-0',
            danger ? 'text-ios-red' : 'text-label-secondary',
          )}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className={cn('text-[16px] truncate', danger ? 'text-ios-red' : 'text-label-primary')}>{title}</div>
        {subtitle && <div className="text-[14px] text-label-secondary truncate mt-0.5">{subtitle}</div>}
      </div>
      {value && <div className="text-[16px] text-label-secondary shrink-0 max-w-[55%] truncate">{value}</div>}
      {right}
      {chevron && (
        <ChevronRight size={18} className="text-ios-gray2 shrink-0" />
      )}
    </button>
  )
}

// ---- EmptyState ------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-10 py-16">
      <div className="w-[72px] h-[72px] rounded-[20px] flex items-center justify-center mb-4 bg-ios-gray5 text-label-secondary">
        {icon}
      </div>
      <div className="text-[16px] font-semibold text-label-primary">{title}</div>
      {subtitle && <div className="text-[14px] text-label-secondary mt-1.5 leading-relaxed max-w-[260px]">{subtitle}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ---- Pill / Badge ----------------------------------------------------------

export function Pill({
  children,
  color = 'gray',
  className,
}: {
  children: ReactNode
  color?: 'gray' | 'blue' | 'green' | 'red' | 'orange' | 'brand'
  className?: string
}) {
  const colors: Record<string, string> = {
    gray: 'bg-black/[0.06] dark:bg-white/[0.1] text-label-secondary',
    blue: 'bg-ios-purple/10 text-ios-purple',
    green: 'bg-ios-green/12 text-ios-green',
    red: 'bg-ios-red/10 text-ios-red',
    orange: 'bg-ios-orange/12 text-ios-orange',
    brand: 'bg-brand-violet/10 text-brand-violet',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium',
        colors[color],
        className,
      )}
    >
      {children}
    </span>
  )
}

// ---- Highlight (matched query substrings) ----------------------------------

export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (!q) return <>{text}</>
  const lower = text.toLowerCase()
  const ql = q.toLowerCase()
  const parts: ReactNode[] = []
  let i = 0
  let idx = lower.indexOf(ql)
  let key = 0
  while (idx !== -1) {
    if (idx > i) parts.push(text.slice(i, idx))
    parts.push(
      <mark key={key++} className="bg-brand-primary/20 text-brand-primary rounded px-0.5">
        {text.slice(idx, idx + ql.length)}
      </mark>,
    )
    i = idx + ql.length
    idx = lower.indexOf(ql, i)
  }
  if (i < text.length) parts.push(text.slice(i))
  return <>{parts}</>
}

// ---- Inline search field ---------------------------------------------------

export function SearchField({
  value,
  onChange,
  placeholder,
  onClose,
  closeLabel,
  autoFocus = true,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  onClose?: () => void
  closeLabel?: string
  autoFocus?: boolean
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-label-tertiary pointer-events-none" />
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-9 bg-surface border border-input rounded-[12px] pl-9 pr-8 text-[16px] outline-none placeholder:text-label-tertiary"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-ios-gray3 text-white flex items-center justify-center"
            aria-label="clear"
          >
            <X size={12} />
          </button>
        )}
      </div>
      {onClose && (
        <button onClick={onClose} className="text-[16px] text-label-secondary active:opacity-60 shrink-0">
          {closeLabel}
        </button>
      )}
    </div>
  )
}
