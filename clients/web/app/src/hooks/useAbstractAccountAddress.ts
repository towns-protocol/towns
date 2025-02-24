import { useQueries, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import {
    Address,
    LookupUser,
    queryClient,
    staleTime24Hours,
    useOfflineStore,
    useSpaceMembers,
    useTownsContext,
    useUserLookupContext,
} from 'use-towns-client'
import { AccountAbstractionConfig, UserOps } from '@towns/userops'
import { useEnvironment } from './useEnvironmnet'

const queryKey = 'smartAccountAddress'

function querySetup({
    rootKeyAddress,
    userOpsInstance,
    cachedAddress,
    setOfflineWalletAddress,
    accountAbstractionConfig,
}: {
    rootKeyAddress: Address | undefined
    userOpsInstance: UserOps | undefined
    cachedAddress: Address | undefined
    setOfflineWalletAddress: (userId: string, abstractAccountAddress: string) => void
    accountAbstractionConfig: AccountAbstractionConfig | undefined
}) {
    const isAccountAbstractionEnabled = accountAbstractionConfig !== undefined
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
                // console.log('setting offline wallet address', rootKeyAddress, returnVal)
                setOfflineWalletAddress(rootKeyAddress, returnVal)
            }
            return returnVal
        },
        enabled: !!rootKeyAddress,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        staleTime: staleTime24Hours,
    }
}

export function useAbstractAccountAddress({
    rootKeyAddress,
}: {
    rootKeyAddress: Address | undefined
}) {
    const { accountAbstractionConfig } = useEnvironment()
    const userOpsInstance = useUserOps()
    const setOfflineWalletAddress = useOfflineStore((s) => s.setOfflineWalletAddress)

    const cachedAddress = useCachedAddress(rootKeyAddress)
    return useQuery({
        ...querySetup({
            rootKeyAddress,
            userOpsInstance,
            accountAbstractionConfig,
            cachedAddress,
            setOfflineWalletAddress,
        }),
    })
}

export function useGetAbstractAccountAddressAsync() {
    const { accountAbstractionConfig } = useEnvironment()
    const userOpsInstance = useUserOps()
    const setOfflineWalletAddress = useOfflineStore((s) => s.setOfflineWalletAddress)

    return useCallback(
        ({ rootKeyAddress }: { rootKeyAddress: Address | undefined }) => {
            const cachedAddress = getCachedAddress({
                rootKeyAddress,
            })
            const qs = querySetup({
                rootKeyAddress,
                userOpsInstance,
                accountAbstractionConfig,
                cachedAddress,
                setOfflineWalletAddress,
            })
            return queryClient.fetchQuery({
                queryKey: qs.queryKey,
                queryFn: qs.queryFn,
            })
        },
        [userOpsInstance, accountAbstractionConfig, setOfflineWalletAddress],
    )
}

export type LookupUserWithAbstractAccountAddress = LookupUser & {
    abstractAccountAddress: Address
}
// TODO: we should move this into zustand - with lookupUser as a selector this
// won't
export function useLookupUsersWithAbstractAccountAddress() {
    const { accountAbstractionConfig } = useEnvironment()

    const userOpsInstance = useUserOps()
    const { memberIds } = useSpaceMembers()
    const setOfflineWalletAddress = useOfflineStore((s) => s.setOfflineWalletAddress)

    const { lookupUser } = useUserLookupContext()
    const queries = useMemo(() => {
        return memberIds.map((userId) => {
            const cachedAddress = getCachedAddress({
                rootKeyAddress: userId,
            })
            return {
                ...querySetup({
                    accountAbstractionConfig,
                    rootKeyAddress: userId as `0x${string}` | undefined,
                    userOpsInstance,
                    cachedAddress,
                    setOfflineWalletAddress,
                }),
            }
        })
    }, [accountAbstractionConfig, memberIds, setOfflineWalletAddress, userOpsInstance])
    return useQueries({
        queries: queries,
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

function useUserOps() {
    const { clientSingleton } = useTownsContext()
    return clientSingleton?.baseTransactor.userOps
}

function useCachedAddress(rootKeyAddress: string | undefined) {
    return getCachedAddress({ rootKeyAddress })
}

function getCachedAddress(args: { rootKeyAddress: string | undefined }) {
    const { rootKeyAddress } = args
    if (!rootKeyAddress) {
        return
    }
    const offlineWalletAddressMap = useOfflineStore.getState().offlineWalletAddressMap
    return offlineWalletAddressMap[rootKeyAddress] as Address
}
