import { useWeb3Context } from '../components/Web3ContextProvider'
import { useSpaceDapp } from './use-space-dapp'
import { useCallback } from 'react'
import { useQuery } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'

/**
 * Grab membership price, limit, currency, and feeRecipient for a space.
 */
export function useMembershipInfo(spaceId: string) {
    const { provider, chain } = useWeb3Context()

    const spaceDapp = useSpaceDapp({
        chainId: chain?.id,
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
