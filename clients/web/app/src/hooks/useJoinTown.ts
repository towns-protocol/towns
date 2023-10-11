import { useCallback, useState } from 'react'
import { RoomIdentifier, makeRoomIdentifier, useWeb3Context, useZionClient } from 'use-zion-client'

export type JoinData = {
    name: string
    networkId: string
    spaceAddress?: string
}

export const useJoinTown = (joinData: JoinData, onSuccessfulJoin?: () => void) => {
    const { client } = useZionClient()
    const [notEntitled, setNotEntitled] = useState(false)
    const [maxLimitReached, setMaxLimitReached] = useState(false)
    const { signer } = useWeb3Context()

    const joinSpace = useCallback(async () => {
        if (client && joinData?.networkId) {
            const roomIdentifier: RoomIdentifier = makeRoomIdentifier(joinData.networkId)

            try {
                // use client.joinRoom b/c it will throw an error, not the joinRoom wrapped in useWithCatch()
                const result = await client.joinTown(roomIdentifier, signer)
                if (!result) {
                    setNotEntitled(true)
                } else {
                    onSuccessfulJoin?.()
                }
            } catch (error) {
                if ((error as Error)?.message?.includes('has exceeded the member cap')) {
                    setMaxLimitReached(true)
                } else {
                    setNotEntitled(true)
                }
            }
        }
    }, [client, joinData.networkId, onSuccessfulJoin, signer])

    return { notEntitled, maxLimitReached, joinSpace }
}
