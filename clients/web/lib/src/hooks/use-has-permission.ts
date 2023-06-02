import { useCallback } from 'react'

import { Permission } from '../client/web3/ContractTypes'
import { useQuery } from '@tanstack/react-query'
import { useZionClient } from './use-zion-client'

interface Props {
    spaceId: string
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
        [props],
        // query function that does the data fetching.
        getHasPermission,
        // options for the query.
        // query will not execute until the client is defined.
        {
            enabled: client !== undefined,
            // server strictly enforces permissions in real time.
            // client side caching of permissions is only for UX purposes.
            // default of staleTime is 0. i.e. data is immediately stale.
            // test the UX for stale time and cache time before setting them.
            staleTime: 15000,
            //cacheTime: 60000,
        },
    )

    return {
        isLoading,
        hasPermission,
        error,
    }
}
