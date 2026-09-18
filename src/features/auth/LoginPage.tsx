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

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email').pipe(z.email('Enter a valid email address')),
  password: z.string().min(1, 'Enter your password'),
})

type Values = z.infer<typeof schema>

export function LoginPage() {
  useDocumentTitle('Sign in')
  const { signIn } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const login = useMutation({
    mutationFn: api.login,
    // Signing in re-renders the page as signed in, and GuestOnly redirects from there.
    onSuccess: signIn,
    onError: (error) => setFormError(applyServerErrors(error, setError, ['email', 'password'])),
  })

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-rose hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form
        noValidate
        className="space-y-5"
        onSubmit={handleSubmit((values) => {
          setFormError(null)
          login.mutate(values)
        })}
      >
        <FormError message={formError} />

        <Field label="Email" error={errors.email?.message}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="email" autoFocus {...register('email')} />}
        </Field>

        <Field label="Password" error={errors.password?.message}>
          {(a11y) => <PasswordInput {...a11y} autoComplete="current-password" {...register('password')} />}
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
