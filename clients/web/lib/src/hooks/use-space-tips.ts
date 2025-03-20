import { useCallback } from 'react'
import { useTownsClient } from './use-towns-client'
import { blockchainKeys } from '../query/query-keys'
import { ETH_ADDRESS } from '@towns-protocol/web3'
import { useQuery } from '../query/queryClient'

export function useSpaceTips(args: { spaceId: string }) {
    const { spaceId } = args
    const { clientSingleton } = useTownsClient()

    const getTips = useCallback(() => {
        const space = clientSingleton?.spaceDapp.getSpace(spaceId)

        if (!space) {
            return Promise.resolve({ count: 0n, amount: 0n })
        }

        return space.totalTips({ currency: ETH_ADDRESS })
    }, [clientSingleton, spaceId])

    return useQuery(blockchainKeys.spaceTotalTips(spaceId), getTips, {
        // so that other users get updates
        refetchInterval: 10_000,
    })
}
