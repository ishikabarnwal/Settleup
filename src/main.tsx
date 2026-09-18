import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { Toaster, toast } from 'sonner'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ApiError, errorMessage } from './lib/api'
import { AuthProvider } from './lib/auth'
import './index.css'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // A failed first load shows its own error state in the page. A failed
    // refresh of data that's already on screen would otherwise go unnoticed,
    // so say so, once, without throwing away what's shown.
    onError: (error, query) => {
      if (query.state.data === undefined) return
      if (error instanceof ApiError && error.status === 401) return
      toast.error("Couldn't refresh", { id: 'refresh-failed', description: errorMessage(error) })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      // A 4xx won't fix itself on a retry; a dropped connection might.
      retry: (failureCount, error) => !(error instanceof ApiError && error.status >= 400) && failureCount < 2,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <Toaster
              position="top-center"
              toastOptions={{
                classNames: {
                  toast: 'rounded-xl border border-stone-200 bg-white text-stone-900 shadow-lg',
                  description: 'text-stone-500',
                  error: 'border-rose/30',
                },
              }}
            />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
