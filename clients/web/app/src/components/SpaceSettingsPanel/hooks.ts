import { useMemo } from 'react'
import {
    Address,
    Permission,
    type RoleDetails,
    useMembershipInfo,
    usePricingModuleForMembership,
    useRoleDetails,
} from 'use-towns-client'
import { isEveryoneAddress } from '@components/Web3/utils'
import { TokenWithBigInt } from '@components/Tokens/TokenSelector/tokenSchemas'
import { useTokensWithMetadata } from 'api/lib/collectionMetadata'
import { useConvertRuleDataToToken } from '@components/Tokens/hooks'
import { formatUnits } from 'hooks/useBalance'
import { channelPermissionDescriptions, townPermissionDescriptions } from './rolePermissions.const'

export function useMembershipInfoAndRoleDetails(spaceId: string | undefined) {
    const {
        data: membershipInfo,
        isLoading: isLoadingMembershipInfo,
        error: membershipInfoError,
    } = useMembershipInfo(spaceId ?? '')
    // get role details of the minter role
    // TBD will xchain entitlements change this?
    const {
        isLoading: isLoadingRoleDetails,
        roleDetails,
        error: roleDetailsError,
    } = useRoleDetails(spaceId ?? '', 1)

    const { data: membershipPricingModule, isLoading: isLoadingMembershipPricingModule } =
        usePricingModuleForMembership(spaceId)

    return useMemo(() => {
        if (!spaceId) {
            return { isLoading: false, data: undefined, error: undefined }
        }
        if (isLoadingMembershipInfo || isLoadingRoleDetails || isLoadingMembershipPricingModule) {
            return { isLoading: true, data: undefined, error: undefined }
        }
        if (membershipInfoError || roleDetailsError) {
            return {
                isLoading: false,
                data: undefined,
                error: membershipInfoError || roleDetailsError,
            }
        }
        return {
            isLoading: false,
            data: { membershipInfo, roleDetails, pricingModule: membershipPricingModule },
            error: undefined,
        }
    }, [
        isLoadingMembershipInfo,
        isLoadingMembershipPricingModule,
        isLoadingRoleDetails,
        membershipInfo,
        membershipInfoError,
        membershipPricingModule,
        roleDetails,
        roleDetailsError,
        spaceId,
    ])
}

function useGatingType(
    roleDetails: RoleDetails | null | undefined,
    initialTokenValues: TokenWithBigInt[],
    ethBalance: bigint,
): 'gated' | 'everyone' {
    return useMemo(() => {
        if (initialTokenValues.length > 0 || ethBalance > 0n) {
            return 'gated'
        }
        return roleDetails?.users?.some((address: string) => !isEveryoneAddress(address))
            ? 'gated'
            : 'everyone'
    }, [roleDetails, initialTokenValues.length, ethBalance])
}

function useUsersGatedBy(roleDetails: RoleDetails | null | undefined) {
    return useMemo(() => {
        return (roleDetails?.users || []).filter(
            (address: string) => !isEveryoneAddress(address),
        ) as Address[]
    }, [roleDetails])
}

export function useGatingInfo(roleDetails: RoleDetails | null | undefined) {
    const { ethBalance, tokens } = useConvertRuleDataToToken(roleDetails?.ruleData)

    const { data: tokensGatedBy, isLoading: isTokensGatedByLoading } = useTokensWithMetadata(tokens)

    const gatingType = useGatingType(roleDetails, tokens, ethBalance ?? 0n)
    const usersGatedBy = useUsersGatedBy(roleDetails)
    const ethBalanceGatedBy = ethBalance ? formatUnits(ethBalance, 18) : ''

    return useMemo(
        () => ({
            gatingType,
            usersGatedBy,
            tokensGatedBy,
            ethBalanceGatedBy,
            isTokensGatedByLoading,
        }),
        [gatingType, usersGatedBy, tokensGatedBy, isTokensGatedByLoading, ethBalanceGatedBy],
    )
}

export function useChannelAndTownRoleDetails(roleDetails: RoleDetails | null | undefined) {
    return useMemo(() => {
        const channelRoleDetails: RoleDetails | undefined = roleDetails
            ? { ...roleDetails }
            : undefined
        const townRoleDetails: RoleDetails | undefined = roleDetails
            ? { ...roleDetails }
            : undefined

        if (channelRoleDetails) {
            channelRoleDetails.permissions = channelRoleDetails.permissions.filter(
                (p) => channelPermissionDescriptions[p],
            )
        }

        if (townRoleDetails) {
            townRoleDetails.permissions = townRoleDetails.permissions.filter(
                (p) => townPermissionDescriptions[p],
            )
        }

        const defaultChannelPermissionsValues = channelRoleDetails
            ? (() => {
                  const { permissions } = channelRoleDetails
                  // for existing roles pre react permission, add it if write is present
                  const defaultP = permissions.includes(Permission.Write)
                      ? permissions.concat(Permission.React)
                      : permissions
                  return [...new Set(defaultP)]
              })()
            : []

        return {
            channelRoleDetails,
            townRoleDetails,
            defaultChannelPermissionsValues,
        }
    }, [roleDetails])
}
