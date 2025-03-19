import { useQuery } from '@tanstack/react-query'
import {
    Address,
    staleTime24Hours,
    useConnectivity,
    useOfflineStore,
    useTownsContext,
} from 'use-towns-client'
import { useMemo } from 'react'
import { useEnvironment } from './useEnvironmnet'

const queryKey = 'smartAccountAddress'

export function useAbstractAccountAddress({
    rootKeyAddress,
}: {
    rootKeyAddress: Address | undefined
}) {
    const { accountAbstractionConfig } = useEnvironment()
    const userOpsInstance = useUserOps()
    const setOfflineWalletAddress = useOfflineStore((s) => s.setOfflineWalletAddress)

    const cachedAddress = useCachedAddress(rootKeyAddress)
    const isAccountAbstractionEnabled = accountAbstractionConfig !== undefined

    const { data, isLoading, isError } = useQuery({
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
    })

    return useMemo(() => {
        return {
            data,
            isLoading,
            isError,
        }
    }, [data, isLoading, isError])
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

export function useMyAbstractAccountAddress() {
    const { loggedInWalletAddress } = useConnectivity()
    return useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })
}
