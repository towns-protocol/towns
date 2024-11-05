import { useMemo } from 'react'
import {
    Permission,
    type RoleDetails,
    useMembershipInfo,
    usePricingModuleForMembership,
    useRoleDetails,
} from 'use-towns-client'
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
