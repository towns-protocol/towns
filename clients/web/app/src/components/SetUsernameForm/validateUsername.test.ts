import { describe, expect, test } from 'vitest'
import { validateUsername } from './validateUsername'

describe('validateUsernameTests', () => {
    test('username must be between 1 and 16 characters', () => {
        expect(validateUsername('')).toBe(false)
        expect(validateUsername('a')).toBe(true)
        expect(validateUsername('abc')).toBe(true)
        // 16 characters is allowed
        expect(validateUsername('1234567812345678')).toBe(true)
        // 17 characters is not allowed
        expect(validateUsername('12345678123456789')).toBe(false)
    })

    test('username must not contain special chars', () => {
        // emojis are not allowed
        expect(validateUsername('abcde🙈')).toBe(false)
        // dots are not allowed
        expect(validateUsername('abcde.')).toBe(false)
        // special chars are not allowed
        expect(validateUsername('abcde?')).toBe(false)
        // spaces are not allowed
        expect(validateUsername('ab de')).toBe(false)

        // dash is allowed
        expect(validateUsername('abcde-')).toBe(true)
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
