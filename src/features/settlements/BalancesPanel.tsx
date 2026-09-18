import clsx from 'clsx'
import { Avatar } from '../../components/ui/Avatar'
import { NetAmount } from '../../components/Amount'
import { useCurrentUser } from '../../lib/auth'
import { formatPaise, toPaise } from '../../lib/money'
import type { MemberBalance } from '../../lib/types'

/**
 * Everyone's net position, with a bar either side of a centre line: green to
 * the right for people the group owes, rose to the left for people who owe.
 */
export function BalancesPanel({ balances }: { balances: MemberBalance[] }) {
  const me = useCurrentUser()
  const largest = Math.max(1, ...balances.map((b) => Math.abs(toPaise(b.net))))
  const allSquare = balances.every((b) => toPaise(b.net) === 0)

  return (
    <div className="rounded-2xl border border-stone-200 bg-white">
      {allSquare && (
        <p className="border-b border-stone-100 px-5 py-3 text-sm text-stone-600">
          Everyone is settled up. Nobody owes anything right now.
        </p>
      )}
      <ul className="divide-y divide-stone-100" aria-label="Balances">
        {balances.map((balance) => {
          const net = toPaise(balance.net)
          const width = `${(Math.abs(net) / largest) * 50}%`

          return (
            <li key={balance.user.id} className="px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar id={balance.user.id} name={balance.user.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-900">
                    {balance.user.name}
                    {balance.user.id === me.id && <span className="font-normal text-stone-500"> (you)</span>}
                  </p>
                  <p className="text-xs text-stone-500 tabular-nums">
                    Paid {formatPaise(toPaise(balance.totalPaid))} · share {formatPaise(toPaise(balance.totalShare))}
                  </p>
                </div>
                <NetAmount paise={net} className="text-right text-sm" />
              </div>

              <div aria-hidden className="relative mt-3 h-1.5 rounded-full bg-stone-100">
                <div className="absolute inset-y-0 left-1/2 w-px bg-stone-300" />
                {net !== 0 && (
                  <div
                    className={clsx('absolute inset-y-0 rounded-full', net > 0 ? 'left-1/2 bg-owed' : 'right-1/2 bg-owes')}
                    style={{ width }}
                  />
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
