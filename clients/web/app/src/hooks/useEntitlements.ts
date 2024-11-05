import { convertRuleDataV1ToV2, useRoleDetails } from 'use-towns-client'
import { useMemo } from 'react'
import { isEveryoneAddress } from '@components/Web3/utils'
import { convertRuleDataToTokensAndEthBalance } from '@components/Tokens/utils'
import { useTokensWithMetadata } from 'api/lib/collectionMetadata'

export type Entitlements = ReturnType<typeof useEntitlements>['data']

// returns a map of all token addresses assigned to the passed role or minter role by default, and their tokenIds if applicable
export function useEntitlements(spaceId: string | undefined, roleId?: number | undefined) {
    const {
        roleDetails: roleDetails,
        isLoading: isRoleDetailsLoading,
        error: roleDetailsError,
    } = useRoleDetails(spaceId ?? '', roleId ?? 1)

    const ruleData =
        roleDetails?.ruleData.kind === 'v2'
            ? roleDetails.ruleData.rules
            : roleDetails?.ruleData.rules
            ? convertRuleDataV1ToV2(roleDetails.ruleData.rules)
            : undefined

    const { tokens: tokensFromRuleData, ethBalance: ethBalanceFromRuleData } = ruleData
        ? convertRuleDataToTokensAndEthBalance(ruleData)
        : { tokens: [], ethBalance: '' }

    const {
        data: tokens,
        isLoading: isTokensLoading,
        isError: isTokensError,
    } = useTokensWithMetadata(tokensFromRuleData)

    const users = (roleDetails?.users ?? []).filter((user) => !isEveryoneAddress(user))
    const ethBalance = ethBalanceFromRuleData

    return useMemo(() => {
        return {
            data: {
                tokens,
                users,
                ethBalance,
                hasEntitlements: Boolean(
                    tokens.length > 0 || users.length > 0 || ethBalance.length > 0,
                ),
            },
            isLoading: isRoleDetailsLoading || isTokensLoading,
            isError: !!roleDetailsError || isTokensError,
        }
    }, [
        tokens,
        users,
        ethBalance,
        isRoleDetailsLoading,
        isTokensLoading,
        roleDetailsError,
        isTokensError,
    ])
}
