import clsx from 'clsx'

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'onDark'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variants: Record<ButtonVariant, string> = {
  // The main action on light backgrounds.
  primary: 'bg-plum text-white shadow-raised hover:bg-plum/90 active:bg-plum',
  // The main action on dark backgrounds, where plum would disappear. Used sparingly.
  accent: 'bg-apricot text-ink shadow-raised hover:bg-apricot/90 active:bg-apricot',
  secondary: 'bg-surface text-stone-800 shadow-card ring-1 ring-stone-200 ring-inset hover:bg-stone-50 active:bg-stone-100',
  ghost: 'text-stone-700 hover:bg-stone-100 active:bg-stone-200',
  danger: 'bg-surface text-rose shadow-card ring-1 ring-rose/30 ring-inset hover:bg-rose/5',
  // A quiet second action on ink.
  onDark: 'text-white/85 ring-1 ring-white/20 ring-inset hover:bg-white/10 hover:text-white',
}

// Heights and paddings stay on the 4px grid: 32 / 40 / 48 tall.
const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-2',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

/** The button look, for things that aren't <button>s, like a Link to the sign-up page. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  pill = false,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; pill?: boolean; className?: string } = {}) {
  return clsx(
    'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition',
    // Inside the pill-shaped nav, buttons follow its shape; everywhere else they're controls.
    pill ? 'rounded-full' : 'rounded-control',
    'disabled:cursor-not-allowed disabled:opacity-60',
    variants[variant],
    sizes[size],
    className,
  )
}

/** A link inside the floating nav: quiet text on ink, pill shaped like the nav itself. */
export function navItemClasses(className?: string) {
  return clsx(
    'inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm text-white/75 transition hover:bg-white/10 hover:text-white',
    'aria-[current=page]:bg-white/10 aria-[current=page]:text-white',
    className,
  )
}
