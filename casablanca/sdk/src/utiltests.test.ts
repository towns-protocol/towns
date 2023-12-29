/**
 * @group main
 */

/**
 * we can't export and describe(...) in a .test file, so this is tests for util.test.ts
 */

import { waitFor } from './util.test'
import { hashString } from './utils'

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
                return i
            })
        } catch (err: any) {
            const errorMsg = stripAnsiColors(String(err))
            expect(errorMsg).toContain(
                'Error: expect(received).toEqual(expected) // deep equality\n\nExpected: 4\nReceived: 0',
            )
        }
        expect(r).toBeUndefined()
    })

    test('hashString', () => {
        expect(hashString('hello')).toEqual(
            '1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8',
        )

        expect(hashString('another string')).toEqual(
            '190b6b638e653f426b7e144f1db5ede7bdb1668e28f7ee0352f20f0678f29e09',
        )
    })
})
