import { TokenEntitlementStruct } from 'use-zion-client'

// Evan TODO: pass tokenIds too
// TBD if we need other params, they can be added one at a time
export function createTokenEntitlementStruct({
    contractAddress,
    tokenIds,
}: {
    contractAddress: string
    tokenIds?: number[]
}): TokenEntitlementStruct {
    return {
        contractAddress,
        isSingleToken: false,
        quantity: 1,
        tokenIds: tokenIds ?? [],
    }
}

export const EVERYONE_ADDRESS = '0x0000000000000000000000000000000000000001'
export const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export function isEveryoneAddress(address: string): boolean {
    return address === EVERYONE_ADDRESS
}

export function isEthAddress(address: string): boolean {
    return address === ETH_ADDRESS
}
