import { CreateSpaceInfo, RoomIdentifier } from 'types/matrix-types'

import { DataTypes } from '../client/web3/shims/ZionSpaceManagerShim'
import { Permission } from '../client/web3/ZionContractTypes'
import { createTokenEntitlementData } from '../client/web3/ContractDataFactory'
import { getContractInfo } from '../client/web3/ZionContracts'
import { useCallback } from 'react'
import { useZionClient } from './use-zion-client'

/**
 * Combine Matrix space creation and Smart Contract space
 * creation into one function.
 */
const TAG = '[useIntegratedSpaceManagement]'

export function useIntegratedSpaceManagement() {
    const { createWeb3Space, chainId } = useZionClient()

    const createSpaceWithZionTokenEntitlement = useCallback(
        async function (createInfo: CreateSpaceInfo): Promise<RoomIdentifier | undefined> {
            if (!chainId) {
                console.error('createSpaceWithZionTokenEntitlement::chainId is undefined')
                return undefined
            }

            const contractInfo = getContractInfo(chainId)
            const externalTokenEntitlement = createTokenEntitlementData({
                contractAddress: contractInfo.spaceManager.addresses.tokengranted,
            })

            const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }

            const tokenEntitlement: DataTypes.CreateSpaceEntitlementDataStruct = {
                permissions: [readPermission],
                roleName: 'Member',
                externalTokenEntitlements: [externalTokenEntitlement],
                users: [],
            }

            const everyonePermissions: DataTypes.PermissionStruct[] = []
            try {
                const roomId = await createWeb3Space(
                    createInfo,
                    tokenEntitlement,
                    everyonePermissions,
                )

                return roomId
            } catch (e: unknown) {
                console.error(TAG, e)
            }

            return undefined
        },
        [chainId, createWeb3Space],
    )

    return {
        createSpaceWithZionTokenEntitlement,
    }
}
