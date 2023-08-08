import { ITownArchitectBase } from './ITownArchitectShim'
import { SpaceFactoryDataTypes } from '../shims/SpaceFactoryShim'

export function fromPermisisonsToRoleInfo(
    name: string,
    permissions: string[],
): ITownArchitectBase.RoleInfoStruct {
    return {
        name,
        permissions,
    }
}

export function fromSpaceEntitlementsToMemberEntitlement(
    entitlements: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct,
): ITownArchitectBase.MemberEntitlementStruct {
    const role: ITownArchitectBase.RoleInfoStruct = fromPermisisonsToRoleInfo(
        entitlements.roleName as string,
        entitlements.permissions as string[],
    )
    return {
        role,
        tokens: entitlements.tokens,
        users: entitlements.users,
    }
}

export function fromChannelIdToChannelInfo(
    channelId: string,
    metadata?: string,
): ITownArchitectBase.ChannelInfoStruct {
    return {
        id: channelId,
        metadata: metadata || '',
    }
}
