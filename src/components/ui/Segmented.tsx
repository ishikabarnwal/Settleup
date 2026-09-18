import clsx from 'clsx'
import { useId, type KeyboardEvent } from 'react'

type Option<T extends string> = { value: T; label: string }

/** A small radio group that looks like a segmented control. Arrow keys move between options. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}) {
  const name = useId()

  const onKeyDown = (event: KeyboardEvent) => {
    // The focused option, not `value`, which can be a render behind on fast key presses.
    const focusedId = (event.target as HTMLElement).id
    const index = Math.max(0, options.findIndex((o) => `${name}-${o.value}` === focusedId))
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = options[(index + step + options.length) % options.length]
    onChange(next.value)
    document.getElementById(`${name}-${next.value}`)?.focus()
  }

  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            id={`${name}-${option.value}`}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={clsx(
              'rounded-lg px-2 py-2 text-sm font-medium transition',
              selected ? 'bg-white text-ink shadow-sm ring-1 ring-stone-200' : 'text-stone-600 hover:text-stone-900',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
