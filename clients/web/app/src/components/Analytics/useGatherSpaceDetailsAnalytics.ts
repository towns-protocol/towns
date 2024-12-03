import { useMemo } from 'react'
import { useMembershipInfo, usePricingModuleForMembership } from 'use-towns-client'
import { useEntitlements } from 'hooks/useEntitlements'
import { useChannelEntitlements } from 'hooks/useChannelEntitlements'
import { minterRoleId } from '@components/SpaceSettingsPanel/rolePermissions.const'

export type TokenGatedByAnalytics = {
    address: string
    chainId: number
    tokenType: string
    quantity: string | undefined
    tokenId: string | undefined
}

export function useGatherSpaceDetailsAnalytics(args: {
    spaceId: string | undefined
    channelId?: string
}) {
    const { spaceId, channelId } = args
    const { data: entitlements } = useEntitlements(spaceId, minterRoleId)
    const { data: pricingData } = usePricingModuleForMembership(spaceId)
    const { data: membershipInfo } = useMembershipInfo(spaceId ?? '')
    const { hasSomeEntitlement: hasChannelEntitlement, channelName } = useChannelEntitlements({
        spaceId,
        channelId,
    })

    return useMemo(() => {
        const isFixed = pricingData?.isFixed
        const priceInWei = membershipInfo?.price?.toString() ?? '0'
        const isFree = isFixed && priceInWei === '0'

        const track: {
            gatedSpace: boolean
            pricingModule: 'free' | 'fixed' | 'dynamic'
            priceInWei: string
            tokensGatedBy: TokenGatedByAnalytics[]
            gatedChannel?: boolean
            channelName?: string
        } = {
            gatedSpace: entitlements?.hasEntitlements,
            pricingModule: isFree ? 'free' : isFixed ? 'fixed' : 'dynamic',
            priceInWei,
            tokensGatedBy: entitlements?.tokens.map((t) => ({
                address: t.data.address,
                chainId: t.chainId,
                tokenType: t.data.type,
                quantity: t.data.quantity,
                tokenId: t.data.tokenId,
            })),
        }
        if (channelId) {
            track.gatedChannel = hasChannelEntitlement
            track.channelName = channelName
        }
        return track
    }, [
        pricingData?.isFixed,
        membershipInfo?.price,
        entitlements?.hasEntitlements,
        entitlements?.tokens,
        channelId,
        hasChannelEntitlement,
        channelName,
    ])
}
