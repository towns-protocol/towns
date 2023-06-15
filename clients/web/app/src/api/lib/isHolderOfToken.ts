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
            // set the staleTime to 24 hours so that the data is never refetched while this query has an observer
            staleTime: 1000 * 60 * 60 * 24,
            // cacheTime default is 5 minutes, so also need to set it to ensure the entry is not garbage collected. otherwise, if the observer went away for 5 minutes, the data would be refetched
            cacheTime: 1000 * 60 * 60 * 24,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,
            enabled: Boolean(wallet) && Boolean(client),
        },
    )
}
