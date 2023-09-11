import { TokenEntitlementStruct } from 'use-zion-client'

// Evan TODO: pass tokenIds too
// TBD if we need other params, they can be added one at a time
export function createTokenEntitlmentStruct({
    contractAddress,
}: {
    contractAddress: string
}): TokenEntitlementStruct {
    return {
        contractAddress,
        isSingleToken: false,
        quantity: 1,
        tokenIds: [],
    }
}
