import { Component, type ErrorInfo, type ReactNode } from 'react'

type State = { error: Error | null }

/**
 * Last line of defence: if something throws while rendering, show a way out
 * instead of a blank white page. Deliberately plain, so it can't fail itself.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unexpected error while rendering', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div role="alert" className="flex min-h-dvh items-center justify-center bg-stone-50 px-6">
        <div className="max-w-sm text-center">
          <p className="text-sm font-medium tracking-wide text-rose uppercase">Something broke</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">This page ran into a problem</h1>
          <p className="mt-2 text-sm text-stone-500">
            Your data is safe on the server. Reloading usually sorts it out.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-10 rounded-lg bg-brand-button px-4 text-sm font-medium text-white"
            >
              Reload
            </button>
            <a
              href="/"
              className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-stone-700 ring-1 ring-stone-300 ring-inset"
            >
              Go to your groups
            </a>
          </div>
        </div>
      </div>
    )
  }
}
