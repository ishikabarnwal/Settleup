import clsx from 'clsx'
import { ArrowDown, ArrowRight, Calculator, HandCoins, Receipt, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar } from '../../components/ui/Avatar'

/*
 * One worked example runs through all four steps, so the little illustrations
 * agree with each other and with what the app really does: Aarav pays a
 * 24,000 villa split four ways, which leaves him +18,000 and the other three
 * -6,000 each (netting to zero), and the planner settles that in three
 * payments, each straight to Aarav.
 */
const people = [
  { id: 11, name: 'Aarav Shah' },
  { id: 12, name: 'Meera Iyer' },
  { id: 13, name: 'Kabir Rao' },
  { id: 14, name: 'Tara Mehta' },
]

const steps: { icon: ReactNode; title: string; text: string; visual: ReactNode }[] = [
  {
    icon: <Users className="size-6" />,
    title: 'Create a group',
    text: 'Name it after the trip or the flat, and add people by their email.',
    visual: <GroupSketch />,
  },
  {
    icon: <Receipt className="size-6" />,
    title: 'Add expenses',
    text: 'Say who paid, then split it equally, by exact amounts or by percentage.',
    visual: <ExpenseSketch />,
  },
  {
    icon: <Calculator className="size-6" />,
    title: 'SettleUp works out balances',
    text: "Everyone's position is recalculated from the history, so it's always current and always adds up to zero.",
    visual: <BalanceSketch />,
  },
  {
    icon: <HandCoins className="size-6" />,
    title: 'Settle up in fewer payments',
    text: 'Get the short list of who pays whom, and record each payment as it happens.',
    visual: <SettleSketch />,
  },
]

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-heading" className="scroll-mt-24 py-16 sm:py-24">
      <div className="page-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-plum uppercase">How it works</p>
          <h2 id="how-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            From the first receipt to all square, in four steps
          </h2>
        </div>

        <div className="mt-12 rounded-panel bg-surface p-6 shadow-raised sm:p-8 lg:mt-16 lg:p-12">
          <ol aria-label="How it works" className="grid gap-12 lg:grid-cols-4 lg:grid-rows-[auto_auto_auto] lg:gap-x-8 lg:gap-y-6">
            {steps.map((step, index) => (
              <Step key={step.title} number={index + 1} last={index === steps.length - 1} {...step} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function Step({
  number,
  last,
  icon,
  title,
  text,
  visual,
}: {
  number: number
  last: boolean
  icon: ReactNode
  title: string
  text: string
  visual: ReactNode
}) {
  return (
    // Phones: node on the left, content on the right, the line running down.
    // Wide screens: node on top, content below, the line running across. The
    // steps share the list's rows there (subgrid), so every node, every bit of
    // text and every sketch lines up with its neighbours whatever their length.
    <li className="relative grid grid-cols-[4rem_minmax(0,1fr)] gap-x-6 lg:row-span-3 lg:grid-cols-1 lg:grid-rows-subgrid lg:justify-items-center lg:text-center">
      <div className="relative z-10 row-span-2 size-16 lg:row-span-1">
        <div
          className={clsx(
            'flex size-16 items-center justify-center rounded-full shadow-raised ring-8 ring-surface',
            last ? 'bg-plum text-white' : 'bg-ink text-white',
          )}
        >
          {icon}
        </div>
        <span
          aria-hidden
          className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-apricot text-xs font-bold text-ink ring-4 ring-surface"
        >
          {number}
        </span>
      </div>

      {!last && <Connector />}

      <div className="min-w-0">
        <h3 className="font-semibold text-ink">{title}</h3>
        <p className="mt-2 text-sm text-stone-600">{text}</p>
      </div>
      <div className="col-start-2 mt-4 lg:col-start-1 lg:mt-0 lg:w-full">{visual}</div>
    </li>
  )
}

/**
 * The link to the next step: a dashed track ending in an arrow, with a small
 * dot travelling along it. Across on wide screens, down on phones.
 */
function Connector() {
  return (
    // `contents`, so the wrapper takes no grid cell; its lines are positioned against the step.
    <div aria-hidden data-connector className="contents">
      {/* Down, from under this node to the next one. A 16px strip with the line down its middle. */}
      <div className="absolute top-20 bottom-[-2.5rem] left-8 w-4 -translate-x-1/2 lg:hidden">
        <div className="absolute inset-y-0 left-1/2 -ml-px border-l-2 border-dashed border-stone-300" />
        <span className="absolute top-0 left-1/2 -ml-1 size-2 animate-travel-down rounded-full bg-apricot" />
        <ArrowDown className="absolute -bottom-1 left-0 size-4 text-plum" />
      </div>

      {/* Across, from the right of this node to the left of the next. */}
      <div className="absolute top-8 left-[calc(50%+3rem)] hidden h-4 w-[calc(100%-4rem)] -translate-y-1/2 lg:block">
        <div className="absolute inset-x-0 top-1/2 -mt-px border-t-2 border-dashed border-stone-300" />
        <span className="absolute top-1/2 left-0 -mt-1 size-2 animate-travel-across rounded-full bg-apricot" />
        <ArrowRight className="absolute top-0 -right-1 size-4 text-plum" />
      </div>
    </div>
  )
}

function Sketch({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div aria-hidden className={clsx('rounded-card bg-sunken/70 p-4 text-left text-xs text-stone-600', className)}>
      {children}
    </div>
  )
}

function GroupSketch() {
  return (
    <Sketch className="flex items-center justify-between gap-3">
      <span>
        <span className="block text-sm font-semibold text-ink">Goa trip</span>
        <span>4 people</span>
      </span>
      <span className="flex -space-x-1.5">
        {people.map((person) => (
          <Avatar key={person.id} id={person.id} name={person.name} size="sm" className="ring-2 ring-sunken" />
        ))}
      </span>
    </Sketch>
  )
}

function ExpenseSketch() {
  return (
    <Sketch>
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-ink">Villa</span>
        <span className="text-sm font-semibold text-ink tabular-nums">₹24,000.00</span>
      </span>
      <span className="mt-1 block">Aarav paid · split 4 ways · ₹6,000.00 each</span>
    </Sketch>
  )
}

function BalanceSketch() {
  const rows = [
    { name: 'Aarav', net: 18000 },
    { name: 'Meera', net: -6000 },
    { name: 'Kabir', net: -6000 },
    { name: 'Tara', net: -6000 },
  ]
  return (
    <Sketch className="space-y-2">
      {rows.map((row) => (
        <span key={row.name} className="grid grid-cols-[3rem_minmax(0,1fr)_4.5rem] items-center gap-2">
          <span>{row.name}</span>
          <span className="relative h-1.5 rounded-full bg-surface">
            <span className="absolute inset-y-0 left-1/2 w-px bg-stone-300" />
            <span
              className={clsx('absolute inset-y-0 rounded-full', row.net > 0 ? 'left-1/2 bg-owed' : 'right-1/2 bg-owes')}
              style={{ width: `${(Math.abs(row.net) / 18000) * 50}%` }}
            />
          </span>
          <span className={clsx('text-right font-medium tabular-nums', row.net > 0 ? 'text-owed' : 'text-owes')}>
            {row.net > 0 ? '+' : '−'}
            {Math.abs(row.net).toLocaleString('en-IN')}
          </span>
        </span>
      ))}
    </Sketch>
  )
}

function SettleSketch() {
  return (
    <Sketch className="space-y-2">
      {['Meera', 'Kabir', 'Tara'].map((name) => (
        <span key={name} className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1">
            {name}
            <ArrowRight className="size-3 text-stone-400" />
            Aarav
          </span>
          <span className="font-medium text-ink tabular-nums">₹6,000.00</span>
        </span>
      ))}
      <span className="block border-t border-stone-200 pt-2 font-medium text-plum">3 payments and everyone is square</span>
    </Sketch>
  )
}
