import { convertRuleDataV1ToV2, useRoleDetails } from 'use-towns-client'
import { useMemo } from 'react'
import { isEveryoneAddress } from '@components/Web3/utils'
import { convertRuleDataToTokensAndEthBalance } from '@components/Tokens/utils'

export type Entitlements = ReturnType<typeof useEntitlements>['data']

export const checkAnyoneCanJoin = (entitlements: Entitlements) =>
    entitlements &&
    entitlements.tokens.length === 0 &&
    entitlements.users.length === 1 &&
    isEveryoneAddress(entitlements.users[0])

// returns a map of all token addresses assigned to the minter role, and their tokenIds if applicable
export function useEntitlements(spaceId: string | undefined) {
    const { roleDetails: minterRoleDetails, ...rest } = useRoleDetails(spaceId ?? '', 1)

    const ruleData =
        minterRoleDetails?.ruleData.kind === 'v2'
            ? minterRoleDetails.ruleData.rules
            : minterRoleDetails?.ruleData.rules
            ? convertRuleDataV1ToV2(minterRoleDetails.ruleData.rules)
            : undefined

    const { tokens, ethBalance } = ruleData
        ? convertRuleDataToTokensAndEthBalance(ruleData)
        : { tokens: [], ethBalance: undefined }

    return useMemo(() => {
        return {
            data: {
                tokens,
                users: minterRoleDetails?.users ?? [],
                ethBalance,
            },
            ...rest,
        }
    }, [ethBalance, tokens, minterRoleDetails?.users, rest])
}
