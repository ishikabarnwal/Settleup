import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Dialog, DialogForm } from '../../components/ui/Dialog'
import { Field, FormError, Input, Textarea } from '../../components/ui/Field'
import { applyServerErrors } from '../../lib/forms'
import { useCreateGroup } from '../../lib/queries'

// Matches the backend's CreateGroupRequest limits.
const schema = z.object({
  name: z.string().trim().min(1, 'Give the group a name').max(100, 'Name must be at most 100 characters'),
  description: z.string().trim().max(500, 'Description must be at most 500 characters'),
})

type Values = z.infer<typeof schema>

export function CreateGroupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const createGroup = useCreateGroup()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '', description: '' } })

  const close = () => {
    reset()
    setFormError(null)
    createGroup.reset()
    onClose()
  }

  const submit = handleSubmit((values) => {
    setFormError(null)
    createGroup.mutate(
      { name: values.name, description: values.description || undefined },
      {
        onSuccess: (group) => {
          toast.success(`${group.name} is ready`, { description: 'Add people by email to start splitting.' })
          close()
          navigate(`/groups/${group.id}`)
        },
        onError: (error) => setFormError(applyServerErrors(error, setError, ['name', 'description'])),
      },
    )
  })

  return (
    <Dialog
      open={open}
      onClose={close}
      title="New group"
      description="A trip, a flat, a team — anything you share costs with."
    >
      <DialogForm
        onSubmit={submit}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={createGroup.isPending}>
              Create group
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormError message={formError} />
          <Field label="Name" error={errors.name?.message}>
            {(a11y) => <Input {...a11y} placeholder="Goa trip" autoFocus {...register('name')} />}
          </Field>
          <Field label="Description (optional)" error={errors.description?.message}>
            {(a11y) => <Textarea {...a11y} placeholder="December, 4 nights" {...register('description')} />}
          </Field>
        </div>
      </DialogForm>
    </Dialog>
  )
}
