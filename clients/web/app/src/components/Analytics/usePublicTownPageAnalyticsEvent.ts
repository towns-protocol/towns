import { useEffect } from 'react'
import { useContractSpaceInfoWithoutClient } from 'use-towns-client'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { publicPageLoginStore } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { useJoinFunnelAnalytics } from '@components/Analytics/useJoinFunnelAnalytics'
import { useReadableMembershipInfo } from '@components/TownPageLayout/useReadableMembershipInfo'

export function usePublicTownsPageAnalyticsEvent({ authenticated }: { authenticated: boolean }) {
    const spaceId = useSpaceIdFromPathname()
    const { data: membershipInfo } = useReadableMembershipInfo(spaceId ?? '')
    const { data: spaceInfo } = useContractSpaceInfoWithoutClient(spaceId)
    const { publicTownPage } = useJoinFunnelAnalytics()

    useEffect(() => {
        if (spaceInfo && membershipInfo) {
            publicTownPage({
                authenticated,
                spaceId,
                spaceName: spaceInfo.name,
                pricingModel: membershipInfo.remainingFreeSupply ? 'free' : 'paid',
                postOAuthRedirect: !!publicPageLoginStore.getState().spaceBeingJoined,
            })
        }
    }, [spaceInfo, membershipInfo, spaceId, authenticated, publicTownPage])
}
