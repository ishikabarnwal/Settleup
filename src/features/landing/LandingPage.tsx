import { ArrowRight, Divide, HandCoins, Scale, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Logo } from '../../components/Logo'
import { NavPill } from '../../components/NavPill'
import { buttonClasses, navItemClasses } from '../../components/ui/buttonStyles'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { Hero } from './Hero'

const FRONTEND_REPO = 'https://github.com/ishikabarnwal/settleup-frontend'
const BACKEND_REPO = 'https://github.com/ishikabarnwal/settleup-backend'

/** What signed-out visitors see at "/": what SettleUp is, before asking them to sign up. */
export function LandingPage() {
  useDocumentTitle('Split shared expenses')

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-surface px-4 py-2 text-sm font-medium text-plum shadow-raised focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
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
    <NavPill
      fixed
      center={
        <nav aria-label="Sections" className="flex items-center gap-1">
          {sectionLinks.map((link) => (
            <a key={link.href} href={link.href} className={navItemClasses()}>
              {link.label}
            </a>
          ))}
        </nav>
      }
      right={
        <>
          {/* Hidden on phones, where it's in the menu instead. A wrapper does the hiding
              so it can't fight the link's own display class. */}
          <div className="hidden sm:block">
            <Link to="/login" className={navItemClasses()}>
              Log in
            </Link>
          </div>
          <Link to="/register" className={buttonClasses({ variant: 'accent', size: 'md', pill: true })}>
            Sign up
          </Link>
        </>
      }
      menu={{
        label: 'Menu',
        content: (close) => (
          <nav aria-label="Menu" className="flex flex-col">
            {sectionLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={close} className="rounded-control px-4 py-3 text-sm text-white/85 hover:bg-white/10">
                {link.label}
              </a>
            ))}
            <Link to="/login" onClick={close} className="rounded-control px-4 py-3 text-sm text-white/85 hover:bg-white/10">
              Log in
            </Link>
          </nav>
        ),
      }}
    />
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
    <section id="features" aria-labelledby="features-heading" className="scroll-mt-24 py-16 sm:py-24">
      <div className="page-container">
        <SectionHeading id="features-heading" eyebrow="What it does" title="Everything a shared tab needs, nothing it doesn't" />

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <li key={feature.title} className="rounded-card bg-surface p-6 shadow-card">
              <div className="flex size-10 items-center justify-center rounded-control bg-plum/8 text-plum">{feature.icon}</div>
              <h3 className="mt-4 font-semibold text-ink">{feature.title}</h3>
              <p className="mt-2 text-sm text-stone-500">{feature.text}</p>
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
    <section id="why" aria-labelledby="why-heading" className="scroll-mt-24 py-16 sm:py-24">
      <div className="page-container grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
        <div>
          <SectionHeading id="why-heading" eyebrow="Why SettleUp" title="Built around getting the money right" />
          <p className="mt-4 text-stone-600">
            Splitting a bill is simple until the numbers stop dividing cleanly or the list of who owes whom gets long.
            SettleUp is a small app that takes those two parts seriously.
          </p>
          <p className="mt-4 text-sm text-stone-500">
            It's open source. Read the{' '}
            <a href={FRONTEND_REPO} className="font-medium text-plum underline-offset-4 hover:underline">
              web app
            </a>{' '}
            and the{' '}
            <a href={BACKEND_REPO} className="font-medium text-plum underline-offset-4 hover:underline">
              API
            </a>{' '}
            on GitHub.
          </p>
        </div>

        <dl className="grid gap-6 sm:grid-cols-2">
          {differences.map((item) => (
            <div key={item.title} className="rounded-card bg-surface p-6 shadow-card">
              <dt className="font-semibold text-ink">{item.title}</dt>
              <dd className="mt-2 text-sm text-stone-600">{item.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function ClosingCta() {
  return (
    <section aria-labelledby="cta-heading" className="pb-16 sm:pb-24">
      <div className="page-container">
        <div className="flex flex-col items-start gap-6 rounded-panel bg-surface p-8 shadow-raised sm:flex-row sm:items-center sm:justify-between sm:p-12">
          <div>
            <h2 id="cta-heading" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Got a trip or a flat to split?
            </h2>
            <p className="mt-2 text-stone-500">Make an account, start a group and add your first expense.</p>
          </div>
          <Link to="/register" className={buttonClasses({ size: 'lg' })}>
            Get started
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function SectionHeading({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold tracking-wide text-plum uppercase">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {title}
      </h2>
    </div>
  )
}

function LandingFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="page-container flex flex-col gap-8 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-white/65">Split shared expenses and settle up in fewer payments.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/75">
          {sectionLinks.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </a>
          ))}
          <Link to="/login" className="hover:text-white">
            Log in
          </Link>
          <Link to="/register" className="hover:text-white">
            Sign up
          </Link>
          <a href={FRONTEND_REPO} className="hover:text-white">
            Source code
          </a>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="page-container py-6 text-xs text-white/55">© {new Date().getFullYear()} SettleUp</p>
      </div>
    </footer>
  )
}
