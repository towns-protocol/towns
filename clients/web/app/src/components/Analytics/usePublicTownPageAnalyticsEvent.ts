import { useEffect } from 'react'
import { useContractSpaceInfoWithoutClient } from 'use-towns-client'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { publicPageLoginStore } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { useJoinFunnelAnalytics } from '@components/Analytics/useJoinFunnelAnalytics'
import { useReadableMembershipInfo } from '@components/TownPageLayout/useReadableMembershipInfo'
import { useGatherSpaceDetailsAnalytics } from './useGatherSpaceDetailsAnalytics'

export function usePublicTownsPageAnalyticsEvent({ authenticated }: { authenticated: boolean }) {
    const spaceId = useSpaceIdFromPathname()
    const { data: membershipInfo } = useReadableMembershipInfo(spaceId ?? '')
    const { data: spaceInfo } = useContractSpaceInfoWithoutClient(spaceId)
    const { publicTownPage } = useJoinFunnelAnalytics()
    const { gatedSpace, pricingModule } = useGatherSpaceDetailsAnalytics({ spaceId })

    useEffect(() => {
        if (spaceInfo && membershipInfo && pricingModule && gatedSpace !== undefined) {
            publicTownPage({
                authenticated,
                spaceId,
                spaceName: spaceInfo.name,
                pricingModel: membershipInfo.remainingFreeSupply ? 'free' : 'paid',
                postOAuthRedirect: !!publicPageLoginStore.getState().spaceBeingJoined,
                gatedSpace,
                pricingModule,
            })
        }
    }, [
        spaceInfo,
        membershipInfo,
        spaceId,
        authenticated,
        publicTownPage,
        gatedSpace,
        pricingModule,
    ])
}
