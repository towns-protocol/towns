/**
 * we can't export and describe(...) in a .test file, so this is tests for util.test.ts
 */

import { waitFor } from './util.test'

function stripAnsiColors(input: string): string {
    // eslint-disable-next-line no-control-regex
    return input.replace(/\u001b\[\d+m/g, '')
}

describe('util.test', () => {
    /// test that you can wait for a result with an expect(...) and return a value
    test('waitFor succeeds', async () => {
        let i = 0
        const r = await waitFor(() => {
            i++
            expect(i).toEqual(4)
            return i
        })
        expect(r).toBe(4)
    })
    /// test that wait for will eventually fail with the correct error message
    test('waitFor fails', async () => {
        const i = 0
        let r: any
        try {
            r = await waitFor(() => {
                expect(i).toEqual(4)
            })
        } catch (err: Error | any) {
            const errorMsg = stripAnsiColors(String(err))
            expect(errorMsg).toContain(
                'Error: expect(received).toEqual(expected) // deep equality\n\nExpected: 4\nReceived: 0',
            )
        }

        expect(r).toBeUndefined()
    })
})
