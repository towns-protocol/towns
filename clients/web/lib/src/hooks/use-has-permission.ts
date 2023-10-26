import { useCallback } from 'react'

import { useQuery } from '../query/queryClient'
import { useZionClient } from './use-zion-client'
import { blockchainKeys } from '../query/query-keys'
import { Permission } from '@river/web3'

interface Props {
    spaceId: string | undefined
    channelId?: string
    walletAddress: string
    permission: Permission
}

export function useHasPermission(props: Props) {
    const { client } = useZionClient()
    const { spaceId, channelId, walletAddress, permission } = props

    const getHasPermission = useCallback(async () => {
        if (client) {
            const isEntitled = await client.isEntitled(
                spaceId,
                channelId,
                walletAddress,
                permission,
            )
            console.log(
                '[useHasPermission]',
                'getHasPermission() from network',
                new Date().toString(),
                {
                    spaceId,
                    channelId,
                    walletAddress,
                    permission,
                },
                isEntitled,
            )
            return isEntitled
        }
        return false
    }, [channelId, client, permission, spaceId, walletAddress])

    // Queries
    const {
        isLoading,
        error,
        data: hasPermission,
    } = useQuery(
        // unique key per query so that React Query
        // can manage the cache for us.
        blockchainKeys.hasPermission(props),
        // query function that does the data fetching.
        getHasPermission,
        // options for the query.
        // query will not execute until the client is defined.
        {
            enabled: client !== undefined,
            refetchOnMount: true,
            // inherits default staleTime of 15 secs
            // server strictly enforces permissions in real time.
            // client side caching of permissions is only for UX purposes.
            // test the UX for stale time and cache time before setting them.
        },
    )

    return {
        isLoading,
        hasPermission,
        error,
    }
}
