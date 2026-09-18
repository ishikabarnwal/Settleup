import clsx from 'clsx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variants: Record<ButtonVariant, string> = {
  // The only place the gradient shows up on ordinary screens: the main action.
  primary:
    'bg-brand-button text-white shadow-sm shadow-wine/20 hover:brightness-110 active:brightness-95 disabled:brightness-100',
  secondary: 'bg-white text-stone-800 ring-1 ring-stone-300 ring-inset hover:bg-stone-50 active:bg-stone-100',
  ghost: 'text-stone-700 hover:bg-stone-100 active:bg-stone-200',
  danger: 'bg-white text-rose ring-1 ring-rose/40 ring-inset hover:bg-rose/5',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
}

/** The button look, for things that aren't <button>s, like a Link to the sign-up page. */
export function buttonClasses({ variant = 'primary', size = 'md', className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return clsx(
    'inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition',
    'disabled:cursor-not-allowed disabled:opacity-60',
    variants[variant],
    sizes[size],
    className,
  )
}
