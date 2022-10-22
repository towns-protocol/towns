import { SpaceIdentifier, ZionClientEvent } from '../client/ZionClientTypes'
import { useEffect, useState } from 'react'

import { useZionClient } from './use-zion-client'
import { useZionClientEvent } from './use-zion-client-event'
import { DataTypes } from 'client/web3/shims/ZionSpaceManagerShim'

export const useSpacesFromContract = (): SpaceIdentifier[] => {
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
                            id: x.spaceId,
                            key: x.spaceId.toString(),
                            name: x.name,
                        }
                    }),
                )
            }
        })()
    }, [spaceManager, onNewSpace])

    return spaceIdentifiers
}
