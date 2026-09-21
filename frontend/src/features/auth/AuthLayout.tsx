import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Logo } from '../../components/Logo'
import { ProductPreview } from '../../components/ProductPreview'

/**
 * Sign in and sign up share this frame: the brand gradient on one side and a
 * plain form on the other. On phones the gradient shrinks to a header band.
 */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative overflow-hidden bg-ink px-6 pt-8 pb-12 text-white sm:px-12 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link to="/" className="relative w-fit rounded-control" aria-label="SettleUp home">
          <Logo />
        </Link>

        <div className="relative mt-8 max-w-md lg:mt-0">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Split the bill.
            <br />
            <span className="text-blush">Keep the friends.</span>
          </h1>
          <p className="mt-4 hidden text-base text-white/75 sm:block lg:text-lg">
            Track shared expenses with your flatmates, trips and teams, and settle up in as few payments as possible.
          </p>
        </div>

        <ProductPreview className="mt-10 hidden lg:block" />
      </aside>

      <main className="flex items-start justify-center px-6 py-12 sm:px-12 lg:items-center">
        <div className="w-full max-w-md rounded-panel bg-surface p-8 shadow-raised sm:p-12">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">{title}</h2>
          <p className="mt-2 text-sm text-stone-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
