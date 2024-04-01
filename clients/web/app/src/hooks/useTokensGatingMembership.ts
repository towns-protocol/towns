import { useRoleDetails } from 'use-towns-client'
import { useMemo } from 'react'
import { isEveryoneAddress } from '@components/Web3/utils'
import { convertRuleDataToTokenFormSchema } from '@components/Tokens/utils'

export const checkAnyoneCanJoin = (
    tokensGatingMembership: ReturnType<typeof useTokensGatingMembership>['data'],
) =>
    tokensGatingMembership &&
    tokensGatingMembership.tokens.length === 0 &&
    tokensGatingMembership.users.length === 1 &&
    isEveryoneAddress(tokensGatingMembership.users[0])

export type TokenGatingMembership = ReturnType<typeof useTokensGatingMembership>['data']
// returns a map of all token addresses assigned to the minter role, and their tokenIds if applicable
export function useTokensGatingMembership(spaceId: string | undefined) {
    const { roleDetails: minterRoleDetails, ...rest } = useRoleDetails(spaceId ?? '', 1)

    return useMemo(() => {
        return {
            data: {
                tokens: minterRoleDetails?.ruleData
                    ? convertRuleDataToTokenFormSchema(minterRoleDetails.ruleData)
                    : [],
                users: minterRoleDetails?.users ?? [],
            },
            ...rest,
        }
    }, [minterRoleDetails, rest])
}
