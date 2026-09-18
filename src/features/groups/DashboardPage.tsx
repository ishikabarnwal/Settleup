import clsx from 'clsx'
import { ArrowRight, Plus, RefreshCw, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { NetAmount } from '../../components/Amount'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { errorMessage } from '../../lib/api'
import { useCurrentUser } from '../../lib/auth'
import { formatDate } from '../../lib/dates'
import { formatPaise, toPaise } from '../../lib/money'
import { useBalancesForGroups, useGroups } from '../../lib/queries'
import type { GroupSummary, MemberBalance } from '../../lib/types'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { CreateGroupDialog } from './CreateGroupDialog'

export function DashboardPage() {
  useDocumentTitle('Your groups')
  const user = useCurrentUser()
  const [creating, setCreating] = useState(false)

  const groups = useGroups()
  const balances = useBalancesForGroups(groups.data)

  // Your net in each group, once that group's balances have loaded.
  const myNetByGroup = new Map<number, number>()
  groups.data?.forEach((group, index) => {
    const rows: MemberBalance[] | undefined = balances[index]?.data
    const mine = rows?.find((row) => row.user.id === user.id)
    if (rows) myNetByGroup.set(group.id, mine ? toPaise(mine.net) : 0)
  })

  const allLoaded = groups.data !== undefined && myNetByGroup.size === groups.data.length
  const owedToYou = [...myNetByGroup.values()].filter((n) => n > 0).reduce((a, b) => a + b, 0)
  const youOwe = [...myNetByGroup.values()].filter((n) => n < 0).reduce((a, b) => a - b, 0)

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-ink px-5 py-6 text-white sm:px-8 sm:py-8">
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-rose/35 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-plum/70 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-white/70">Hi, {user.name.split(' ')[0]}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Your groups</h1>
          </div>

          {groups.data && groups.data.length > 0 && (
            <dl className="grid grid-cols-2 gap-3 sm:flex sm:gap-4" aria-busy={!allLoaded}>
              <Summary label="You're owed" value={allLoaded ? formatPaise(owedToYou) : '…'} tone="text-emerald-300" />
              <Summary label="You owe" value={allLoaded ? formatPaise(youOwe) : '…'} tone="text-blush" />
            </dl>
          )}
        </div>
      </section>

      <section aria-labelledby="groups-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="groups-heading" className="text-sm font-semibold tracking-wide text-stone-500 uppercase">
            {groups.data?.length ? `${groups.data.length} ${groups.data.length === 1 ? 'group' : 'groups'}` : 'Groups'}
          </h2>
          {groups.data && groups.data.length > 0 && (
            <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              New group
            </Button>
          )}
        </div>

        {groups.isPending ? (
          <GroupGridSkeleton />
        ) : groups.isError ? (
          <EmptyState
            icon={<RefreshCw className="size-6" />}
            title="Couldn't load your groups"
            action={
              <Button variant="secondary" onClick={() => groups.refetch()} loading={groups.isFetching}>
                Try again
              </Button>
            }
          >
            {errorMessage(groups.error)}
          </EmptyState>
        ) : groups.data.length === 0 ? (
          <EmptyState
            icon={<Users className="size-6" />}
            title="No groups yet"
            action={
              <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                Create your first group
              </Button>
            }
          >
            Make a group for a trip, your flat or anything else you split, then add people by email.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.data.map((group) => (
              <li key={group.id}>
                <GroupCard group={group} myNet={myNetByGroup.get(group.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <CreateGroupDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

function Summary({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl bg-white/8 px-4 py-3 ring-1 ring-white/10 sm:min-w-40">
      <dt className="text-xs text-white/65">{label}</dt>
      <dd className={clsx('mt-0.5 text-lg font-semibold tabular-nums', tone)}>{value}</dd>
    </div>
  )
}

function GroupCard({ group, myNet }: { group: GroupSummary; myNet: number | undefined }) {
  return (
    <Link
      to={`/groups/${group.id}`}
      className="group flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-ink">{group.name}</h3>
        <ArrowRight className="mt-0.5 size-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-rose" />
      </div>
      {group.description ? (
        <p className="mt-1 line-clamp-2 text-sm text-stone-500">{group.description}</p>
      ) : (
        <p className="mt-1 text-sm text-stone-400">No description</p>
      )}

      <div className="mt-auto pt-5">
        <p className="text-sm">
          {myNet === undefined ? <span className="inline-block h-4 w-32 animate-pulse rounded bg-stone-200" /> : <NetAmount paise={myNet} you />}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-500">
          <Users className="size-3.5" />
          {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
          <span aria-hidden>·</span>
          Created {formatDate(group.createdAt)}
        </p>
      </div>
    </Link>
  )
}

function GroupGridSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading groups" aria-busy>
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-40 animate-pulse rounded-2xl border border-stone-200 bg-white p-5">
          <div className="h-4 w-2/5 rounded bg-stone-200" />
          <div className="mt-3 h-3 w-4/5 rounded bg-stone-100" />
          <div className="mt-14 h-3 w-1/3 rounded bg-stone-100" />
        </li>
      ))}
    </ul>
  )
}
