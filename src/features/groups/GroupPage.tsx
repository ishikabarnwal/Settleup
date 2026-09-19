import clsx from 'clsx'
import { ArrowLeft, HandCoins, Lock, Plus, RefreshCw, SearchX, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { NetAmount } from '../../components/Amount'
import { AvatarStack } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageSpinner } from '../../components/ui/Spinner'
import { ApiError, errorMessage } from '../../lib/api'
import { useCurrentUser } from '../../lib/auth'
import { toPaise } from '../../lib/money'
import {
  useBalances,
  useDeleteGroup,
  useExpenses,
  useGroup,
  useSettlements,
  useSuggestedPayments,
} from '../../lib/queries'
import type { GroupDetail } from '../../lib/types'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { AddExpenseDialog } from '../expenses/AddExpenseDialog'
import { ExpenseList } from '../expenses/ExpenseList'
import { BalancesPanel } from '../settlements/BalancesPanel'
import { RecordPaymentDialog, type PaymentDraft } from '../settlements/RecordPaymentDialog'
import { SettleUpPanel } from '../settlements/SettleUpPanel'
import { NotFoundPage } from '../NotFoundPage'
import { MembersCard } from './MembersCard'

const tabs = [
  { id: 'expenses', label: 'Expenses' },
  { id: 'balances', label: 'Balances' },
  { id: 'settle', label: 'Settle up' },
] as const

type TabId = (typeof tabs)[number]['id']

export function GroupPage() {
  const { groupId: rawId } = useParams()
  const groupId = Number(rawId)

  if (!Number.isInteger(groupId) || groupId <= 0) return <NotFoundPage />
  // Keyed so moving between groups starts from a clean slate.
  return <GroupView key={groupId} groupId={groupId} />
}

function GroupView({ groupId }: { groupId: number }) {
  const group = useGroup(groupId)
  useDocumentTitle(group.data?.name ?? (group.isError ? 'Group' : null))

  if (group.isPending) return <GroupSkeleton />

  if (group.isError) {
    const status = group.error instanceof ApiError ? group.error.status : 0
    return (
      <div className="space-y-6">
        <BackLink />
        {status === 404 ? (
          <EmptyState icon={<SearchX className="size-6" />} title="This group doesn't exist">
            It may have been deleted, or the link is wrong.
          </EmptyState>
        ) : status === 403 ? (
          <EmptyState icon={<Lock className="size-6" />} title="You're not in this group">
            Ask someone in the group to add you by your email address.
          </EmptyState>
        ) : (
          <EmptyState
            icon={<RefreshCw className="size-6" />}
            title="Couldn't load this group"
            action={
              <Button variant="secondary" onClick={() => group.refetch()} loading={group.isFetching}>
                Try again
              </Button>
            }
          >
            {errorMessage(group.error)}
          </EmptyState>
        )}
      </div>
    )
  }

  return <GroupContent group={group.data} />
}

function GroupSkeleton() {
  return (
    <div className="animate-pulse space-y-8" aria-busy aria-label="Loading group">
      <div className="h-4 w-24 rounded bg-stone-200" />
      <div className="space-y-3">
        <div className="h-8 w-56 rounded bg-stone-200" />
        <div className="h-4 w-72 max-w-full rounded bg-stone-100" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="size-7 rounded-full bg-stone-200" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-card bg-surface shadow-card" />
          ))}
        </div>
        <div className="h-64 rounded-card bg-surface shadow-card" />
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-stone-500 transition hover:text-plum">
      <ArrowLeft className="size-4" />
      All groups
    </Link>
  )
}

function GroupContent({ group }: { group: GroupDetail }) {
  const me = useCurrentUser()
  const [searchParams, setSearchParams] = useSearchParams()
  const [addingExpense, setAddingExpense] = useState(false)
  const [payment, setPayment] = useState<PaymentDraft | null>(null)
  const [deletingGroup, setDeletingGroup] = useState(false)

  const requested = searchParams.get('tab')
  const tab: TabId = tabs.some((t) => t.id === requested) ? (requested as TabId) : 'expenses'
  const selectTab = (id: TabId) =>
    setSearchParams(id === 'expenses' ? {} : { tab: id }, { replace: true, preventScrollReset: true })

  const balances = useBalances(group.id)
  const myNet = balances.data ? toPaise(balances.data.find((b) => b.user.id === me.id)?.net ?? 0) : undefined

  return (
    <div className="space-y-6">
      <BackLink />

      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words text-ink sm:text-3xl">{group.name}</h1>
          {group.description && <p className="mt-2 text-stone-500">{group.description}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <AvatarStack people={group.members} />
            <p className="text-sm">
              {myNet === undefined ? (
                <span className="inline-block h-4 w-36 animate-pulse rounded bg-stone-200" />
              ) : (
                <NetAmount paise={myNet} you />
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="secondary" icon={<HandCoins className="size-4" />} onClick={() => setPayment({})}>
            Record payment
          </Button>
          <Button icon={<Plus className="size-4" />} onClick={() => setAddingExpense(true)}>
            Add expense
          </Button>
        </div>
      </header>

      {/* grid-cols-1 matters on phones: an implicit column sizes itself to the
          widest row, which pushed the page wider than the screen. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <div
            role="tablist"
            aria-label="Group sections"
            className="mb-6 inline-flex max-w-full gap-1 rounded-control bg-sunken p-1"
            onKeyDown={(event) => {
              const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
              if (!step) return
              event.preventDefault()
              // Start from the tab that has focus rather than state, which can
              // be a render behind when keys are pressed quickly.
              const focused = (event.target as HTMLElement).id.replace('tab-', '')
              const index = Math.max(0, tabs.findIndex((t) => t.id === focused))
              const next = tabs[(index + step + tabs.length) % tabs.length]
              selectTab(next.id)
              document.getElementById(`tab-${next.id}`)?.focus()
            }}
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => selectTab(t.id)}
                className={clsx(
                  'rounded-[0.5rem] px-4 py-2 text-sm font-medium whitespace-nowrap transition',
                  tab === t.id ? 'bg-surface text-plum shadow-card' : 'text-stone-600 hover:text-stone-900',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'expenses' && <ExpensesTab groupId={group.id} onAdd={() => setAddingExpense(true)} />}
            {tab === 'balances' && (
              <Loaded query={balances} what="balances">
                {(data) => <BalancesPanel balances={data} />}
              </Loaded>
            )}
            {tab === 'settle' && <SettleTab groupId={group.id} onRecord={setPayment} />}
          </div>
        </div>

        <aside className="space-y-4">
          <MembersCard groupId={group.id} groupName={group.name} members={group.members} />
          {group.createdBy === me.id && (
            <Button
              variant="danger"
              className="w-full"
              icon={<Trash2 className="size-4" />}
              onClick={() => setDeletingGroup(true)}
            >
              Delete group
            </Button>
          )}
        </aside>
      </div>

      <AddExpenseDialog
        groupId={group.id}
        members={group.members}
        open={addingExpense}
        onClose={() => setAddingExpense(false)}
      />
      <RecordPaymentDialog groupId={group.id} members={group.members} draft={payment} onClose={() => setPayment(null)} />
      <DeleteGroupDialog group={group} open={deletingGroup} onClose={() => setDeletingGroup(false)} />
    </div>
  )
}

function DeleteGroupDialog({ group, open, onClose }: { group: GroupDetail; open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const deleteGroup = useDeleteGroup(group.id)
  const close = () => {
    deleteGroup.reset()
    onClose()
  }

  return (
    <ConfirmDialog
      open={open}
      title={`Delete ${group.name}?`}
      confirmLabel="Delete group"
      pending={deleteGroup.isPending}
      error={deleteGroup.isError ? errorMessage(deleteGroup.error) : null}
      onClose={close}
      onConfirm={() =>
        deleteGroup.mutate(undefined, {
          onSuccess: () => {
            toast.success(`${group.name} was deleted`)
            navigate('/', { replace: true })
          },
        })
      }
    >
      <p>
        This permanently deletes <span className="font-medium text-stone-900">{group.name}</span> for all{' '}
        {group.members.length} {group.members.length === 1 ? 'member' : 'members'}, along with every expense and
        payment in it, even if people still owe each other. This can't be undone.
      </p>
    </ConfirmDialog>
  )
}

function ExpensesTab({ groupId, onAdd }: { groupId: number; onAdd: () => void }) {
  const expenses = useExpenses(groupId)
  return (
    <Loaded query={expenses} what="expenses">
      {(data) => <ExpenseList groupId={groupId} expenses={data} onAdd={onAdd} />}
    </Loaded>
  )
}

function SettleTab({ groupId, onRecord }: { groupId: number; onRecord: (draft: PaymentDraft) => void }) {
  const suggested = useSuggestedPayments(groupId)
  const history = useSettlements(groupId)

  return (
    <Loaded query={suggested} what="suggested payments">
      {(suggestedData) => (
        <Loaded query={history} what="payment history">
          {(historyData) => (
            <SettleUpPanel groupId={groupId} suggested={suggestedData} history={historyData} onRecord={onRecord} />
          )}
        </Loaded>
      )}
    </Loaded>
  )
}

type QueryLike<T> = {
  data: T | undefined
  isPending: boolean
  isError: boolean
  error: unknown
  isFetching: boolean
  refetch: () => unknown
}

/** Shows a spinner, an error with a retry, or the content, so each tab doesn't repeat it. */
function Loaded<T>({ query, what, children }: { query: QueryLike<T>; what: string; children: (data: T) => ReactNode }) {
  if (query.isPending) return <PageSpinner label={`Loading ${what}`} />
  if (query.isError || query.data === undefined) {
    return (
      <EmptyState
        icon={<RefreshCw className="size-6" />}
        title={`Couldn't load ${what}`}
        action={
          <Button variant="secondary" onClick={() => query.refetch()} loading={query.isFetching}>
            Try again
          </Button>
        }
      >
        {errorMessage(query.error)}
      </EmptyState>
    )
  }
  return <>{children(query.data)}</>
}
