import { useEffect } from 'react'
import { useLocation } from 'react-router'

/** Moving to another page starts at the top, like a normal page load would. Tab changes (?tab=) don't count. */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
