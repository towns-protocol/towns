import { CreateSpaceInfo, RoomIdentifier } from 'types/matrix-types'

import { Permission } from '../client/web3/ZionContractTypes'
import { useCallback } from 'react'
import { useZionClient } from './use-zion-client'
import { getContractInfo } from '../client/web3/ZionContracts'
import { DataTypes } from 'client/web3/shims/ZionSpaceManagerShim'

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

            const externalToken: DataTypes.ExternalTokenStruct = {
                contractAddress: contractInfo.council.addresses.councilnft,
                quantity: 1,
                isSingleToken: false,
                tokenId: 0,
            }
            const externalTokenEntitlement: DataTypes.ExternalTokenEntitlementStruct = {
                tag: 'Council NFT Gate',
                tokens: [externalToken],
            }
            const tokenEntitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct = {
                permissions: [Permission.Read],
                roleName: 'Member',
                externalTokenEntitlement: externalTokenEntitlement,
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
