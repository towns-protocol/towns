import { useTownsContext } from '../components/TownsContextProvider'
import { useSpaceDapp } from './use-space-dapp'
import { blockchainKeys } from '../query/query-keys'
import { queryClient, useQuery } from '../query/queryClient'
import { ethers } from 'ethers'

export function usePlatformMintLimit() {
    const { baseProvider: provider, baseConfig: config } = useTownsContext()
    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })

    return useQuery(
        blockchainKeys.membershipMintLimit(),
        async () => {
            const limit = await spaceDapp.platformRequirements.getMembershipMintLimit()
            return limit.toNumber()
        },
        {
            enabled: !!spaceDapp,
        },
    )
}

export function getPlatformMinMembershipPriceFromQueryCache(): ethers.BigNumber | undefined {
    return queryClient.getQueryData(blockchainKeys.minimumMembershipPrice())
}
