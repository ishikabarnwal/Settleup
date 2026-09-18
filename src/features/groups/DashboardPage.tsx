import { useCurrentUser } from '../../lib/auth'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

export function DashboardPage() {
  useDocumentTitle('Your groups')
  const user = useCurrentUser()

  return (
    <h1 className="text-2xl font-semibold tracking-tight text-ink">Hi, {user.name.split(' ')[0]}</h1>
  )
}
