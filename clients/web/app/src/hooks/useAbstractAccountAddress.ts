import { useQueries, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import {
    Address,
    LOCALHOST_CHAIN_ID,
    LookupUser,
    queryClient,
    useSpaceDapp,
    useUserLookupContext,
    useWeb3Context,
} from 'use-towns-client'
import { UserOps } from '@towns/userops'
import { useAccountAbstractionConfig } from 'userOpConfig'
import { useEnvironment } from './useEnvironmnet'

const queryKey = 'smartAccountAddress'

function querySetup({
    rootKeyAddress,
    userOpsInstance,
    chainId,
}: {
    rootKeyAddress: Address | undefined
    userOpsInstance: UserOps | undefined
    chainId: number | undefined
}) {
    // checking chainId instead of townsClient.isAccountAbstractionEnabled b/c we might not have a townsClient if logged out
    const isAccountAbstractionEnabled = chainId !== LOCALHOST_CHAIN_ID
    return {
        queryKey: [queryKey, { isAccountAbstractionEnabled, rootKeyAddress }],
        queryFn: async () => {
            // if account abstraction is not enabled, we're using the root key address
            if (!isAccountAbstractionEnabled) {
                return rootKeyAddress
            }
            if (!rootKeyAddress || !userOpsInstance) {
                return
            }
            return userOpsInstance.getAbstractAccountAddress({
                rootKeyAddress,
            })
        },
        enabled: !!rootKeyAddress,
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
    const { chainId } = useEnvironment()
    const userOpsInstance = useUserOpsInstance()
    return useQuery({
        ...querySetup({ rootKeyAddress, userOpsInstance, chainId }),
    })
}

export function useGetAbstractAccountAddressAsync() {
    const { chainId } = useEnvironment()
    const userOpsInstance = useUserOpsInstance()

    return useCallback(
        ({ rootKeyAddress }: { rootKeyAddress: Address | undefined }) => {
            const qs = querySetup({ rootKeyAddress, userOpsInstance, chainId })
            return queryClient.fetchQuery({
                queryKey: qs.queryKey,
                queryFn: qs.queryFn,
            })
        },
        [chainId, userOpsInstance],
    )
}

export type LookupUserWithAbstractAccountAddress = LookupUser & {
    abstractAccountAddress: Address
}

export function useLookupUsersWithAbstractAccountAddress() {
    const { chainId } = useEnvironment()
    const userOpsInstance = useUserOpsInstance()
    const { users: _users } = useUserLookupContext()

    return useQueries({
        queries: _users.map((user) => {
            const uId = user.userId
            return {
                ...querySetup({ chainId, rootKeyAddress: uId, userOpsInstance }),
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

// we need to get abstract account address even while logged out
// so we use a userOps instance instead of townsClient.getAbstractAccountAddress
// b/c the latter requires a client, which requires a logged in user
function useUserOpsInstance() {
    const { provider } = useWeb3Context()
    const { chainId } = useEnvironment()

    const spaceDapp = useSpaceDapp({
        chainId,
        provider,
    })

    // undefined if on anvil
    const aaConfig = useAccountAbstractionConfig(chainId)

    return useMemo(() => {
        if (!spaceDapp || !chainId || !aaConfig) {
            return
        }
        return UserOps.instance({
            ...aaConfig,
            spaceDapp,
            chainId,
            provider,
        })
    }, [aaConfig, chainId, provider, spaceDapp])
}
