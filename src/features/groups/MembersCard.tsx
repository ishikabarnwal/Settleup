import { UserMinus, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Input } from '../../components/ui/Field'
import { ApiError, errorMessage } from '../../lib/api'
import { useCurrentUser } from '../../lib/auth'
import { useAddMember, useRemoveMember } from '../../lib/queries'
import type { GroupMember } from '../../lib/types'

const emailSchema = z.email()

export function MembersCard({
  groupId,
  groupName,
  members,
}: {
  groupId: number
  groupName: string
  members: GroupMember[]
}) {
  const me = useCurrentUser()
  // Only the owner can remove people, so only the owner gets the buttons.
  const iAmOwner = members.some((m) => m.id === me.id && m.role === 'OWNER')
  const [removing, setRemoving] = useState<GroupMember | null>(null)
  const addMember = useAddMember(groupId)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = email.trim()
    if (!value) return setError('Enter their email')
    if (!emailSchema.safeParse(value).success) return setError('Enter a valid email address')

    setError(null)
    addMember.mutate(value, {
      onSuccess: (group) => {
        const added = group.members.find((m) => m.email.toLowerCase() === value.toLowerCase())
        toast.success(`${added?.name ?? value} joined the group`)
        setEmail('')
      },
      // The backend's messages are already specific ("No user is registered
      // with ...", "Riya is already in this group"), so show them as they are.
      onError: (err) => setError(err instanceof ApiError ? err.message : errorMessage(err)),
    })
  }

  return (
    <section aria-labelledby="members-heading" className="rounded-card bg-surface shadow-card">
      <header className="flex items-center justify-between px-6 pt-6 pb-4">
        <h2 id="members-heading" className="font-semibold text-ink">
          Members
        </h2>
        <span className="rounded-full bg-sunken px-2 py-1 text-xs font-medium text-stone-600">{members.length}</span>
      </header>

      <ul className="divide-y divide-stone-100 px-2">
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar id={member.id} name={member.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-stone-900">
                {member.name}
                {member.id === me.id && <span className="font-normal text-stone-500"> (you)</span>}
              </p>
              <p className="truncate text-xs text-stone-500">{member.email}</p>
            </div>
            {member.role === 'OWNER' && (
              <span className="rounded-full bg-plum/8 px-2 py-1 text-xs font-medium text-plum">Owner</span>
            )}
            {iAmOwner && member.role !== 'OWNER' && (
              <Button
                size="sm"
                variant="ghost"
                className="-mr-2 px-2 text-stone-500 hover:text-rose"
                icon={<UserMinus className="size-4" />}
                aria-label={`Remove ${member.name}`}
                title={`Remove ${member.name}`}
                onClick={() => setRemoving(member)}
              />
            )}
          </li>
        ))}
      </ul>

      <form noValidate onSubmit={submit} className="m-2 mt-2 rounded-[1rem] bg-sunken/60 p-4">
        <label htmlFor="add-member-email" className="text-sm font-medium text-stone-700">
          Add someone
        </label>
        <p className="mt-1 mb-3 text-xs text-stone-500">They need a SettleUp account already.</p>
        <div className="flex gap-2">
          <Input
            id="add-member-email"
            type="email"
            placeholder="friend@example.com"
            value={email}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'add-member-error' : undefined}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
          />
          <Button type="submit" variant="secondary" loading={addMember.isPending} icon={<UserPlus className="size-4" />}>
            Add
          </Button>
        </div>
        {error && (
          <p id="add-member-error" role="alert" className="mt-2 text-sm text-rose">
            {error}
          </p>
        )}
      </form>

      <RemoveMemberDialog groupId={groupId} groupName={groupName} member={removing} onClose={() => setRemoving(null)} />
    </section>
  )
}

function RemoveMemberDialog({
  groupId,
  groupName,
  member,
  onClose,
}: {
  groupId: number
  groupName: string
  member: GroupMember | null
  onClose: () => void
}) {
  const removeMember = useRemoveMember(groupId)
  const close = () => {
    removeMember.reset()
    onClose()
  }

  return (
    <ConfirmDialog
      open={member !== null}
      title={member ? `Remove ${member.name}?` : 'Remove member?'}
      confirmLabel="Remove"
      pending={removeMember.isPending}
      // The usual refusal is a balance that isn't zero yet; the backend says
      // whose and how much, so show its message as is.
      error={removeMember.isError ? errorMessage(removeMember.error) : null}
      onClose={close}
      onConfirm={() =>
        member &&
        removeMember.mutate(member.id, {
          onSuccess: () => {
            toast.success(`${member.name} was removed from ${groupName}`)
            close()
          },
        })
      }
    >
      {member && (
        <p>
          <span className="font-medium text-stone-900">{member.name}</span> will lose access to {groupName}. Their past
          expenses and payments stay in the history. People can only be removed once they're settled up.
        </p>
      )}
    </ConfirmDialog>
  )
}
