import { useQueries, useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import {
    Address,
    LookupUser,
    queryClient,
    useUserLookupContext,
    useZionClient,
} from 'use-zion-client'

const queryKey = 'smartAccountAddress'

function querySetup({
    client,
    rootKeyAddress,
}: {
    client: ReturnType<typeof useZionClient>['client']
    rootKeyAddress: Address | undefined
}) {
    return {
        queryKey: [queryKey, rootKeyAddress],
        queryFn: async () => {
            if (!client || !rootKeyAddress) {
                return undefined
            }
            return client.getAbstractAccountAddress({
                rootKeyAddress: rootKeyAddress,
            })
        },
        enabled: !!client && !!rootKeyAddress,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        gcTime: 1000 * 60 * 60 * 24,
        staleTime: 1000 * 60 * 60 * 24,
    }
}

export function useAbstractAccountAddress({
    rootKeyAddress,
}: {
    rootKeyAddress: Address | undefined
}) {
    const { client } = useZionClient()

    return useQuery({
        ...querySetup({ client, rootKeyAddress }),
    })
}

export function useGetAbstractAccountAddressAsync() {
    const { client } = useZionClient()

    return useCallback(
        ({ rootKeyAddress }: { rootKeyAddress: Address | undefined }) => {
            const qs = querySetup({ client, rootKeyAddress })
            return queryClient.fetchQuery({
                queryKey: qs.queryKey,
                queryFn: qs.queryFn,
            })
        },
        [client],
    )
}

export type LookupUserWithAbstractAccountAddress = LookupUser & {
    abstractAccountAddress: Address
}

export function useLookupUsersWithAbstractAccountAddress() {
    const { client } = useZionClient()
    const { users: _users } = useUserLookupContext()

    return useQueries({
        queries: _users.map((user) => {
            const uId = user.userId
            return {
                ...querySetup({ client, rootKeyAddress: uId }),
            }
        }),
        combine: (results) => {
            return {
                data: results
                    .map((r, i): LookupUserWithAbstractAccountAddress => {
                        const user = _users[i]
                        return {
                            ...user,
                            abstractAccountAddress: r.data,
                        }
                    })
                    .filter(
                        (r): r is LookupUserWithAbstractAccountAddress =>
                            r.abstractAccountAddress !== undefined,
                    ),

                isLoading: results.some((r) => r.isLoading),
            }
        },
    })
}

export function isAbstractAccountAddress({
    address,
    abstractAccountAddress,
}: {
    address: Address
    abstractAccountAddress: Address | undefined
}) {
    return address.toLowerCase() === abstractAccountAddress?.toLowerCase()
}
