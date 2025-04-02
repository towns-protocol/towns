import { useQuery } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { useSpaceDapp } from './use-space-dapp'
import { useCallback } from 'react'
import { useLinkedWallets } from './use-linked-wallets'
import { useMyUserId } from './use-my-user-id'
import { useTownsContext } from '../components/TownsContextProvider'

export function useHasMemberNft({
    spaceId,
    enabled = true,
}: {
    spaceId: string | undefined
    enabled?: boolean
}) {
    const { baseProvider: provider, baseConfig: config } = useTownsContext()
    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })
    const userId = useMyUserId()
    const { data: linkedWallets } = useLinkedWallets()

    const fetchNftBalance = useCallback(async () => {
        if (!spaceId || !spaceDapp || !userId || !linkedWallets) {
            return
        }

        const allPromises = linkedWallets
            .map((wallet) => spaceDapp.hasSpaceMembership(spaceId, wallet))
            .concat(spaceDapp.hasSpaceMembership(spaceId, userId))

        try {
            const results = await Promise.all(allPromises)
            return results.some((result) => result)
        } catch (e) {
            console.error(`[useHasMemberNft] error fetching nft balance`, e)
            return false
        }
    }, [linkedWallets, spaceDapp, spaceId, userId])

    return useQuery(blockchainKeys.hasMemberNft(spaceId), fetchNftBalance, {
        enabled: !!linkedWallets && !!spaceDapp && !!userId && !!spaceId && enabled,
        refetchOnMount: true,
        staleTime: 1_000 * 60 * 5,
    })
}
