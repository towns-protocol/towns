/**
 * @group main
 */

/**
 * we can't export and describe(...) in a .test file, so this is tests for util.test.ts
 */

import { waitFor, waitForValue } from '../testUtils'
import { hashString } from '../../utils'

function stripAnsiColors(input: string): string {
    // eslint-disable-next-line no-control-regex
    return input.replace(/\u001b\[\d+m/g, '')
}

describe('util.test', () => {
    test('waitFor succeeds', async () => {
        let i = 0
        await waitFor(() => {
            i++
            expect(i).toEqual(4)
        })
        expect(i).toBe(4)
    })
    /// test that wait for will eventually fail with the correct error message
    test('waitFor fails', async () => {
        const i = 0
        try {
            await waitFor(() => {
                expect(i).toEqual(4)
            })
        } catch (err: any) {
            const errorMsg = stripAnsiColors(String(err))
            expect(errorMsg).toContain('AssertionError: expected +0 to deeply equal 4')
        }
    })
    /// test that you can wait for a result with an expect(...) and return a value
    test('waitForValue succeeds', async () => {
        let i = 0
        const r = await waitForValue(() => {
            i++
            expect(i).toEqual(4)
            return i
        })
        expect(r).toBe(4)
    })
    /// test that wait for will eventually fail with the correct error message
    test('waitForValue fails', async () => {
        const i = 0
        let r: any
        try {
            r = await waitForValue(() => {
                expect(i).toEqual(4)
                return i
            })
        } catch (err: any) {
            const errorMsg = stripAnsiColors(String(err))
            expect(errorMsg).toContain('AssertionError: expected +0 to deeply equal 4')
        }
        expect(r).toBeUndefined()
    })

    test('waifForSucceedsAfterDuration', async () => {
        let myDelayedValue: string | undefined = undefined
        setTimeout(() => {
            myDelayedValue = 'hello'
        }, 500)

        const result = await waitForValue(
            () => {
                return myDelayedValue
            },
            { timeoutMS: 2000 },
        )
        expect(result).toBe('hello')
    })

    test('waifForSucceedsAfterDurationWithBool', async () => {
        let myDelayedValue: boolean = false
        setTimeout(() => {
            myDelayedValue = true
        }, 500)

        const result = await waitFor(
            () => {
                return myDelayedValue
            },
            { timeoutMS: 2000 },
        )
        expect(result).toBe(true)
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
