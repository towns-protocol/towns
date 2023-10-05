import { useMemo } from 'react'
import { useUser, useZionClient } from 'use-zion-client'

export function useGetUserFromAddress(address: string | undefined) {
    const { client, chainId } = useZionClient()
    // if we have a userId from the owner address, it's a river user
    const riverUser = useUser(address)

    return useMemo(() => {
        if (!address || !chainId) {
            return undefined
        }

        if (riverUser) {
            riverUser.displayName = 'getUser() not implemented in River yet'
            return riverUser
        }
        return client?.getUser(address)
    }, [address, chainId, riverUser, client])
}
