import clsx from 'clsx'
import { formatPaise } from '../lib/money'

/**
 * A net position in words and colour: "gets back ₹500.00", "owes ₹200.00" or
 * "settled up". The words carry the meaning so colour is never the only cue.
 */
export function NetAmount({
  paise,
  you = false,
  className,
}: {
  paise: number
  you?: boolean
  className?: string
}) {
  if (paise === 0) {
    return <span className={clsx('text-stone-500', className)}>{you ? "You're settled up" : 'settled up'}</span>
  }

  const owed = paise > 0
  const words = you ? (owed ? "You're owed" : 'You owe') : owed ? 'gets back' : 'owes'

  return (
    <span className={className}>
      <span className="text-stone-500">{words} </span>
      <span className={clsx('font-semibold tabular-nums', owed ? 'text-owed' : 'text-owes')}>
        {formatPaise(Math.abs(paise))}
      </span>
    </span>
  )
}
