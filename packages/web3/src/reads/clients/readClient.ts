import { createPublicClient, http, PublicClient, Transport } from 'viem'
import { ChainId, getChain } from './get-chain'

export type ReadClient = ReturnType<typeof createReadClient>

/**
 * Creates a new PublicClient for the given chain.
 * Each call creates a fresh client - caching is the responsibility of the caller (e.g., makeApp).
 * This allows for flexible composition and better test isolation.
 */
export function createReadClient(args: {
    chainId: ChainId
    url: string
    multicall?: boolean
}): PublicClient<Transport, ReturnType<typeof getChain>> {
    const { chainId, url, multicall = true } = args
    const chain = getChain(chainId)

    return createPublicClient({
        chain,
        transport: http(url),
        batch: {
            multicall, // Enable automatic multicall batching
        },
    })
}
