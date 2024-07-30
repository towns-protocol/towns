import { useQueries, useQueryClient } from '../query/queryClient'
import { useCallback, useMemo, useState } from 'react'
import { Address, createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { useUserLookupStore } from '../store/use-user-lookup-store'
import { TownsOpts } from 'client/TownsClientTypes'
import { TownsClient } from 'client/TownsClient'

export const useSpaceEnsLookup = ({
    ethMainnetRpcUrl,
    townsClient,
}: {
    ethMainnetRpcUrl: TownsOpts['ethMainnetRpcUrl']
    townsClient?: TownsClient
}) => {
    const { spaceUsers } = useUserLookupStore()
    const qc = useQueryClient()
    const [publicClient] = useState(() =>
        createPublicClient({
            chain: mainnet,
            transport: ethMainnetRpcUrl ? http(ethMainnetRpcUrl) : http(),
        }),
    )

    const ensQueries = useMemo(() => {
        const allSpacesUsers = Object.values(spaceUsers)
        const allEnsAddress = new Set(
            allSpacesUsers
                .flatMap((u) => Object.values(u))
                .flatMap((u) => (u.ensAddress ? [u.ensAddress] : [])),
        )
        const queries = []
        for (const ensAddress of allEnsAddress) {
            queries.push({
                queryKey: ['ensName', ensAddress],
                queryFn: () =>
                    publicClient.getEnsName({
                        address: ensAddress as Address,
                    }),
                // Exponential backoff w/ a max of 40 seconds
                retryDelay: (retryCount: number) => Math.min(5000 * 2 ** retryCount, 40000),
                staleTime: 900000, // 15 minutes
                cacheTime: 900000,
            })
        }
        return queries
    }, [publicClient, spaceUsers])

    useQueries({
        queries: ensQueries,
    })

    const getEnsData = useCallback(
        async (userId: string, ensAddress: string | undefined, fetchOnCacheMiss = true) => {
            if (!ensAddress) {
                return
            }
            const ensName = qc.getQueryData(['ensName', ensAddress]) as string
            if (!ensName) {
                if (!fetchOnCacheMiss) {
                    return
                }
                const ensName = await publicClient.getEnsName({
                    address: ensAddress as Address,
                })
                if (ensName) {
                    qc.setQueryData(['ensName', ensAddress], ensName)
                    return { ensAddress, ensName }
                }
            }
            const linkedWallets = await townsClient?.getLinkedWallets(userId)
            const isOwned = linkedWallets?.includes(ensAddress)

            return isOwned
                ? {
                      ensAddress,
                      ensName,
                  }
                : undefined
        },
        [publicClient, qc, townsClient],
    )

    return { getEnsData }
}
