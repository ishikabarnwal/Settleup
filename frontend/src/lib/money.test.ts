import { describe, expect, it } from 'vitest'
import { FULL_PERCENT, parseAmount, splitByPercentage, splitEqually } from './money'

// The same cases the backend's MoneySplitterTests use, so the preview in the
// add-expense form can't drift from what the server actually stores.

const sum = (shares: Map<number, number>) => [...shares.values()].reduce((a, b) => a + b, 0)

describe('parseAmount', () => {
  it('reads whole and decimal amounts into paise', () => {
    expect(parseAmount('12')).toBe(1200)
    expect(parseAmount('12.5')).toBe(1250)
    expect(parseAmount(' 0.05 ')).toBe(5)
  })

  it('rejects anything the backend would reject', () => {
    expect(parseAmount('10.001')).toBeNull()
    expect(parseAmount('-5')).toBeNull()
    expect(parseAmount('1e3')).toBeNull()
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('.5')).toBeNull()
    expect(parseAmount('99999999999999999.99')).toBeNull()
  })
})

describe('splitEqually', () => {
  it('hands leftover paise to the lowest ids', () => {
    expect([...splitEqually(10_000, [3, 1, 2])]).toEqual([
      [1, 3334],
      [2, 3333],
      [3, 3333],
    ])
  })

  it('always adds back up to the total', () => {
    for (let paise = 1; paise <= 50; paise++) {
      expect(sum(splitEqually(1000 + paise, [1, 2, 3, 4, 5, 6, 7]))).toBe(1000 + paise)
    }
  })
})

describe('splitByPercentage', () => {
  it('matches the backend on the 33.33 / 33.33 / 33.34 case', () => {
    const shares = splitByPercentage(1000, new Map([[3, 3334], [1, 3333], [2, 3333]]))
    expect([...shares]).toEqual([
      [1, 334],
      [2, 333],
      [3, 333],
    ])
  })

  it('rounds half a paisa the same way as an equal split', () => {
    expect([...splitByPercentage(5, new Map([[2, 5000], [1, 5000]]))]).toEqual([
      [1, 3],
      [2, 2],
    ])
  })

  it('stays exact for very large totals', () => {
    const total = 90_000_000_000_000_01
    const shares = splitByPercentage(total, new Map([[1, 3333], [2, FULL_PERCENT - 3333]]))
    expect(sum(shares)).toBe(total)
  })
})
