import { SpaceIdentifier, ZionClientEvent } from '../client/ZionClientTypes'
import { useEffect, useState } from 'react'

import { useZionClient } from './use-zion-client'
import { useZionClientEvent } from './use-zion-client-event'
import { DataTypes } from 'client/web3/shims/ZionSpaceManagerShim'
import { RoomIdentifier } from 'types/matrix-types'

export function useSpacesFromContract(): SpaceIdentifier[] {
    const { spaceManager } = useZionClient()
    const [spaceIdentifiers, setSpaceIdentifiers] = useState<SpaceIdentifier[]>([])
    const onNewSpace = useZionClientEvent(ZionClientEvent.NewSpace)

    useEffect(() => {
        if (!spaceManager) {
            return
        }
        void (async () => {
            const spaces = await spaceManager.getSpaces()
            if (spaces) {
                setSpaceIdentifiers(
                    spaces.map((x: DataTypes.SpaceInfoStructOutput) => {
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
                    }),
                )
            }
        })()
    }, [spaceManager, onNewSpace])

    return spaceIdentifiers
}

export function useSpaceFromContract(spaceId: RoomIdentifier): SpaceIdentifier | undefined {
    const spaces = useSpacesFromContract()
    return spaces.find((x) => x.networkId === spaceId.matrixRoomId)
}
