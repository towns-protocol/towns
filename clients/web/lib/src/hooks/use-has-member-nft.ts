import { useQuery } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { useTownsClient } from './use-towns-client'
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
    const { chainId } = useTownsClient()
    const { baseProvider: provider } = useTownsContext()
    const spaceDapp = useSpaceDapp({
        chainId,
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
            await Promise.any(allPromises)
            return true
        } catch (e) {
            if (e instanceof AggregateError) {
                return false
            }
        }
    }, [linkedWallets, spaceDapp, spaceId, userId])

    return useQuery(blockchainKeys.hasMemberNft(spaceId), fetchNftBalance, {
        enabled: !!linkedWallets && !!spaceDapp && !!userId && !!spaceId && enabled,
        refetchOnMount: true,
    })
}
