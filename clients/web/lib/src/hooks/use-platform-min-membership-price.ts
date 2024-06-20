import { useTownsContext } from '../components/TownsContextProvider'
import { useSpaceDapp } from './use-space-dapp'
import { blockchainKeys } from '../query/query-keys'
import { queryClient, useQuery } from '../query/queryClient'
import { ethers } from 'ethers'

export function usePlatformMinMembershipPrice<T>({
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
            return spaceDapp.platformRequirements.getMembershipMinPrice()
        },
        {
            enabled: !!spaceDapp,
            select,
        },
    )
}

export function getPlatformMinMembershipPriceFromQueryCache(): ethers.BigNumber | undefined {
    return queryClient.getQueryData(blockchainKeys.minimumMembershipPrice())
}
