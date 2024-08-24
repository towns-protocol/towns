import { useMemo } from 'react'
import {
    CheckOperationType,
    EVERYONE_ADDRESS,
    convertRuleDataV1ToV2,
    createDecodedCheckOperationFromTree,
    useChannelSettings,
} from 'use-towns-client'

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

        const tokenTypes = hasRuleEntitlement
            ? ruleEntitlements
                  ?.map((r) => (r.kind === 'v2' ? r.rules : convertRuleDataV1ToV2(r.rules)))
                  ?.map((r) => createDecodedCheckOperationFromTree(r))
                  ?.flatMap((c) => c.map((p) => p.type))
                  .filter(
                      (t) =>
                          t === CheckOperationType.ERC721 ||
                          t === CheckOperationType.ERC1155 ||
                          t === CheckOperationType.ERC20,
                  )
            : undefined

        return {
            hasSomeEntitlement: hasRuleEntitlement || hasUserEntitlement,
            hasRuleEntitlement,
            hasUserEntitlement,
            tokenTypes: [...new Set(tokenTypes)],
            error,
            isLoading,
        }
    }, [channelSettings, error, isLoading])
}
