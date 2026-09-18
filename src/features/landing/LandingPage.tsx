import { ArrowRight, Divide, HandCoins, Scale, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Logo } from '../../components/Logo'
import { Glow, ProductPreview } from '../../components/ProductPreview'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

const FRONTEND_REPO = 'https://github.com/ishikabarnwal/settleup-frontend'
const BACKEND_REPO = 'https://github.com/ishikabarnwal/settleup-backend'

/** What signed-out visitors see at "/": what SettleUp is, before asking them to sign up. */
export function LandingPage() {
  useDocumentTitle('Split shared expenses')

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-white px-3 py-2 text-sm font-medium text-ink shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <LandingHeader />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Hero />
        <Features />
        <WhyDifferent />
        <ClosingCta />
      </main>
      <LandingFooter />
    </div>
  )
}

const sectionLinks = [
  { href: '#features', label: 'What it does' },
  { href: '#why', label: 'Why SettleUp' },
]

function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 bg-ink text-white shadow-sm shadow-ink/20">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="rounded-lg" aria-label="SettleUp home">
          <Logo />
        </Link>

        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {sectionLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Log in
          </Link>
          <Link to="/register" className={buttonClasses({ size: 'sm' })}>
            Sign up
          </Link>
        </div>
      </div>
      {/* The same thin gradient line that sits under the app's own nav. */}
      <div aria-hidden className="h-0.5 bg-brand-sweep" />
    </header>
  )
}

function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden bg-brand-sweep text-white">
      <Glow />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_24rem] lg:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-medium tracking-wide text-blush uppercase">Shared expenses, sorted</p>
          <h1 id="hero-heading" className="mt-3 text-4xl leading-tight font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Split shared costs.
            <br />
            <span className="text-blush">Settle up in fewer payments.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/80 sm:text-lg">
            SettleUp keeps track of who paid for what on trips, in shared flats and across teams, shows where everyone
            stands, and suggests the fewest payments that would square everyone up.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/register" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
              Get started
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex h-12 items-center justify-center rounded-lg px-5 text-base font-medium text-white/90 ring-1 ring-white/30 ring-inset transition hover:bg-white/10 hover:text-white"
            >
              I have an account
            </Link>
          </div>
        </div>

        <ProductPreview className="w-full justify-self-center lg:justify-self-end" />
      </div>
    </section>
  )
}

const features: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <Users className="size-5" />,
    title: 'Groups for anything',
    text: 'A trip, a flat, a team. Make a group and add people by email.',
  },
  {
    icon: <Divide className="size-5" />,
    title: 'Split it your way',
    text: 'Equally, by exact amounts, or by percentage. Shares always add back up to the total.',
  },
  {
    icon: <Scale className="size-5" />,
    title: 'See where you stand',
    text: "Who's owed and who owes, in each group and across all of them.",
  },
  {
    icon: <HandCoins className="size-5" />,
    title: 'Settle in fewer payments',
    text: 'Get the shortest list of who pays whom, and record each payment as it happens.',
  },
]

function Features() {
  return (
    <section id="features" aria-labelledby="features-heading" className="scroll-mt-20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading id="features-heading" eyebrow="What it does" title="Everything a shared tab needs, nothing it doesn't" />

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <li key={feature.title} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blush/45 text-wine">{feature.icon}</div>
              <h3 className="mt-4 font-semibold text-ink">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-stone-500">{feature.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// Each of these describes how the app actually works; nothing here is a promise it doesn't keep.
const differences: { title: string; text: ReactNode }[] = [
  {
    title: 'Exact to the paisa',
    text: "Money is handled in whole paise, never as floating point. When a total doesn't divide evenly, the spare paise go out one at a time in a fixed order, so the shares always add back up to exactly the total. The form shows each person's share before you save.",
  },
  {
    title: 'Fewer payments, honestly',
    text: "Suggestions pair the biggest debt with the biggest credit, which never takes more than one payment fewer than the number of people with a balance. That isn't guaranteed to be the absolute minimum in every case (finding that is NP-hard), and SettleUp doesn't claim it is.",
  },
  {
    title: 'Balances that always add up',
    text: 'Nothing is kept as a running total. Balances are worked out from the expenses and payments each time, so deleting one can never leave them out of step, and across a group they always sum to zero.',
  },
  {
    title: 'No double entries',
    text: "Saving an expense or a payment is safe to retry. If your connection drops halfway, trying again won't record it twice.",
  },
]

function WhyDifferent() {
  return (
    <section id="why" aria-labelledby="why-heading" className="scroll-mt-20 border-y border-stone-200 bg-white py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
        <div>
          <SectionHeading id="why-heading" eyebrow="Why SettleUp" title="Built around getting the money right" />
          <p className="mt-4 text-stone-600">
            Splitting a bill is simple until the numbers stop dividing cleanly or the list of who owes whom gets long.
            SettleUp is a small app that takes those two parts seriously.
          </p>
          <p className="mt-4 text-sm text-stone-500">
            It's open source. Read the{' '}
            <a href={FRONTEND_REPO} className="font-medium text-rose hover:underline">
              web app
            </a>{' '}
            and the{' '}
            <a href={BACKEND_REPO} className="font-medium text-rose hover:underline">
              API
            </a>{' '}
            on GitHub.
          </p>
        </div>

        <dl className="grid gap-6 sm:grid-cols-2">
          {differences.map((item) => (
            <div key={item.title} className="border-l-2 border-rose/60 pl-4">
              <dt className="font-semibold text-ink">{item.title}</dt>
              <dd className="mt-1.5 text-sm text-stone-600">{item.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function ClosingCta() {
  return (
    <section aria-labelledby="cta-heading" className="py-16 sm:py-20">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 id="cta-heading" className="text-2xl font-semibold tracking-tight text-ink">
            Got a trip or a flat to split?
          </h2>
          <p className="mt-1 text-stone-500">Make an account, start a group and add your first expense.</p>
        </div>
        <Link to="/register" className={buttonClasses({ size: 'lg' })}>
          Get started
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  )
}

function SectionHeading({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold tracking-wide text-rose uppercase">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {title}
      </h2>
    </div>
  )
}

function LandingFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Logo tone="dark" />
          <p className="mt-2 text-sm text-stone-500">Split shared expenses and settle up.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-600">
          {sectionLinks.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </a>
          ))}
          <Link to="/login" className="hover:text-ink">
            Log in
          </Link>
          <Link to="/register" className="hover:text-ink">
            Sign up
          </Link>
          <a href={FRONTEND_REPO} className="hover:text-ink">
            Source code
          </a>
        </nav>
      </div>
      <div className="border-t border-stone-100">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-stone-500 sm:px-6">© {new Date().getFullYear()} SettleUp</p>
      </div>
    </footer>
  )
}
