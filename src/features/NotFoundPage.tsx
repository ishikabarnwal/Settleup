import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '../components/ui/EmptyState'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Page not found')

  return (
    <EmptyState
      icon={<Compass className="size-6" />}
      title="There's nothing here"
      action={
        <Link to="/" className="font-medium text-rose hover:underline">
          Back to your groups
        </Link>
      }
    >
      The page you're looking for doesn't exist or has moved.
    </EmptyState>
  )
}
