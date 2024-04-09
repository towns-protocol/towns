import { useCallback } from 'react'

import { useQuery } from '../query/queryClient'
import { useTownsClient } from './use-towns-client'
import { blockchainKeys } from '../query/query-keys'
import { Permission } from '@river-build/web3'
import { isAddress } from 'ethers/lib/utils'

interface Props {
    spaceId: string | undefined
    channelId?: string
    walletAddress?: string
    permission: Permission
}

export function useHasPermission(props: Props) {
    const { clientSingleton } = useTownsClient()
    const { spaceId, channelId, walletAddress, permission } = props

    const getHasPermission = useCallback(async () => {
        if (clientSingleton && walletAddress) {
            const isEntitled = await clientSingleton.isEntitled(
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
    }, [channelId, clientSingleton, permission, spaceId, walletAddress])

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
            enabled: clientSingleton !== undefined && !!walletAddress && isAddress(walletAddress),
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
