import { useSpaceDapp } from './use-space-dapp'
import { useCallback, useMemo } from 'react'
import { useQuery } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { useTownsContext } from '../components/TownsContextProvider'

/**
 * Grab membership price, limit, currency, and feeRecipient for a space.
 */
export function useMembershipInfo(spaceId: string) {
    const { baseProvider: provider, baseConfig: config } = useTownsContext()

    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })

    const queryKey = useMemo(() => blockchainKeys.membershipInfo(spaceId), [spaceId])

    const isEnabled = useMemo(() => Boolean(spaceDapp && spaceId.length > 0), [spaceDapp, spaceId])

    const getMembershipInfo = useCallback(() => {
        if (!spaceDapp || !isEnabled) {
            return undefined
        }
        return spaceDapp.getMembershipInfo(spaceId)
    }, [spaceDapp, isEnabled, spaceId])

    return useQuery(queryKey, getMembershipInfo, {
        enabled: isEnabled,
        staleTime: 5 * 60 * 1000, // 5 minutes in milliseconds
    })
}
