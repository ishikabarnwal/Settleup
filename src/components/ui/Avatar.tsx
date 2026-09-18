import clsx from 'clsx'

// Tints from the palette for initials. Each pairs with a text colour that
// clears 4.5:1 on it; the user id picks one so a person keeps the same colour.
const tints = [
  'bg-plum text-white',
  'bg-wine text-white',
  'bg-rose text-white',
  'bg-blush text-ink',
  'bg-ink text-blush',
  'bg-apricot text-ink',
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export function Avatar({ id, name, size = 'md', className }: { id: number; name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none',
        tints[Math.abs(id) % tints.length],
        size === 'sm' && 'size-7 text-[11px]',
        size === 'md' && 'size-9 text-xs',
        size === 'lg' && 'size-11 text-sm',
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}

/** A few overlapping avatars, e.g. on a group card. */
export function AvatarStack({ people, max = 4 }: { people: { id: number; name: string }[]; max?: number }) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length

  return (
    <div className="flex -space-x-2">
      {shown.map((person) => (
        <Avatar key={person.id} id={person.id} name={person.name} size="sm" className="ring-2 ring-white" />
      ))}
      {extra > 0 && (
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-stone-200 text-[11px] font-semibold text-stone-700 ring-2 ring-white">
          +{extra}
        </span>
      )}
    </div>
  )
}
