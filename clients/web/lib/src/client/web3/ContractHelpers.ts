import { SpaceDataTypes } from './shims/SpaceShim'
import { SpaceFactoryDataTypes } from './shims/SpaceFactoryShim'
import { ZionClient } from '../ZionClient'
import { getContractsInfo } from './IStaticContractsInfo'

export function getZionTokenAddress(chainId: number): string {
    const contractInfo = getContractsInfo(chainId)
    if (!contractInfo) {
        throw new Error(`Contract info for chainId ${chainId} is not found.`)
    }
    return contractInfo.council.address.councilnft
}

// todo: v1 - remove
export interface CreateTokenEntitlementDataInfo {
    contractAddress: string
    quantity?: number
    isSingleToken?: boolean
    tokenId?: number
}

export function createExternalTokenStruct(
    tokenAddresses: string[],
): SpaceFactoryDataTypes.ExternalTokenStruct[] {
    const tokenStruct: SpaceFactoryDataTypes.ExternalTokenStruct[] = tokenAddresses.map(
        (address) => ({
            contractAddress: address,
            isSingleToken: false,
            quantity: 1,
            tokenIds: [],
        }),
    )
    return tokenStruct
}

export async function getFilteredRolesFromSpace(
    client: ZionClient,
    spaceNetworkId: string,
): Promise<SpaceDataTypes.RoleStructOutput[]> {
    const spaceRoles = await client.spaceDapp.getRoles(spaceNetworkId)
    const filteredRoles: SpaceDataTypes.RoleStructOutput[] = []
    // Filter out space roles which won't work when creating a channel
    for (const r of spaceRoles) {
        const permissions = await client.spaceDapp.getPermissionsByRoleId(
            spaceNetworkId,
            r.roleId.toNumber(),
        )
        // Filter out roles which have no permissions & the Owner role
        if (permissions.length && r.name !== 'Owner') {
            filteredRoles.push(r)
        }
    }
    return filteredRoles
}
