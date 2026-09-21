import { useEffect } from 'react'

/** Sets the tab title as "Page · SettleUp", or just "SettleUp" with no page. */
export function useDocumentTitle(page?: string | null) {
  useEffect(() => {
    document.title = page ? `${page} · SettleUp` : 'SettleUp'
  }, [page])
}
