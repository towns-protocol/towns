/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { DataTypes } from './shims/ZionSpaceManagerShim'
import Goerli_CouncilAddresses from '@harmony/contracts/goerli/addresses/council.json'
import Goerli_SpaceManagerAddresses from '@harmony/contracts/goerli/addresses/space-manager.json'
import Localhost_CouncilAddresses from '@harmony/contracts/localhost/addresses/council.json'
import Localhost_SpaceManagerAddresses from '@harmony/contracts/localhost/addresses/space-manager.json'
import { Permission } from './ZionContractTypes'
import { RoleManagerDataTypes } from './shims/ZionRoleManagerShim'
import { ZionClient } from '../../client/ZionClient'

export const EVERYONE_ADDRESS = '0x0000000000000000000000000000000000000001'

export interface IZionContractsInfo {
    spaceManager: {
        addresses: {
            spacemanager: string
            usergranted: string
            tokengranted: string
            rolemanager: string
        }
    }
    council: {
        addresses: { councilnft: string }
    }
}

/// get zion contract addresses for a given network id
export function getContractInfo(chainId: number): IZionContractsInfo {
    switch (chainId) {
        case 5:
            return {
                spaceManager: {
                    addresses: Goerli_SpaceManagerAddresses,
                },
                council: {
                    addresses: Goerli_CouncilAddresses,
                },
            }
        case 1337:
        case 31337:
            return {
                spaceManager: {
                    addresses: Localhost_SpaceManagerAddresses,
                },
                council: {
                    addresses: Localhost_CouncilAddresses,
                },
            }
        default:
            if (chainId !== 0) {
                console.error(
                    `Unsupported chainId, please add chainId: ${chainId} info to ZionContractAddresses.ts`,
                )
            }
            // return localhost, won't matter
            return {
                spaceManager: {
                    addresses: {
                        spacemanager: '',
                        usergranted: '',
                        tokengranted: '',
                        rolemanager: '',
                    },
                },
                council: {
                    addresses: { councilnft: '' },
                },
            }
    }
}

export function getZionTokenAddress(chainId: number): string {
    const contractInfo = getContractInfo(chainId)
    return contractInfo.council.addresses.councilnft
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
