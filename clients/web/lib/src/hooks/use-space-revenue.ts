import { useSpaceDapp } from './use-space-dapp'
import { useCallback } from 'react'
import { useQuery } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { useTownsContext } from '../components/TownsContextProvider'

export function useSpaceRevenue(args: {
    spaceId: string | undefined
    enabled?: boolean
    refetchInterval?: number
}) {
    const { spaceId, enabled = true, refetchInterval } = args
    const { baseProvider: provider, baseConfig: config } = useTownsContext()

    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })

    const isEnabled = enabled && spaceDapp && !!spaceId && spaceId.length > 0

    const getSpaceRevenue = useCallback(async () => {
        if (!spaceDapp || !isEnabled) {
            return
        }
        try {
            const space = spaceDapp.getSpace(spaceId)
            const revenue = await space?.Membership.read.revenue()
            if (revenue === undefined) {
                return 0n
            }
            return revenue.toBigInt()
        } catch (error) {
            console.error('[useSpaceRevenue] error', error)
            return 0n
        }
    }, [spaceDapp, isEnabled, spaceId])

    return useQuery(blockchainKeys.spaceRevenue(spaceId), getSpaceRevenue, {
        enabled: isEnabled,
        refetchInterval,
    })
}
