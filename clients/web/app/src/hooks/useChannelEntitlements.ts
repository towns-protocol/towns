import { useMemo } from 'react'
import { EVERYONE_ADDRESS, useChannelSettings } from 'use-towns-client'

export function useChannelEntitlements({
    spaceId,
    channelId,
}: {
    spaceId: string | undefined
    channelId: string | undefined
}) {
    const { channelSettings, error, isLoading } = useChannelSettings(spaceId ?? '', channelId ?? '')

    return useMemo(() => {
        const ruleEntitlements = channelSettings?.roles.map((r) => r.ruleData)
        const userEntitlments = channelSettings?.roles.map((r) => r.users)

        const hasRuleEntitlement = ruleEntitlements?.some((r) => {
            return r.rules.checkOperations.length > 0
        })

        const hasUserEntitlement = userEntitlments?.some(
            (u) => u.length > 0 && !u.includes(EVERYONE_ADDRESS),
        )

        const hasEveryoneEntitlement = userEntitlments?.some((u) => u.includes(EVERYONE_ADDRESS))

        return {
            hasSomeEntitlement:
                !hasEveryoneEntitlement && (hasRuleEntitlement || hasUserEntitlement),
            hasRuleEntitlement,
            hasUserEntitlement,
            hasEveryoneEntitlement,
            error,
            isLoading,
        }
    }, [channelSettings, error, isLoading])
}
