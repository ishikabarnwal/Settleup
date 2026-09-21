/**
 * Money helpers. Anything that adds or splits amounts works in paise (whole
 * numbers) so it matches the backend exactly and never picks up floating point
 * drift. The splitting rules are a copy of the backend's MoneySplitter, used to
 * preview shares before an expense is saved.
 */

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoney(amount: number): string {
  return inr.format(amount)
}

export function formatPaise(paise: number): string {
  return inr.format(paise / 100)
}

/** Amounts from the API are numbers with up to two decimals. */
export function toPaise(amount: number): number {
  return Math.round(amount * 100)
}

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

/** Parses user input like "12", "12.5" or "12.50" into paise, or null if it isn't a valid amount. */
export function parseAmount(input: string): number | null {
  const value = input.trim()
  if (!AMOUNT_PATTERN.test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  // Past this, JavaScript numbers stop being exact. Nobody splits that much.
  return Number.isSafeInteger(paise) ? paise : null
}

/** Same format as amounts, but in hundredths of a percent (100% = 10000). */
export function parsePercent(input: string): number | null {
  return parseAmount(input)
}

export const FULL_PERCENT = 10_000

/**
 * Even split. Leftover paise go one each to the lowest user ids, so the
 * result is stable and always adds back up to the total.
 */
export function splitEqually(totalPaise: number, userIds: number[]): Map<number, number> {
  const ids = [...userIds].sort((a, b) => a - b)
  const shares = new Map<number, number>()
  if (ids.length === 0) return shares

  const base = Math.floor(totalPaise / ids.length)
  const remainder = totalPaise % ids.length

  ids.forEach((id, index) => shares.set(id, base + (index < remainder ? 1 : 0)))
  return shares
}

/**
 * Percentage split, percentages in hundredths. Each share is rounded down and
 * the paise lost to rounding go one each to the lowest user ids.
 */
export function splitByPercentage(totalPaise: number, hundredthsByUserId: Map<number, number>): Map<number, number> {
  const ids = [...hundredthsByUserId.keys()].sort((a, b) => a - b)
  const shares = new Map<number, number>()
  let allocated = 0

  for (const id of ids) {
    // BigInt keeps paise x hundredths exact even for very large amounts.
    const share = Number((BigInt(totalPaise) * BigInt(hundredthsByUserId.get(id) ?? 0)) / BigInt(FULL_PERCENT))
    shares.set(id, share)
    allocated += share
  }

  let leftover = totalPaise - allocated
  for (const id of ids) {
    if (leftover <= 0) break
    shares.set(id, (shares.get(id) ?? 0) + 1)
    leftover--
  }

  return shares
}
