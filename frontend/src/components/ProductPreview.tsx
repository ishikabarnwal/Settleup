import clsx from 'clsx'
import { Avatar } from './ui/Avatar'

/** A static sketch of the product, so the page shows what the app does rather than stock art. */
export function ProductPreview({ className }: { className?: string }) {
  const rows = [
    { id: 11, name: 'Aarav Shah', text: 'gets back', amount: '₹2,450.00', tone: 'text-emerald-200' },
    { id: 12, name: 'Meera Iyer', text: 'owes', amount: '₹1,225.00', tone: 'text-blush' },
    { id: 13, name: 'Kabir Rao', text: 'owes', amount: '₹1,225.00', tone: 'text-blush' },
  ]

  return (
    <div
      aria-hidden
      className={clsx(
        'relative max-w-sm rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl shadow-ink/30 backdrop-blur-md',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-white/60 uppercase">Goa trip</p>
          <p className="mt-0.5 text-lg font-semibold">Balances</p>
        </div>
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">3 people</span>
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3">
            <Avatar id={row.id} name={row.name} size="sm" className="ring-2 ring-white/20" />
            <span className="flex-1 text-sm">{row.name}</span>
            <span className={`text-sm font-medium ${row.tone}`}>
              {row.text} {row.amount}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
