import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import {
    Address,
    queryClient,
    staleTime24Hours,
    useOfflineStore,
    useTownsContext,
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
