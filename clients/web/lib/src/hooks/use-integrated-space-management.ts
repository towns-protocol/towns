import { CreateSpaceInfo, RoomIdentifier } from 'types/matrix-types'

import { DataTypes } from '@harmony/contracts/localhost/typings/types/ZionSpaceManager'
import { Permission } from '../client/web3/ZionContractTypes'
import { useCallback } from 'react'
import { useZionClient } from './use-zion-client'
import { getContractInfo } from '../client/web3/ZionContracts'

/**
 * Combine Matrix space creation and Smart Contract space
 * creation into one function.
 */
const TAG = '[useIntegratedSpaceManagement]'

export function useIntegratedSpaceManagement() {
    const { createWeb3SpaceWithTokenEntitlement, chainId } = useZionClient()

    const createSpaceWithZionTokenEntitlement = useCallback(
        async function (createInfo: CreateSpaceInfo): Promise<RoomIdentifier | undefined> {
            if (!chainId) {
                console.error('createSpaceWithZionTokenEntitlement::chainId is undefined')
                return undefined
            }
            const contractInfo = getContractInfo(chainId)
            const tokenEntitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct = {
                entitlementModuleAddress: contractInfo.spaceManager.addresses.tokengranted,
                tokenAddress: contractInfo.council.addresses.councilnft,
                quantity: 1,
                description: 'Zion Council NFT',
                permissions: [Permission.Read],
                roleName: 'Member',
            }

            try {
                const roomId = await createWeb3SpaceWithTokenEntitlement(
                    createInfo,
                    tokenEntitlement,
                )

                return roomId
            } catch (e: unknown) {
                console.error(TAG, e)
            }

            return undefined
        },
        [chainId, createWeb3SpaceWithTokenEntitlement],
    )

    return {
        createSpaceWithZionTokenEntitlement,
    }
}
