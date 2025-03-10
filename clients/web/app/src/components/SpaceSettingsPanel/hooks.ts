import { useMemo } from 'react'
import {
    Permission,
    type RoleDetails,
    useMembershipInfo,
    usePlatformMinMembershipPrice,
    usePricingModuleForMembership,
} from 'use-towns-client'
import { BigNumber } from 'ethers'
import { channelPermissionDescriptions, townPermissionDescriptions } from './rolePermissions.const'

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

export function useIsSpaceCurrentlyFree(args: { spaceId: string | undefined }) {
    const { spaceId } = args
    const { data: membershipInfo } = useMembershipInfo(spaceId ?? '')
    const { data: spacePricingModule } = usePricingModuleForMembership(spaceId)
    const { data: minMembershipPrice } = usePlatformMinMembershipPrice()

    // 3.6.2025
    // - the only space that can be created < minMembershipPrice is a "0" price space. No 0.0000001, it won't work.
    // - if there are remaining free allocations, membershipInfo?.price = 0
    // - if there are no remaining free allocations, membershipInfo?.price = platformMembershipFee (via usePlatformMembershipFee hook)
    //
    // the platformMembershipFee SHOULD be < minMembershipPrice. This is controlled by contracts and has caused issues on different envs in the past.
    // IF platformMembershipFee > minMembershipPrice, then this check will have issues
    //
    // So THEORETICALLY, for a fixed price space, a space can have 3 prices:
    // 1. 0
    // 2. platformMembershipFee
    // 3. > minMembershipPrice
    //
    // checking minMembershipPrice seems to be the most stable across alpha/gamma/omega.
    return (
        spacePricingModule?.isFixed &&
        (membershipInfo?.price.eq(0) ||
            (minMembershipPrice instanceof BigNumber &&
                membershipInfo?.price.lt(minMembershipPrice)))
    )
}

export function useIsSpaceCurrentlyDynamic(args: { spaceId: string | undefined }) {
    const { spaceId } = args
    const { data: spacePricingModule } = usePricingModuleForMembership(spaceId)
    return !spacePricingModule?.isFixed
}
