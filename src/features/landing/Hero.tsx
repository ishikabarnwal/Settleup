import clsx from 'clsx'
import { ArrowRight, Divide, Route, Scale } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ProductPreview } from '../../components/ProductPreview'
import { buttonClasses } from '../../components/ui/buttonStyles'

/**
 * The landing hero: an inset ink panel (the nav floats inside its top edge),
 * the pitch on the left, and the product card on the right with small info
 * cards floating around it.
 *
 * The info cards describe the product card they sit next to, so every number
 * on them is true: Aarav is owed 2,450 and Meera and Kabir owe 1,225 each,
 * which the settlement planner clears in two payments, and which nets to zero.
 */
export function Hero() {
  return (
    <div className="px-3 pt-3 sm:px-4 sm:pt-4">
      <section aria-labelledby="hero-heading" className="relative isolate overflow-hidden rounded-panel bg-hero-glow text-white">
        {/* A faint dot field, fading out towards the bottom. Texture, not decoration. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black,transparent_85%)] bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] [background-size:24px_24px]"
        />

        <div className="page-container grid items-center gap-16 pt-32 pb-16 sm:pt-40 sm:pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-24 lg:pt-48 lg:pb-32">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-sm text-white/80 ring-1 ring-white/10">
              <span aria-hidden className="size-2 rounded-full bg-apricot" />
              Shared expenses, sorted
            </p>
            <h1 id="hero-heading" className="mt-6 text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Split shared costs.
              <br />
              <span className="text-blush">Settle up in fewer payments.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-white/75 sm:text-lg">
              SettleUp keeps track of who paid for what on trips, in shared flats and across teams, shows where everyone
              stands, and suggests the fewest payments that would square everyone up.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/register" className={buttonClasses({ variant: 'accent', size: 'lg' })}>
                Get started
                <ArrowRight className="size-4" />
              </Link>
              <Link to="/login" className={buttonClasses({ variant: 'onDark', size: 'lg' })}>
                I have an account
              </Link>
            </div>
          </div>

          <HeroVisual />
        </div>
      </section>
    </div>
  )
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:pt-20 lg:pb-32">
      <ProductPreview className="w-full" />

      {/*
        On large screens the cards float around the product card: one above it,
        two staggered below, so none of them covers what's on it. Below that
        they sit in a column under it, where there's no room to spare.
      */}
      <ul aria-label="At a glance" className="mt-4 grid gap-3 sm:grid-cols-2 lg:mt-0 lg:block">
        <InfoCard
          icon={<Route className="size-4" />}
          tone="apricot"
          title="2 payments settle this trip"
          className="lg:absolute lg:top-0 lg:-left-12 lg:[animation-delay:0s]"
        >
          Meera <Arrow label="pays" /> Aarav, Kabir <Arrow label="pays" /> Aarav
        </InfoCard>
        <InfoCard
          icon={<Divide className="size-4" />}
          tone="plum"
          title="Split to the paisa"
          className="lg:absolute lg:-right-8 lg:bottom-14 lg:[animation-delay:-2.3s]"
        >
          ₹100 <Arrow label="splits into" /> 33.34 + 33.33 + 33.33
        </InfoCard>
        <InfoCard
          icon={<Scale className="size-4" />}
          tone="plum"
          title="Balances add up to ₹0.00"
          className="sm:col-span-2 lg:absolute lg:bottom-0 lg:-left-4 lg:[animation-delay:-4.6s]"
        >
          +2,450 − 1,225 − 1,225
        </InfoCard>
      </ul>
    </div>
  )
}

/** An arrow drawn as an icon, with words for screen readers. */
function Arrow({ label }: { label: string }) {
  return (
    <>
      <ArrowRight aria-hidden className="mx-0.5 inline size-3 align-[-1px] text-stone-400" />
      <span className="sr-only"> {label} </span>
    </>
  )
}

function InfoCard({
  icon,
  tone,
  title,
  children,
  className,
}: {
  icon: ReactNode
  tone: 'apricot' | 'plum'
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <li
      className={clsx(
        'flex items-center gap-3 rounded-card bg-surface px-4 py-3 text-ink shadow-float lg:w-max lg:animate-drift',
        className,
      )}
    >
      <span
        aria-hidden
        className={clsx(
          'flex size-9 shrink-0 items-center justify-center rounded-control',
          tone === 'apricot' ? 'bg-apricot text-ink' : 'bg-plum text-white',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-stone-500 tabular-nums">{children}</span>
      </span>
    </li>
  )
}
