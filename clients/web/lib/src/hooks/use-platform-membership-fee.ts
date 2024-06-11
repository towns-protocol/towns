import { useTownsContext } from '../components/TownsContextProvider'
import { useSpaceDapp } from './use-space-dapp'
import { blockchainKeys } from '../query/query-keys'
import { queryClient, useQuery } from '../query/queryClient'
import { ethers } from 'ethers'

export function usePlatformMembershipFee<T>({
    select,
}: {
    select?: (data: ethers.BigNumber) => T
} = {}) {
    const { baseProvider: provider, baseConfig: config } = useTownsContext()
    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })

    return useQuery(
        blockchainKeys.minimumMembershipPrice(),
        () => {
            return spaceDapp.platformRequirements.getMembershipFee()
        },
        {
            enabled: !!spaceDapp,
            select,
        },
    )
}

export function getPlatformMembershipFeeFromQueryCache(): ethers.BigNumber | undefined {
    return queryClient.getQueryData(blockchainKeys.minimumMembershipPrice())
}
