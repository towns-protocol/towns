import { useQueries, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import {
    Address,
    LOCALHOST_CHAIN_ID,
    LookupUser,
    queryClient,
    staleTime24Hours,
    useOfflineStore,
    useSpaceDapp,
    useSpaceMembers,
    useTownsContext,
    useUserLookupContext,
} from 'use-towns-client'
import { UserOps } from '@towns/userops'
import { useEnvironment } from './useEnvironmnet'

const queryKey = 'smartAccountAddress'

function querySetup({
    rootKeyAddress,
    userOpsInstance,
    chainId,
    cachedAddress,
    setOfflineWalletAddress,
}: {
    rootKeyAddress: Address | undefined
    userOpsInstance: UserOps | undefined
    chainId: number | undefined
    cachedAddress: Address | undefined
    setOfflineWalletAddress: (userId: string, abstractAccountAddress: string) => void
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

            if (!rootKeyAddress) {
                return
            }

            if (cachedAddress) {
                return cachedAddress
            }

            if (!userOpsInstance) {
                return
            }
            const returnVal = await userOpsInstance.getAbstractAccountAddress({
                rootKeyAddress,
            })
            if (returnVal) {
                console.log('setting offline wallet address', rootKeyAddress, returnVal)
                setOfflineWalletAddress(rootKeyAddress, returnVal)
            }
            return returnVal
        },
        enabled: !!rootKeyAddress,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        gcTime: staleTime24Hours,
        staleTime: staleTime24Hours,
    }
}

export function useAbstractAccountAddress({
    rootKeyAddress,
}: {
    rootKeyAddress: Address | undefined
}) {
    const { baseChain } = useEnvironment()
    const chainId = baseChain.id
    const userOpsInstance = useUserOpsInstance()
    const { offlineWalletAddressMap, setOfflineWalletAddress } = useOfflineStore()

    let cachedAddress: Address | undefined
    if (rootKeyAddress) {
        cachedAddress = offlineWalletAddressMap[rootKeyAddress] as Address | undefined
    }
    return useQuery({
        ...querySetup({
            rootKeyAddress,
            userOpsInstance,
            chainId,
            cachedAddress,
            setOfflineWalletAddress,
        }),
    })
}

export function useGetAbstractAccountAddressAsync() {
    const { baseChain } = useEnvironment()
    const chainId = baseChain.id
    const userOpsInstance = useUserOpsInstance()
    const { offlineWalletAddressMap, setOfflineWalletAddress } = useOfflineStore()

    return useCallback(
        ({ rootKeyAddress }: { rootKeyAddress: Address | undefined }) => {
            let cachedAddress: Address | undefined
            if (rootKeyAddress) {
                cachedAddress = offlineWalletAddressMap[rootKeyAddress] as Address | undefined
            }
            const qs = querySetup({
                rootKeyAddress,
                userOpsInstance,
                chainId,
                cachedAddress,
                setOfflineWalletAddress,
            })
            return queryClient.fetchQuery({
                queryKey: qs.queryKey,
                queryFn: qs.queryFn,
            })
        },
        [chainId, userOpsInstance, offlineWalletAddressMap, setOfflineWalletAddress],
    )
}

export type LookupUserWithAbstractAccountAddress = LookupUser & {
    abstractAccountAddress: Address
}
// TODO: we should move this into zustand - with lookupUser as a selector this
// won't
export function useLookupUsersWithAbstractAccountAddress() {
    const { baseChain } = useEnvironment()
    const chainId = baseChain.id
    const userOpsInstance = useUserOpsInstance()
    const { memberIds } = useSpaceMembers()
    const { offlineWalletAddressMap, setOfflineWalletAddress } = useOfflineStore()

    const { lookupUser } = useUserLookupContext()

    return useQueries({
        queries: memberIds.map((userId) => {
            const cachedAddress = offlineWalletAddressMap[userId] as Address | undefined
            return {
                ...querySetup({
                    chainId,
                    rootKeyAddress: userId as `0x${string}` | undefined,
                    userOpsInstance,
                    cachedAddress,
                    setOfflineWalletAddress,
                }),
            }
        }),
        combine: (results) => {
            return {
                data: results
                    .map((r, i): LookupUserWithAbstractAccountAddress => {
                        const user = lookupUser(memberIds[i])
                        return {
                            ...user,
                            abstractAccountAddress: r.data as `0x${string}`,
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
    const { baseProvider: provider, baseConfig: config } = useTownsContext()

    const { accountAbstractionConfig: aaConfig } = useEnvironment()

    const spaceDapp = useSpaceDapp({
        provider,
        config,
    })

    // undefined if on anvil

    return useMemo(() => {
        if (!spaceDapp || !aaConfig) {
            return
        }
        return new UserOps({
            ...aaConfig,
            spaceDapp,
            provider,
            config,
        })
    }, [aaConfig, config, provider, spaceDapp])
}
