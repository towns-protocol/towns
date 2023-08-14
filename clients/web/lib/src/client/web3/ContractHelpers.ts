import { BigNumber, BigNumberish } from 'ethers'

import { BasicRoleInfo } from './ContractTypes'
import { TokenDataTypes } from './shims/TokenEntitlementShim'
import { ZionClient } from '../ZionClient'
import { getContractsInfo } from './IStaticContractsInfo'

export function getMemberNftAddress(chainId: number): string {
    const contractInfo = getContractsInfo(chainId)
    if (!contractInfo) {
        throw new Error(`Contract info for chainId ${chainId} is not found.`)
    }
    return contractInfo.memberNft.address
}

export function getPioneerNftAddress(chainId: number): string {
    const contractInfo = getContractsInfo(chainId)
    if (!contractInfo) {
        throw new Error(`Contract info for chainId ${chainId} is not found.`)
    }
    return contractInfo.pioneerNft.address
}

export function createExternalTokenStruct(
    tokenAddresses: string[],
): TokenDataTypes.ExternalTokenStruct[] {
    const tokenStruct: TokenDataTypes.ExternalTokenStruct[] = tokenAddresses.map((address) => ({
        contractAddress: address,
        isSingleToken: false,
        quantity: 1,
        tokenIds: [],
    }))
    return tokenStruct
}

export async function getFilteredRolesFromSpace(
    client: ZionClient,
    spaceNetworkId: string,
): Promise<BasicRoleInfo[]> {
    const spaceRoles = await client.spaceDapp.getRoles(spaceNetworkId)
    const filteredRoles: BasicRoleInfo[] = []
    // Filter out space roles which won't work when creating a channel
    for (const r of spaceRoles) {
        // Filter out roles which have no permissions & the Owner role
        if (r.name !== 'Owner') {
            filteredRoles.push(r)
        }
    }
    return filteredRoles
}

export function isRoleIdInArray(roleIds: BigNumber[], roleId: BigNumberish): boolean {
    for (const r of roleIds) {
        if (r.eq(roleId)) {
            return true
        }
    }
    return false
}
