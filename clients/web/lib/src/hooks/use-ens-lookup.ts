import { staleTime24Hours, useQueries, useQueryClient } from '../query/queryClient'
import { useCallback, useMemo } from 'react'
import { GetEnsNameReturnType, createPublicClient, http, isAddress } from 'viem'
import { mainnet } from 'viem/chains'
import { useUserLookupStore } from '../store/use-user-lookup-store'

const publicClient = createPublicClient({ chain: mainnet, transport: http() })

export const useSpaceEnsLookup = () => {
    const { spaceUsers } = useUserLookupStore()

    const qc = useQueryClient()
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
                        address: ensAddress as `0x${string}`,
                    }),
                // Exponential backoff with a max of 30 seconds
                retryDelay: (retryCount: number) => Math.min(1000 * 2 ** retryCount, 30000),
                staleTime: staleTime24Hours,
            })
        }
        return queries
    }, [spaceUsers])

    useQueries({
        queries: ensQueries,
    })

    const queryData = qc.getQueriesData<GetEnsNameReturnType>({
        queryKey: ['ensName'],
    })
    const addressToEnsMap = useMemo(
        () =>
            queryData?.reduce<{ [ensAddress: string]: string }>((acc, query) => {
                const key = query[0]
                const ensName = query[1]
                const ensAddress = key[1]
                if (ensName && typeof ensAddress === 'string' && isAddress(ensAddress)) {
                    acc[ensAddress] = ensName
                }
                return acc
            }, {}),
        [queryData],
    )

    const getEnsFromAddress = useCallback(
        (ensAddress: string | undefined) => {
            if (!ensAddress) {
                return
            }
            return addressToEnsMap[ensAddress]
        },
        [addressToEnsMap],
    )

    return { getEnsFromAddress }
}
