import { SpaceIdentifier, ZionClientEvent } from '../client/ZionClientTypes'
import { useEffect, useMemo, useState } from 'react'

import { Permission } from '../client/web3/ContractTypes'
import { RoomIdentifier } from '../types/room-identifier'
import { SpaceInfo } from '../client/web3/SpaceInfo'
import { SpaceItem } from '../types/matrix-types'
import { createUserIdFromString } from '../types/user-identifier'
import { useMatrixCredentials } from './use-matrix-credentials'
import { useZionClient } from './use-zion-client'
import { useZionClientEvent } from './use-zion-client-event'
import { useZionContext } from '../components/ZionContextProvider'

type UseSpaceFromContractReturn = {
    spaces: SpaceIdentifier[]
    isLoading: boolean
    isError: boolean
}

export function useSpacesFromContract(): UseSpaceFromContractReturn {
    const { spaceDapp } = useZionClient()
    const { spaces: spaceRooms } = useZionContext()
    const [{ isLoading, spaces, isError }, setSpaceIdentifiers] =
        useState<UseSpaceFromContractReturn>({
            isError: false,
            isLoading: true,
            spaces: [],
        })
    const onNewSpace = useZionClientEvent(ZionClientEvent.NewSpace)
    const { userId } = useMatrixCredentials()
    const myWalletAddress = useMemo(() => {
        return userId ? createUserIdFromString(userId)?.accountAddress : undefined
    }, [userId])

    useEffect(() => {
        const getEntitledSpaceItems = async () => {
            if (!spaceDapp || !myWalletAddress) {
                return []
            }

            /* get all the entitlement status for each space */
            // create an array of promises to get all the entitlement status for each space
            const isEntitledPromises = spaceRooms.map((s: SpaceItem) =>
                spaceDapp?.isEntitledToSpace(s.id.networkId, myWalletAddress, Permission.Read),
            )
            // Wait for all the promises to resolve
            const entitledSpaces = await Promise.all(isEntitledPromises)
            // Filter out the spaces that the user is not entitled to see
            const entitledSpaceItems = entitledSpaces
                .map((isEntitled, index) => {
                    if (isEntitled) {
                        return spaceRooms[index]
                    }
                    return undefined
                })
                .filter((x) => x !== undefined) as SpaceItem[]
            return entitledSpaceItems
        }

        const getSpaces = async () => {
            const spaceItems = await getEntitledSpaceItems()
            if (!spaceDapp || spaceItems.length === 0) {
                setSpaceIdentifiers({
                    isError: false,
                    isLoading: false,
                    spaces: [],
                })
            }

            /* get all the space info */
            // create an array of promises to get all the space info
            const getSpaceInfoPromises = spaceItems
                .map((s: SpaceItem) => spaceDapp?.getSpaceInfo(s.id.networkId))
                .filter((x) => x !== undefined) as Promise<SpaceInfo>[]
            // Wait for all the promises to resolve
            const entitledSpaces = await Promise.all(getSpaceInfoPromises)
            const spaces = entitledSpaces.map((s: SpaceInfo) => {
                return {
                    key: s.networkId,
                    name: s.name,
                    networkId: s.networkId,
                    owner: s.owner,
                    disabled: s.disabled,
                }
            })

            // Return spaces that the user is entitled to see
            setSpaceIdentifiers({
                isError: false,
                isLoading: false,
                spaces,
            })
        }

        try {
            void getSpaces()
        } catch (e: unknown) {
            setSpaceIdentifiers({ isError: true, isLoading: false, spaces: [] })
        }
    }, [onNewSpace, spaceDapp, myWalletAddress, spaceRooms])

    return { spaces, isLoading, isError }
}

export function useSpaceFromContract(spaceId?: RoomIdentifier): {
    isLoading: boolean
    isError: boolean
    space: SpaceIdentifier | undefined
} {
    const { spaces, isLoading, isError } = useSpacesFromContract()
    return { isLoading, isError, space: spaces.find((x) => x.networkId === spaceId?.networkId) }
}
