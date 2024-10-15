import fs from 'fs/promises'
import pRetry from 'p-retry'
import pThrottle from 'p-throttle'
import PQueue from 'p-queue'

export type Unpromisify<T> = T extends Promise<infer U> ? U : T

export async function exists(path: string) {
    try {
        await fs.access(path, fs.constants.F_OK)
        return true
    } catch (e) {
        return false
    }
}

/**
 * An alternative to Promise.all, with retries, concurrency, and throttling.
 * Outputs are mapped in the order of the inputs.
 *
 * @param fn The async function to run on each item
 * @param items The items to run the function on
 * @param options The options for retries, concurrency, and throttling
 *
 * @returns An array promise that maps all inputs to the output of the function
 */
export async function withQueue<I, O>(
    fn: (item: I) => Promise<O>,
    items: I[],
    options: {
        retries: number
        concurrency: number
        throttle: {
            limit: number
            interval: number
        }
        onFailedAttempt: (input: I, error: Error) => void
    },
): Promise<O[]> {
    const withRetries = (input: I) =>
        pRetry(() => fn(input), {
            retries: options.retries,
            onFailedAttempt: (error) => {
                options.onFailedAttempt(input, error)
            },
        })

    const throttle = pThrottle(options.throttle)

    const results: {
        output: O
        index: number
    }[] = []

    const queue = new PQueue({ concurrency: options.concurrency })
    const throttled = throttle(withRetries)

    items.forEach((input, index) => {
        queue.add(async () => {
            const output = await throttled(input)
            results.push({
                output,
                index,
            })
        })
    })

    await queue.onIdle()

    results.sort((a, b) => a.index - b.index)

    return results.map((result) => result.output)
}
