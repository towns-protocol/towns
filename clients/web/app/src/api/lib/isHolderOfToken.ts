import { useQuery } from '@tanstack/react-query'
import { useZionClient } from 'use-zion-client'
import { useAuth } from 'hooks/useAuth'

const QUERY_KEY = 'isHolderOfToken'

export function useIsHolderOfPioneerNFT() {
    const { loggedInWalletAddress: wallet } = useAuth()
    const { client } = useZionClient()

    return useQuery(
        [QUERY_KEY, wallet],
        () => {
            if (!wallet || !client) {
                return false
            }
            return client.pioneerNFT.isHolder(wallet)
        },
        {
            select: (isHolder) => isHolder,
            staleTime: 1000 * 60 * 60 * 24,
            enabled: Boolean(wallet) && Boolean(client),
        },
    )
}
