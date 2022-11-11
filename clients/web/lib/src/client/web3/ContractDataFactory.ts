import { ZionClient } from '../ZionClient'
import { ethers } from 'ethers'
import { DataTypes } from './shims/ZionSpaceManagerShim'
import { getContractInfo } from './ZionContracts'

export const EVERYONE_ADDRESS = '0x0000000000000000000000000000000000000001'

export function createTokenEntitlementData(arg: {
    contractAddress: string
    quantity?: number
    isSingleToken?: boolean
    tokenId?: number
    tag?: string
}): DataTypes.ExternalTokenEntitlementStruct {
    const externalToken: DataTypes.ExternalTokenStruct = {
        contractAddress: arg.contractAddress,
        quantity: arg.quantity ?? 1,
        isSingleToken: arg.isSingleToken ?? false,
        tokenId: arg.tokenId ?? 0,
    }
    const externalTokenEntitlement: DataTypes.ExternalTokenEntitlementStruct = {
        tag: arg.tag ?? '',
        tokens: [externalToken],
    }

    return externalTokenEntitlement
}

export async function createRolesFromSpace(
    client: ZionClient,
    parentSpaceMatrixId: string,
): Promise<DataTypes.CreateRoleEntitlementDataStruct[]> {
    const contractInfo = getContractInfo(client.chainId)
    const spaceId = await client.spaceManager.unsigned.getSpaceIdByNetworkId(parentSpaceMatrixId)

    // get all the roles in the space
    const roles: DataTypes.CreateRoleEntitlementDataStruct[] = []
    const allSpaceRoles = await client.roleManager.unsigned.getRolesBySpaceId(spaceId)
    const abi = ethers.utils.defaultAbiCoder
    // set all the roles in the channel
    for (const r of allSpaceRoles) {
        if (r.name === 'Owner') {
            // Skip owner role. Not suppose to include it during creation
            continue
        }

        let roleData = await client.userGrantedEntitlementModule.unsigned.getEntitlementData(
            parentSpaceMatrixId,
            '',
            r.roleId,
        )
        if (roleData.length !== 0) {
            // User granted role
            // Todo: Contract only supports one user at a time. What to do if
            // there are more than one user?
            const encodedData = abi.encode(['address'], [roleData[0]])
            const newRole = {
                roleId: r.roleId,
                entitlementModule: contractInfo.spaceManager.addresses.usergranted,
                entitlementData: encodedData,
            }
            roles.push(newRole)
        } else {
            roleData = await client.tokenEntitlementModule.unsigned.getEntitlementData(
                parentSpaceMatrixId,
                '',
                r.roleId,
            )
            if (roleData.length !== 0) {
                // Token role
                const newRole = {
                    roleId: r.roleId,
                    entitlementModule: contractInfo.spaceManager.addresses.tokengranted,
                    entitlementData: roleData,
                }
                roles.push(newRole)
            }
        }
    }

    return roles
}
