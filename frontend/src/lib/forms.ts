import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError, errorMessage } from './api'

/**
 * Puts the backend's answer where the user will see it. Validation errors
 * name the field (fieldErrors), so they go under that input; anything else
 * becomes a message for the whole form. Returns that message, or null if
 * every problem was attached to a field.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  messageFields: Partial<Record<number, Path<T>>> = {},
): string | null {
  if (!(error instanceof ApiError)) return errorMessage(error)

  const unplaced: string[] = []
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    if ((fields as readonly string[]).includes(field)) setError(field as Path<T>, { type: 'server', message })
    else unplaced.push(message)
  }

  // Some errors are really about one field even without fieldErrors, like a
  // 409 for an email that's already registered.
  const statusField = messageFields[error.status]
  if (statusField) {
    setError(statusField, { type: 'server', message: error.message })
    return null
  }

  if (Object.keys(error.fieldErrors).length > 0 && unplaced.length === 0) return null
  return unplaced.length > 0 ? unplaced.join('. ') : error.message
}
