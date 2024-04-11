import { useSpaceDapp } from './use-space-dapp'
import { staleTime24Hours, useQuery } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { useTownsContext } from '../components/TownsContextProvider'
import { useMembershipInfo } from './use-membership-info'
import { useMemo } from 'react'
import { FIXED_PRICING } from '../utils/web3'

export function usePricingModules() {
    const { baseProvider: provider, baseChain: chain, baseConfig: config } = useTownsContext()

    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })

    return useQuery(
        blockchainKeys.pricingModules(chain.id),
        () => {
            if (!spaceDapp) {
                return
            }
            return spaceDapp.listPricingModules()
        },
        {
            enabled: !!spaceDapp,
            staleTime: staleTime24Hours,
            gcTime: staleTime24Hours,
        },
    )
}

export function usePricingModuleForMembership(spaceId: string | undefined) {
    const { data: membershipInfo, isLoading: isLoadingMembershipInfo } = useMembershipInfo(
        spaceId ?? '',
    )
    const { data: pricingModules, isLoading: isLoadingPricingModules } = usePricingModules()

    return useMemo(() => {
        if (isLoadingMembershipInfo || isLoadingPricingModules) {
            return { isLoading: true, data: undefined }
        }

        if (!membershipInfo || !pricingModules) {
            return { isLoading: false, data: undefined }
        }
        const membershipPricingModuleAddress = membershipInfo.pricingModule as string
        const membershipPricingModule = pricingModules.find(
            (m) => m.module === membershipPricingModuleAddress,
        )
        if (!membershipPricingModule) {
            return { isLoading: false, data: undefined }
        }
        const isFixed = membershipPricingModule.name === FIXED_PRICING

        return {
            isLoading: false,
            data: {
                isFixed,
                ...membershipPricingModule,
            },
        }
    }, [isLoadingMembershipInfo, isLoadingPricingModules, membershipInfo, pricingModules])
}
