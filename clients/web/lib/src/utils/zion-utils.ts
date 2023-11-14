import * as allChains from 'wagmi/chains'

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
