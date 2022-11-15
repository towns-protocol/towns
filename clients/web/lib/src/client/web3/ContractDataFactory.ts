import { DataTypes } from './shims/ZionSpaceManagerShim'

export const EVERYONE_ADDRESS = '0x0000000000000000000000000000000000000001'

export function createTokenEntitlementData(arg: {
    contractAddress: string
    quantity?: number
    isSingleToken?: boolean
    tokenId?: number
}): DataTypes.ExternalTokenEntitlementStruct {
    const externalToken: DataTypes.ExternalTokenStruct = {
        contractAddress: arg.contractAddress,
        quantity: arg.quantity ?? 1,
        isSingleToken: arg.isSingleToken ?? false,
        tokenId: arg.tokenId ?? 0,
    }
    const externalTokenEntitlement: DataTypes.ExternalTokenEntitlementStruct = {
        tokens: [externalToken],
    }

    return externalTokenEntitlement
}
