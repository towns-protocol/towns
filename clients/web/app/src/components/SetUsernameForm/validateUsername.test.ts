import { describe, expect, test } from 'vitest'
import { validateUsername } from './validateUsername'

describe('validateUsernameTests', () => {
    test('username must be between 3 and 16 characters', () => {
        expect(validateUsername('')).toBe(false)
        expect(validateUsername('ab')).toBe(false)
        expect(validateUsername('abc')).toBe(true)
        expect(validateUsername('1234567812345678')).toBe(true)
        expect(validateUsername('12345678123456789')).toBe(false)
    })

    test('username must not contain special chars', () => {
        expect(validateUsername('abcde🙈')).toBe(false)
        expect(validateUsername('abcde-')).toBe(false)
        expect(validateUsername('abcde.')).toBe(false)
        expect(validateUsername('abcde?')).toBe(false)
        expect(validateUsername('abcde-')).toBe(false)
        expect(validateUsername('ab de')).toBe(false)

        // Underscore is allowed
        expect(validateUsername('abcde_')).toBe(true)
        // lowercase letters are allowed
        expect(validateUsername('abcde')).toBe(true)
        // uppercase letters are allowed
        expect(validateUsername('ABCDE')).toBe(true)
        // numbers are allowed
        expect(validateUsername('12345')).toBe(true)
    })
})
