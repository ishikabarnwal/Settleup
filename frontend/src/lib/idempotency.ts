/**
 * A fresh Idempotency-Key. A form keeps the same key until its request
 * succeeds, so a double click or a retry after a dropped connection gets the
 * original expense back from the backend instead of creating a second one.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  // randomUUID only exists in secure contexts (https or localhost).
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
