import { describe, it, expect } from 'vitest'
import { formatFollowers, validateCredentials } from './creators'

describe('formatFollowers', () => {
  it('returns raw number as string for sub-thousand counts', () => {
    expect(formatFollowers(0)).toBe('0')
    expect(formatFollowers(999)).toBe('999')
  })

  it('formats thousands as K (rounded to integer)', () => {
    expect(formatFollowers(1_000)).toBe('1K')
    expect(formatFollowers(85_000)).toBe('85K')
    expect(formatFollowers(999_999)).toBe('1000K')
  })

  it('formats millions with one decimal and M suffix', () => {
    expect(formatFollowers(1_000_000)).toBe('1.0M')
    expect(formatFollowers(2_500_000)).toBe('2.5M')
  })
})

describe('validateCredentials', () => {
  it('returns the creator when slug and password both match', () => {
    const creator = validateCredentials('javii', 'javii2026')
    expect(creator).not.toBeNull()
    expect(creator?.slug).toBe('javii')
    expect(creator?.displayName).toBe('Javii')
  })

  it('returns null when the password is wrong', () => {
    expect(validateCredentials('javii', 'wrong-password')).toBeNull()
  })

  it('returns null when the slug does not exist', () => {
    expect(validateCredentials('nobody', 'whatever')).toBeNull()
  })

  it('is case-sensitive on both slug and password', () => {
    expect(validateCredentials('Javii', 'javii2026')).toBeNull()
    expect(validateCredentials('javii', 'JAVII2026')).toBeNull()
  })
})
