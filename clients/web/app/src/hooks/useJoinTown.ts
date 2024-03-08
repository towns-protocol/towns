import { useCallback, useState } from 'react'
import { useTownsClient } from 'use-towns-client'
import { useGetEmbeddedSigner } from '@towns/privy'
import { isLimitReachedError, isMaybeFundsError, mapToErrorMessage } from '@components/Web3/utils'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { useStore } from 'store/store'

export const useJoinTown = (spaceId: string | undefined, onSuccessfulJoin?: () => void) => {
    const { client } = useTownsClient()
    const { recentlyMintedSpaceIds, setRecentlyMintedSpaceIds } = useStore()
    const getSigner = useGetEmbeddedSigner()
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
        const signer = await getSigner()
        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            return
        }
        if (client && spaceId && signer) {
            const roomIdentifier = spaceId
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
                    setRecentlyMintedSpaceIds([...recentlyMintedSpaceIds, spaceId])
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
    }, [
        client,
        spaceId,
        onSuccessfulJoin,
        getSigner,
        recentlyMintedSpaceIds,
        setRecentlyMintedSpaceIds,
    ])

    return { joinSpace, errorMessage, clearErrors, ...errorDetails }
}
