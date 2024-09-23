import { useCallback } from 'react'

import { useQuery, useQueryClient } from '../query/queryClient'
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

function querySetup(
    props: Props,
    clientSingleton: ReturnType<typeof useTownsClient>['clientSingleton'],
) {
    const { spaceId, channelId, walletAddress, permission } = props
    return {
        queryKey: blockchainKeys.hasPermission(props),
        queryFn: async () => {
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
        },
    }
}

export function useHasPermission(props: Props) {
    const { clientSingleton } = useTownsClient()
    const { walletAddress } = props
    const queryClient = useQueryClient()

    const { queryFn, queryKey } = querySetup(props, clientSingleton)

    const invalidate = useCallback(() => {
        return queryClient.invalidateQueries({ queryKey })
    }, [queryClient, queryKey])

    const getQueryData = useCallback(() => {
        return queryClient.getQueryData<boolean>(queryKey)
    }, [queryClient, queryKey])

    // Queries
    const {
        isLoading,
        error,
        data: hasPermission,
    } = useQuery(
        // unique key per query so that React Query
        // can manage the cache for us.
        queryKey,
        // query function that does the data fetching.
        queryFn,
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
        invalidate,
        getQueryData,
        error,
    }
}

export function useFetchHasJoinPermission() {
    const { clientSingleton } = useTownsClient()
    const queryClient = useQueryClient()

    return useCallback(
        (props: Pick<Props, 'spaceId' | 'walletAddress'>) => {
            const { queryFn, queryKey } = querySetup(
                {
                    spaceId: props.spaceId,
                    walletAddress: props.walletAddress,
                    permission: Permission.JoinSpace,
                },
                clientSingleton,
            )
            return queryClient.fetchQuery({ queryKey, queryFn })
        },
        [queryClient, clientSingleton],
    )
}
