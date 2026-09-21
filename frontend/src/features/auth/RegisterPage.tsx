import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Field, FormError, Input } from '../../components/ui/Field'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { applyServerErrors } from '../../lib/forms'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { AuthLayout } from './AuthLayout'
import { PasswordInput } from './PasswordInput'

// Same limits as the backend's RegisterRequest, so most mistakes are caught before sending.
const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(80, 'Name must be at most 80 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email')
    .max(160, 'Email must be at most 160 characters')
    .pipe(z.email('Enter a valid email address')),
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .max(72, 'Use at most 72 characters'),
})

type Values = z.infer<typeof schema>

export function RegisterPage() {
  useDocumentTitle('Create account')
  const { signIn } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const signUp = useMutation({
    mutationFn: api.register,
    // Signing in re-renders the page as signed in, and GuestOnly redirects from there.
    onSuccess: signIn,
    // A 409 is the backend saying the email is taken, which belongs under the email field.
    onError: (error) => setFormError(applyServerErrors(error, setError, ['name', 'email', 'password'], { 409: 'email' })),
  })

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Already have one?{' '}
          <Link to="/login" className="font-medium text-plum underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form
        noValidate
        className="space-y-5"
        onSubmit={handleSubmit((values) => {
          setFormError(null)
          signUp.mutate(values)
        })}
      >
        <FormError message={formError} />

        <Field label="Name" error={errors.name?.message}>
          {(a11y) => <Input {...a11y} autoComplete="name" autoFocus {...register('name')} />}
        </Field>

        <Field label="Email" error={errors.email?.message}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="email" {...register('email')} />}
        </Field>

        <Field label="Password" error={errors.password?.message} hint="At least 8 characters.">
          {(a11y) => <PasswordInput {...a11y} autoComplete="new-password" {...register('password')} />}
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={signUp.isPending}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
