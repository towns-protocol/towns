import { useCallback } from 'react'
import { useQuery } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { useTownsContext } from '../components/TownsContextProvider'
import { useSpaceDapp } from './use-space-dapp'

export function useMembershipFreeAllocation(spaceId: string | undefined) {
    const { baseProvider: provider, baseConfig: config } = useTownsContext()

    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })

    const isEnabled = spaceDapp && !!spaceId && spaceId.length > 0

    const getMembershipFreeAllocation = useCallback(async () => {
        if (!spaceDapp || !isEnabled) {
            return undefined
        }
        const freeAllocation = await spaceDapp.getMembershipFreeAllocation(spaceId)
        return freeAllocation.toNumber()
    }, [spaceDapp, isEnabled, spaceId])

    return useQuery(blockchainKeys.membershipFreeAllocation(spaceId), getMembershipFreeAllocation, {
        enabled: isEnabled,
    })
}
