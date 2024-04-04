import { ethers } from 'ethers'
import { PublicClient } from 'viem'

export function isEthersProvider(
    provider: ethers.providers.Provider | PublicClient,
): provider is ethers.providers.Provider {
    return (
        typeof provider === 'object' &&
        provider !== null &&
        'getNetwork' in provider &&
        typeof provider.getNetwork === 'function'
    )
}

export function isPublicClient(
    provider: ethers.providers.Provider | PublicClient,
): provider is PublicClient {
    return (
        typeof provider === 'object' &&
        provider !== null &&
        'getNetwork' in provider &&
        typeof provider.getNetwork !== 'function'
    )
}

// River space stream ids are 64 characters long, and start with '10'
// incidentally this should also work if you just pass the space contract address with 0x prefix
export function SpaceAddressFromSpaceId(spaceId: string): string {
    return ethers.utils.getAddress(spaceId.slice(2, 42))
}

/**
 * Use this function in the default case of a exhaustive switch statement to ensure that all cases are handled.
 * Always throws JSON RPC error.
 * @param value Switch value
 * @param message Error message
 * @param code JSON RPC error code
 * @param data Optional data to include in the error
 */
export function checkNever(value: never, message?: string): never {
    throw new Error(message ?? `Unhandled switch value ${value}`)
}
