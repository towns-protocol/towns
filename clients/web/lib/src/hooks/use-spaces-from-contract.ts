import { SpaceIdentifier, ZionClientEvent } from '../client/ZionClientTypes'
import { useEffect, useState } from 'react'

import { useZionClient } from './use-zion-client'
import { useZionClientEvent } from './use-zion-client-event'
import { DataTypes } from 'client/web3/shims/ZionSpaceManagerShim'
import { RoomIdentifier } from 'types/matrix-types'

type UseSpaceFromContractReturn = {
    spaces: SpaceIdentifier[]
    isLoading: boolean
    isError: boolean
}

export function useSpacesFromContract(): UseSpaceFromContractReturn {
    const { spaceManager } = useZionClient()
    const [{ isLoading, spaces, isError }, setSpaceIdentifiers] =
        useState<UseSpaceFromContractReturn>({
            isError: false,
            isLoading: true,
            spaces: [],
        })
    const onNewSpace = useZionClientEvent(ZionClientEvent.NewSpace)

    useEffect(() => {
        if (!spaceManager) {
            return
        }
        void (async () => {
            try {
                const spaces = await spaceManager.getSpaces()
                setSpaceIdentifiers({
                    isError: false,
                    isLoading: false,
                    spaces:
                        spaces?.map((x: DataTypes.SpaceInfoStructOutput) => {
                            return {
                                key: x.spaceId.toString(),
                                spaceId: x.spaceId,
                                createdAt: x.createdAt,
                                name: x.name,
                                networkId: x.networkId,
                                creator: x.creator,
                                owner: x.owner,
                                disabled: x.disabled,
                            }
                        }) || [],
                })
            } catch (e: unknown) {
                setSpaceIdentifiers({ isError: true, isLoading: false, spaces: [] })
            }
        })()
    }, [spaceManager, onNewSpace])

    return { spaces, isLoading, isError }
}

export function useSpaceFromContract(spaceId: RoomIdentifier): {
    isLoading: boolean
    isError: boolean
    space: SpaceIdentifier | undefined
} {
    const { spaces, isLoading, isError } = useSpacesFromContract()
    return { isLoading, isError, space: spaces.find((x) => x.networkId === spaceId.matrixRoomId) }
}
