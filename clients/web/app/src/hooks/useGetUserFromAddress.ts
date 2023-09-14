import { useMemo } from 'react'
import { createUserIdFromEthereumAddress, useUser, useZionClient } from 'use-zion-client'
import { useEnvironment } from './useEnvironmnet'

export function useGetUserFromAddress(address: string | undefined) {
    const { client, chainId } = useZionClient()
    const { matrixUrl } = useEnvironment()
    // if we have a userId from the owner address, it's a river user
    const riverUser = useUser(address)

    return useMemo(() => {
        if (!address || !chainId) {
            return undefined
        }

        if (riverUser) {
            const user = client?.getUser(riverUser.userId)
            if (user) {
                user.displayName = 'getUser() not implemented in River yet'
            }
            return user
        }

        const _homeserverUrl = new URL(matrixUrl || '')
        const userId = createUserIdFromEthereumAddress(
            address,
            chainId,
        ).matrixUserIdLocalpart.toLowerCase()
        const matrixIdFromOwnerAddress = `@${userId}:${_homeserverUrl.hostname}`
        return client?.getUser(matrixIdFromOwnerAddress)
    }, [address, chainId, riverUser, matrixUrl, client])
}
