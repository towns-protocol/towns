import { useSpaceDapp } from './use-space-dapp'
import { useCallback } from 'react'
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

    const isEnabled = spaceDapp && spaceId.length > 0

    const getMembershipInfo = useCallback(() => {
        if (!spaceDapp || !isEnabled) {
            return undefined
        }
        return spaceDapp.getMembershipInfo(spaceId)
    }, [spaceDapp, isEnabled, spaceId])

    return useQuery(blockchainKeys.membershipInfo(spaceId), getMembershipInfo, {
        enabled: isEnabled,
    })
}
