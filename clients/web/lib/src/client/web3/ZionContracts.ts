/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Goerli_SpaceManagerAddresses from '@harmony/contracts/goerli/addresses/space-manager.json'
import Goerli_CouncilAddresses from '@harmony/contracts/goerli/addresses/council.json'

import Localhost_SpaceManagerAddresses from '@harmony/contracts/localhost/addresses/space-manager.json'
import Localhost_CouncilAddresses from '@harmony/contracts/localhost/addresses/council.json'

import { ZionClient } from '../../client/ZionClient'
import { DataTypes } from './shims/ZionSpaceManagerShim'
import { RoleManagerDataTypes } from './shims/ZionRoleManagerShim'
import { Permission } from './ZionContractTypes'

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
    return contractInfo.spaceManager.addresses.tokengranted
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

export async function getRolesFromSpace(
    client: ZionClient,
    matrixSpaceId: string,
): Promise<RoleManagerDataTypes.RoleStructOutput[]> {
    const spaceId = await client.spaceManager.unsigned.getSpaceIdByNetworkId(matrixSpaceId)
    // get all the roles in the space
    const allSpaceRoles = await client.roleManager.unsigned.getRolesBySpaceId(spaceId)
    return allSpaceRoles
}

export function createPermissions(permissions: Permission[]): DataTypes.PermissionStruct[] {
    const dataStruct: DataTypes.PermissionStruct[] = []
    for (const p of permissions) {
        dataStruct.push({ name: p })
    }
    return dataStruct
}
