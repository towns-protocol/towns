import { convertRuleDataV1ToV2, useRoleDetails } from 'use-towns-client'
import { useMemo } from 'react'
import { isEveryoneAddress } from '@components/Web3/utils'
import { convertRuleDataToTokenEntitlementSchema } from '@components/Tokens/utils'

export type Entitlements = ReturnType<typeof useEntitlements>['data']

export const checkAnyoneCanJoin = (entitlements: Entitlements) =>
    entitlements &&
    entitlements.tokens.length === 0 &&
    entitlements.users.length === 1 &&
    isEveryoneAddress(entitlements.users[0])

// returns a map of all token addresses assigned to the minter role, and their tokenIds if applicable
export function useEntitlements(spaceId: string | undefined) {
    const { roleDetails: minterRoleDetails, ...rest } = useRoleDetails(spaceId ?? '', 1)

    return useMemo(() => {
        return {
            data: {
                tokens: minterRoleDetails?.ruleData
                    ? convertRuleDataToTokenEntitlementSchema(
                          minterRoleDetails.ruleData.kind === 'v2'
                              ? minterRoleDetails.ruleData.rules
                              : convertRuleDataV1ToV2(minterRoleDetails.ruleData.rules),
                      )
                    : [],
                users: minterRoleDetails?.users ?? [],
            },
            ...rest,
        }
    }, [minterRoleDetails, rest])
}
