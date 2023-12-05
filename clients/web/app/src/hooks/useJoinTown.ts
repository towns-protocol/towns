import { useCallback, useState } from 'react'
import { RoomIdentifier, makeRoomIdentifier, useWeb3Context, useZionClient } from 'use-zion-client'
import { isLimitReachedError, isMaybeFundsError, mapToErrorMessage } from '@components/Web3/utils'

export const useJoinTown = (networkId: string | undefined, onSuccessfulJoin?: () => void) => {
    const { client } = useZionClient()
    const { signer } = useWeb3Context()
    const [errorDetails, setErrorDetails] = useState<{
        maxLimitReached: boolean
        isNoFundsError: boolean
        notEntitled: boolean
    }>({
        maxLimitReached: false,
        isNoFundsError: false,
        notEntitled: false,
    })
    function clearErrors() {
        setErrorDetails({
            maxLimitReached: false,
            isNoFundsError: false,
            notEntitled: false,
        })
        setErrorMessage(undefined)
    }
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)

    const joinSpace = useCallback(async () => {
        clearErrors()
        if (client && networkId) {
            const roomIdentifier: RoomIdentifier = makeRoomIdentifier(networkId)
            try {
                // use client.joinRoom b/c it will throw an error, not the joinRoom wrapped in useWithCatch()
                // we can keep this notEntitled state in the interm to catch some weird errors/states just in case
                // but the entitled check should already happen in the UI, and never show a join button if not entitled
                const result = await client.joinTown(roomIdentifier, signer)
                if (!result) {
                    setErrorDetails({
                        maxLimitReached: false,
                        isNoFundsError: false,
                        notEntitled: true,
                    })
                } else {
                    onSuccessfulJoin?.()
                }
            } catch (error) {
                const _error = error as Error
                if (isLimitReachedError(_error)) {
                    setErrorDetails({
                        maxLimitReached: true,
                        isNoFundsError: false,
                        notEntitled: false,
                    })
                    setErrorMessage(mapToErrorMessage(_error))
                } else if (isMaybeFundsError(_error)) {
                    setErrorDetails({
                        maxLimitReached: false,
                        isNoFundsError: true,
                        notEntitled: false,
                    })
                    setErrorMessage(mapToErrorMessage(_error))
                } else {
                    setErrorDetails({
                        maxLimitReached: false,
                        isNoFundsError: false,
                        notEntitled: true,
                    })
                    setErrorMessage(mapToErrorMessage(_error))
                }
            }
        }
    }, [client, networkId, onSuccessfulJoin, signer])

    return { joinSpace, errorMessage, clearErrors, ...errorDetails }
}
