import type { ReactNode } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { Logo } from '../../components/Logo'

/**
 * Sign in and sign up share this frame: the brand gradient on one side and a
 * plain form on the other. On phones the gradient shrinks to a header band.
 */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative overflow-hidden bg-brand-sweep px-6 pt-8 pb-10 text-white sm:px-10 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Glow />
        <Logo className="relative" />

        <div className="relative mt-8 max-w-md lg:mt-0">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Split the bill.
            <br />
            <span className="text-blush">Keep the friends.</span>
          </h1>
          <p className="mt-4 hidden text-base text-white/80 sm:block lg:text-lg">
            Track shared expenses with your flatmates, trips and teams, and settle up in as few payments as possible.
          </p>
        </div>

        <PreviewCard />
      </aside>

      <main className="flex items-start justify-center px-5 py-10 sm:px-8 lg:items-center lg:py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">{title}</h2>
          <p className="mt-1.5 text-sm text-stone-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}

function Glow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -top-24 -right-24 size-80 rounded-full bg-apricot/25 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-plum/60 blur-3xl" />
    </div>
  )
}

/** A static sketch of the product, so the panel shows what the app does rather than stock art. */
function PreviewCard() {
  const rows = [
    { id: 11, name: 'Aarav Shah', text: 'gets back', amount: '₹2,450.00', tone: 'text-emerald-200' },
    { id: 12, name: 'Meera Iyer', text: 'owes', amount: '₹1,225.00', tone: 'text-blush' },
    { id: 13, name: 'Kabir Rao', text: 'owes', amount: '₹1,225.00', tone: 'text-blush' },
  ]

  return (
    <div
      aria-hidden
      className="relative mt-10 hidden max-w-sm rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl shadow-ink/30 backdrop-blur-md lg:block"
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
