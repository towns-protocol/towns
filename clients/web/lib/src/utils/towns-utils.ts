import * as allChains from 'viem/chains'

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function sleepUntil<T, R>(
    thisObject: T,
    condition: (x: T) => R,
    timeoutMs = 2000,
    checkEveryMs = 100,
): Promise<R | undefined> {
    let currentMs = 0

    while (currentMs <= timeoutMs) {
        const result = condition(thisObject)
        if (result) {
            return result
        }
        await sleep(checkEveryMs)
        currentMs += checkEveryMs
    }

    return undefined
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function invariant(cond: any, message: string): asserts cond {
    if (!cond) {
        throw new Error(message)
    }
}

export function staticAssertNever(x: never): never {
    throw new Error('Unexpected object: ', x)
}

// https://chainlist.org/
// https://eips.ethereum.org/EIPS/eip-155#list-of-chain-ids
export function getChainName(chainId: number): string {
    const chain = Object.values(allChains).find((x) => x.id === chainId)
    if (chain) {
        return chain.name
    }
    throw new Error(`ChainId ${chainId} not found`)
}

export async function retryOperation<T>(
    operation: () => Promise<T>,
    options: {
        maxRetries?: number
        getRetryDelay?: (retryCount: number) => number
        onError?: (error: unknown, retryCount: number) => void
        onRetry?: (retryCount: number) => void
    } = {},
): Promise<T> {
    const maxRetries = options.maxRetries ?? 3
    const getRetryDelay =
        options.getRetryDelay ??
        ((retryCount: number) => {
            return Math.min(1000 * 2 ** retryCount, 20000) // 2, 4, 8 seconds if max retries is 3
        })

    let retryCount = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            return await operation()
        } catch (error) {
            retryCount++
            options.onError?.(error, retryCount)

            if (retryCount > maxRetries) {
                throw error
            }

            const retryDelay = getRetryDelay(retryCount)
            options.onRetry?.(retryCount)
            await new Promise((resolve) => setTimeout(resolve, retryDelay))
        }
    }
}
