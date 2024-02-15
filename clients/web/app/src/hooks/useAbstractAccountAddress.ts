import { useQuery } from '@tanstack/react-query'
import { Address, useZionClient } from 'use-zion-client'
import { useState } from 'react'
import { useAuth } from './useAuth'

const queryKey = 'smartAccountAddress'

export function useAbstractAccountAddress({ rootKeyAddress }: { rootKeyAddress?: Address } = {}) {
    const { loggedInWalletAddress } = useAuth()
    const { client } = useZionClient()
    const [_rootAddress] = useState(rootKeyAddress ?? loggedInWalletAddress)

    return useQuery({
        queryKey: [queryKey, _rootAddress],
        queryFn: async () => {
            if (!client || !_rootAddress) {
                return undefined
            }
            return client.getAbstractAccountAddress({
                rootKeyAddress: _rootAddress,
            })
        },
        enabled: !!client && !!_rootAddress,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        gcTime: 1000 * 60 * 60 * 24,
        staleTime: 1000 * 60 * 60 * 24,
    })
}

export function isAbstractAccountAddress({
    address,
    abstractAccountAddress,
}: {
    address: Address
    abstractAccountAddress: Address
}) {
    return address.toLowerCase() === abstractAccountAddress.toLowerCase()
}
