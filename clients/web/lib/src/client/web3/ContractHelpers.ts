import { DataTypes } from './shims/ZionSpaceManagerShim'
import { Permission } from './ZionContractTypes'
import { RoleManagerDataTypes } from './shims/ZionRoleManagerShim'
import { ZionClient } from '../ZionClient'
import { getContractsInfo } from './ContractsInfo'

export function getZionTokenAddress(chainId: number): string {
    const contractInfo = getContractsInfo(chainId)
    if (!contractInfo) {
        throw new Error(`Contract info for chainId ${chainId} is not found.`)
    }
    return contractInfo.council.address.councilnft
}

export interface CreateTokenEntitlementDataInfo {
    contractAddress: string
    quantity?: number
    isSingleToken?: boolean
    tokenId?: number
}

function createTokenEntitlementData(
    arg: CreateTokenEntitlementDataInfo,
): DataTypes.ExternalTokenEntitlementStruct {
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

export function createExternalTokenEntitlements(
    tokenAddresses: string[],
): DataTypes.ExternalTokenEntitlementStruct[] {
    const externalTokens: CreateTokenEntitlementDataInfo[] = tokenAddresses.map((address) => ({
        contractAddress: address,
    }))
    return externalTokens.map((t) => createTokenEntitlementData(t))
}

export function createPermissions(permissions: Permission[]): DataTypes.PermissionStruct[] {
    const dataStruct: DataTypes.PermissionStruct[] = []
    for (const p of permissions) {
        dataStruct.push({ name: p })
    }
    return dataStruct
}

export async function getAllRolesFromSpace(
    client: ZionClient,
    spaceNetworkId: string,
): Promise<RoleManagerDataTypes.RoleStructOutput[]> {
    const spaceId = await client.spaceManager.unsigned.getSpaceIdByNetworkId(spaceNetworkId)
    // get all the roles in the space
    const allSpaceRoles = await client.roleManager.unsigned.getRolesBySpaceId(spaceId)
    return allSpaceRoles
}

export async function getFilteredRolesFromSpace(
    client: ZionClient,
    spaceNetworkId: string,
): Promise<RoleManagerDataTypes.RoleStructOutput[]> {
    const spaceRoles = await getAllRolesFromSpace(client, spaceNetworkId)
    const spaceId = await client.spaceManager.unsigned.getSpaceIdByNetworkId(spaceNetworkId)
    const filteredRoles: RoleManagerDataTypes.RoleStructOutput[] = []
    // Filter out space roles which won't work when creating a channel
    for (const r of spaceRoles) {
        const permissions = await client.roleManager.unsigned.getPermissionsBySpaceIdByRoleId(
            spaceId.toNumber(),
            r.roleId.toNumber(),
        )
        // Filter out roles which have no permissions & the Owner role
        if (permissions.length && r.name !== 'Owner') {
            filteredRoles.push(r)
        }
    }
    return filteredRoles
}
