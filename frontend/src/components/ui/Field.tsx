import clsx from 'clsx'
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

const control =
  'block w-full rounded-control border bg-surface px-4 text-sm text-stone-900 shadow-xs transition placeholder:text-stone-400 ' +
  'focus:border-plum focus:ring-4 focus:ring-plum/10 focus:outline-none disabled:bg-stone-100 disabled:text-stone-500'

type FieldProps = {
  label: ReactNode
  error?: string
  hint?: ReactNode
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode
  className?: string
}

/** Label, control and message wired together for screen readers. */
export function Field({ label, error, hint, children, className }: FieldProps) {
  const id = useId()
  const messageId = `${id}-message`

  return (
    <div className={clsx('space-y-2', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error || hint ? messageId : undefined,
      })}
      {error ? (
        <p id={messageId} className="text-sm text-rose" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-sm text-stone-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; prefix?: ReactNode; suffix?: ReactNode }

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, prefix, suffix, ...props },
  ref,
) {
  const input = (
    <input
      ref={ref}
      className={clsx(
        control,
        'h-10',
        invalid || props['aria-invalid'] ? 'border-rose' : 'border-stone-300',
        prefix && 'pl-9',
        suffix && 'pr-10',
        className,
      )}
      {...props}
    />
  )

  if (!prefix && !suffix) return input

  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-stone-500">
          {prefix}
        </span>
      )}
      {input}
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-stone-500">
          {suffix}
        </span>
      )}
    </div>
  )
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={clsx(control, 'h-10 pr-8', props['aria-invalid'] ? 'border-rose' : 'border-stone-300', className)}
      {...props}
    >
      {children}
    </select>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={3}
        className={clsx(
          control,
          'resize-none py-3',
          props['aria-invalid'] ? 'border-rose' : 'border-stone-300',
          className,
        )}
        {...props}
      />
    )
  },
)

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="rounded-control bg-rose/8 px-4 py-3 text-sm text-rose ring-1 ring-rose/20 ring-inset">
      {message}
    </div>
  )
}
