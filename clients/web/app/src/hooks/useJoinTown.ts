import { useCallback, useState } from 'react'
import { RoomIdentifier, makeRoomIdentifier, useWeb3Context, useZionClient } from 'use-zion-client'

export const useJoinTown = (networkId: string | undefined, onSuccessfulJoin?: () => void) => {
    const { client } = useZionClient()
    const [notEntitled, setNotEntitled] = useState(false)
    const [maxLimitReached, setMaxLimitReached] = useState(false)
    const { signer } = useWeb3Context()
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)

    const joinSpace = useCallback(async () => {
        setErrorMessage(undefined)
        if (client && networkId) {
            const roomIdentifier: RoomIdentifier = makeRoomIdentifier(networkId)

            try {
                // use client.joinRoom b/c it will throw an error, not the joinRoom wrapped in useWithCatch()
                // we can keep this notEntitled state in the interm to catch some weird errors/states just in case
                // but the entitled check should already happen in the UI, and never show a join button if not entitled
                const result = await client.joinTown(roomIdentifier, signer)
                if (!result) {
                    setNotEntitled(true)
                } else {
                    onSuccessfulJoin?.()
                }
            } catch (error) {
                const _error = error as Error
                // TODO: temporary error message for no funds
                if (_error?.message?.toString().includes?.('CallGasCostMoreThanGasLimit')) {
                    setErrorMessage('Cannot calculate gas. Your wallet may be lacking funds.')
                } else if (_error?.message?.includes?.('has exceeded the member cap')) {
                    setMaxLimitReached(true)
                    setErrorMessage('This town has reached its member limit.')
                } else {
                    setNotEntitled(true)
                    setErrorMessage(_error?.message)
                }
            }
        }
    }, [client, networkId, onSuccessfulJoin, signer])

    return { notEntitled, maxLimitReached, joinSpace, errorMessage }
}
