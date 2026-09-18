import { UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { ApiError, errorMessage } from '../../lib/api'
import { useCurrentUser } from '../../lib/auth'
import { useAddMember } from '../../lib/queries'
import type { GroupMember } from '../../lib/types'

const emailSchema = z.email()

export function MembersCard({ groupId, members }: { groupId: number; members: GroupMember[] }) {
  const me = useCurrentUser()
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
    <section aria-labelledby="members-heading" className="rounded-2xl border border-stone-200 bg-white">
      <header className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <h2 id="members-heading" className="font-semibold text-ink">
          Members
        </h2>
        <span className="text-sm text-stone-500">{members.length}</span>
      </header>

      <ul className="divide-y divide-stone-100">
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-3 px-5 py-3">
            <Avatar id={member.id} name={member.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-stone-900">
                {member.name}
                {member.id === me.id && <span className="font-normal text-stone-500"> (you)</span>}
              </p>
              <p className="truncate text-xs text-stone-500">{member.email}</p>
            </div>
            {member.role === 'OWNER' && (
              <span className="rounded-full bg-blush/50 px-2 py-0.5 text-xs font-medium text-wine">Owner</span>
            )}
          </li>
        ))}
      </ul>

      <form noValidate onSubmit={submit} className="border-t border-stone-100 px-5 py-4">
        <label htmlFor="add-member-email" className="text-sm font-medium text-stone-700">
          Add someone
        </label>
        <p className="mb-2 text-xs text-stone-500">They need a SettleUp account already.</p>
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
    </section>
  )
}
