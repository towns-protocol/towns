import { BigNumber } from 'ethers'
import { TokenDataTypes } from './shims/TokenEntitlementShim'

/**
 * Todo: Should generate and publish from our solidity contract definition.
 */
export enum Permission {
    Read = 'Read',
    Write = 'Write',
    Invite = 'Invite',
    Redact = 'Redact',
    Ban = 'Ban',
    Ping = 'Ping',
    PinMessage = 'PinMessage',
    AddRemoveChannels = 'AddRemoveChannels',
    ModifySpaceSettings = 'ModifySpaceSettings',
    Owner = 'Owner',
    Upgrade = 'Upgrade',
}

/**
 * Supported entitlement modules
 */
export enum EntitlementModuleType {
    TokenEntitlement = 'TokenEntitlement',
    UserEntitlement = 'UserEntitlement',
}

/**
 * Role details from multiple contract sources
 */
export interface RoleDetails {
    id: number
    name: string
    permissions: Permission[]
    tokens: TokenDataTypes.ExternalTokenStruct[]
    users: string[]
    channels: ChannelMetadata[]
}

/**
 * Basic channel metadata from the space contract.
 */
export interface ChannelMetadata {
    name: string
    channelNetworkId: string
    disabled: boolean
}

/**
 * Channel details from multiple contract sources
 */
export interface ChannelDetails {
    spaceNetworkId: string
    channelNetworkId: string
    name: string
    disabled: boolean
    roles: RoleEntitlements[]
    description?: string
}

/**
 * Role details for a channel from multiple contract sources
 */
export interface RoleEntitlements {
    roleId: number
    name: string
    permissions: Permission[]
    tokens: TokenDataTypes.ExternalTokenStruct[]
    users: string[]
}

export interface BasicRoleInfo {
    roleId: BigNumber
    name: string
}
