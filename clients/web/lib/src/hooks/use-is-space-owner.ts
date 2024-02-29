import { useCallback } from 'react'

import { useQuery } from '../query/queryClient'
import { useZionClient } from './use-zion-client'
import { isAddress } from 'ethers/lib/utils'

export function useIsSpaceOwner(spaceId?: string, walletAddress?: string) {
    const { client } = useZionClient()

    const getIsOwner = useCallback(async () => {
        if (client && walletAddress && spaceId) {
            const isOwner = await client.isOwner(spaceId, walletAddress)
            console.log(
                '[useIsOwner]',
                new Date().toString(),
                {
                    spaceId,
                    isOwner,
                    walletAddress,
                },
                isOwner,
            )
            return isOwner
        }
        return false
    }, [client, spaceId, walletAddress])

    // Queries
    const {
        isLoading,
        error,
        data: isOwner,
    } = useQuery(
        // unique key per query so that React Query
        // can manage the cache for us.
        [spaceId, walletAddress],
        // query function that does the data fetching.
        getIsOwner,
        // options for the query.
        // query will not execute until the client is defined.
        {
            enabled: client !== undefined && !!walletAddress && isAddress(walletAddress),
            refetchOnMount: true,
            // inherits default staleTime of 15 secs
            // server strictly enforces permissions in real time.
            // client side caching of permissions is only for UX purposes.
            // test the UX for stale time and cache time before setting them.
        },
    )

    return {
        isLoading,
        isOwner,
        error,
    }
}
