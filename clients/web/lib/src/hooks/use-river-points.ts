import { queryClient, useQuery, useQueryClient } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { useTownsContext } from '../components/TownsContextProvider'
import { ethers } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import { useCheckInTransaction } from './use-checkin-transaction'
import { useTownsClient } from './use-towns-client'
import { useOnTransactionUpdated } from '../store/use-transactions-store'
import { BlockchainTransactionType } from '../types/web3-types'

const SECONDS_MS = 1000
const HOUR_MS = 60 * 60 * SECONDS_MS
const DAY_MS = 24 * HOUR_MS

export function useRiverPoints(loggedInWalletAddress: `0x${string}`) {
    const { baseChain: chain, clientStatus, spaceIds } = useTownsContext()
    const { spaceDapp } = useTownsClient()

    const isLocalDataLoaded = clientStatus.isLocalDataLoaded

    useEffect(() => {
        if (!isLocalDataLoaded) {
            return
        }
        // invalidate river points aggresively since unsynced points
        // are causing confusion and frustration
        // - invalidate when the panel is opened
        // - invalidate when a space potentially has been joined (when the
        //   spaceIds updates)
        console.log('[river-points] invalidate points', spaceIds)
        void queryClient.invalidateQueries({
            queryKey: blockchainKeys.riverPoints(chain.id, loggedInWalletAddress ?? ''),
        })
    }, [chain.id, loggedInWalletAddress, spaceIds, isLocalDataLoaded])

    const dapp = spaceDapp?.airdrop

    if (!dapp) {
        throw new Error('RiverPoints is not deployed')
    }

    const { data, isLoading, isError, error } = useQuery(
        blockchainKeys.riverPoints(chain.id, loggedInWalletAddress ?? ''),
        async () => {
            if (!dapp || !loggedInWalletAddress) {
                return
            }

            const [riverPoints, currentStreak, lastCheckIn] = await Promise.all([
                dapp.balanceOf(loggedInWalletAddress).then((value) => {
                    return Math.round(Number(ethers.utils.formatEther(value)))
                }),
                dapp.getCurrentStreak(loggedInWalletAddress).then((value) => Number(value)),
                dapp.getLastCheckIn(loggedInWalletAddress).then((value) => {
                    return Number(value) * SECONDS_MS
                }),
            ])

            return {
                riverPoints,
                currentStreak,
                lastCheckIn,
            }
        },
        {
            enabled: !!dapp && !!loggedInWalletAddress,
            staleTime: SECONDS_MS * 60 * 5,
            refetchOnWindowFocus: true,
            refetchOnMount: true,
        },
    )

    // ---------------------------------------------- keep track of active state

    const [now, setNow] = useState(() => Date.now())
    const lastCheckIn = data?.lastCheckIn

    useEffect(() => {
        // if applicable, update state 24h from last check in
        const nextCheckIn = lastCheckIn ? lastCheckIn + DAY_MS - Date.now() : 0
        if (nextCheckIn > 0) {
            const timeout = setTimeout(() => {
                setNow(Date.now())
            }, nextCheckIn)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [lastCheckIn])

    const isActive = !lastCheckIn || lastCheckIn < now - DAY_MS

    // ------------------------------------------------------------------ logging

    useEffect(() => {
        if (isError) {
            console.error('[river-points] error', error)
        }
    }, [isError, error])

    useEffect(() => {
        if (data) {
            console.log('[river-points] data', data)
        }
    }, [data])

    // ------------------------------------------------------------------ return

    return useMemo(() => {
        return {
            data: data ? { ...data, isActive } : undefined,
            isLoading,
            isError,
        }
    }, [data, isLoading, isError, isActive])
}

export function useRiverPointsCheckIn(
    loggedInWalletAddress: `0x${string}` | undefined,
    options: {
        onSuccess?: () => void
        onError?: (error: Error | undefined) => void
        onPotential?: () => void
        onPending?: () => void
    } = {},
) {
    const queryClient = useQueryClient()
    const { baseChain: chain } = useTownsContext()
    const { onSuccess, onError, onPotential, onPending } = options

    useOnTransactionUpdated((tx) => {
        if (tx.type === BlockchainTransactionType.CheckIn) {
            switch (tx.status) {
                case 'success':
                    void queryClient.invalidateQueries({
                        queryKey: blockchainKeys.riverPoints(chain.id, loggedInWalletAddress ?? ''),
                    })
                    onSuccess?.()
                    break
                case 'failure':
                    onError?.(tx.error)
                    break
                case 'potential':
                    onPotential?.()
                    break
                case 'pending':
                    onPending?.()
                    break
            }
        }
    })

    const { checkIn, isLoading } = useCheckInTransaction()

    return {
        checkIn,
        isLoading,
    }
}
