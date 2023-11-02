import {
    ChannelDetails,
    ChannelMetadata,
    EntitlementDetails,
    EntitlementModuleType,
    EntitlementShim,
    Permission,
    RoleDetails,
    RoleEntitlements,
    isExternalTokenStructArray,
    isStringArray,
    isTokenEntitlement,
    isUserEntitlement,
} from './ContractTypes'
import { IChannelShim } from './IChannelShim'
import { IRolesShim } from './IRolesShim'
import { ITownOwnerShim } from './ITownOwnerShim'
import { TokenEntitlementShim } from './TokenEntitlementShim'
import { IChannelBase, IRolesBase, ITownOwnerBase, TokenEntitlementDataTypes } from './types'

import { IEntitlementsShim } from './IEntitlementsShim'
import { IMulticallShim } from './IMulticallShim'
import { OwnableFacetShim } from './OwnableFacetShim'
import { TokenPausableFacetShim } from './TokenPausableFacetShim'
import { UNKNOWN_ERROR } from './BaseContractShim'
import { UserEntitlementShim } from './UserEntitlementShim'
import { isRoleIdInArray } from './ContractHelpers'
import { toPermissions } from './ConvertersRoles'
import { IMembershipShim } from './IMembershipShim'
import { Address, PublicClient } from 'viem'

interface AddressToEntitlement {
    [address: Address]: EntitlementShim
}

interface TownConstructorArgs {
    address: Address
    spaceId: string
    chainId: number
    publicClient: PublicClient | undefined
    townOwnerAddress: Address
}

export class Town {
    private readonly address: Address
    private readonly addressToEntitlement: AddressToEntitlement = {}
    private readonly spaceId: string
    private readonly chainId: number
    private readonly publicClient: TownConstructorArgs['publicClient']
    private readonly channel: IChannelShim
    private readonly entitlements: IEntitlementsShim
    private readonly multicall: IMulticallShim
    private readonly ownable: OwnableFacetShim
    private readonly pausable: TokenPausableFacetShim
    private readonly roles: IRolesShim
    private readonly townOwner: ITownOwnerShim
    private readonly membership: IMembershipShim

    constructor({
        address,
        spaceId,
        chainId,
        publicClient,
        townOwnerAddress,
    }: TownConstructorArgs) {
        this.address = address
        this.spaceId = spaceId
        this.chainId = chainId
        this.publicClient = publicClient
        this.channel = new IChannelShim(address, chainId, publicClient)
        this.entitlements = new IEntitlementsShim(address, chainId, publicClient)
        this.multicall = new IMulticallShim(address, chainId, publicClient)
        this.ownable = new OwnableFacetShim(address, chainId, publicClient)
        this.pausable = new TokenPausableFacetShim(address, chainId, publicClient)
        this.roles = new IRolesShim(address, chainId, publicClient)
        this.townOwner = new ITownOwnerShim(townOwnerAddress, chainId, publicClient)
        this.membership = new IMembershipShim(address, chainId, publicClient)
    }

    public get Address(): Address {
        return this.address
    }

    public get SpaceId(): string {
        return this.spaceId
    }

    public get Channels(): IChannelShim {
        return this.channel
    }

    public get Multicall(): IMulticallShim {
        return this.multicall
    }

    public get Ownable(): OwnableFacetShim {
        return this.ownable
    }

    public get Pausable(): TokenPausableFacetShim {
        return this.pausable
    }

    public get Roles(): IRolesShim {
        return this.roles
    }

    public get Entitlements(): IEntitlementsShim {
        return this.entitlements
    }

    public get TownOwner(): ITownOwnerShim {
        return this.townOwner
    }

    public get Membership(): IMembershipShim {
        return this.membership
    }

    public getTownInfo(): Promise<ITownOwnerBase['TownStruct']> {
        return this.townOwner.read({
            functionName: 'getTownInfo',
            args: [this.address],
        })
    }

    public async getRole(roleId: bigint): Promise<RoleDetails | null> {
        // get all the entitlements for the town
        const entitlementShims = await this.getEntitlementShims()
        // get the various pieces of details
        const [roleEntitlements, channels] = await Promise.all([
            this.getRoleEntitlements(entitlementShims, roleId),
            this.getChannelsWithRole(roleId),
        ])
        // assemble the result
        if (roleEntitlements === null) {
            return null
        }
        return {
            id: roleEntitlements.roleId,
            name: roleEntitlements.name,
            permissions: roleEntitlements.permissions,
            channels,
            tokens: roleEntitlements.tokens,
            users: roleEntitlements.users,
        }
    }

    public async getChannel(channelId: string): Promise<ChannelDetails | null> {
        // get most of the channel details except the roles which
        // require a separate call to get each role's details
        const channelInfo = await this.Channels.read({
            functionName: 'getChannel',
            args: [channelId],
        })
        const roles = await this.getChannelRoleEntitlements(channelInfo)
        return {
            spaceNetworkId: this.spaceId,
            channelNetworkId: channelId,
            name: channelInfo.metadata,
            disabled: channelInfo.disabled,
            roles,
        }
    }

    public async getChannels(): Promise<ChannelMetadata[]> {
        const channels: ChannelMetadata[] = []
        const getOutput = await this.Channels.read({
            functionName: 'getChannels',
        })
        for (const o of getOutput) {
            channels.push({
                name: o.metadata,
                channelNetworkId: o.id,
                disabled: o.disabled,
            })
        }
        return channels
    }

    public async getChannelRoles(channelId: string): Promise<IRolesBase['RoleStructOutput'][]> {
        // get all the roleIds for the channel
        const channelInfo = await this.Channels.read({
            functionName: 'getChannel',
            args: [channelId],
        })
        // return the role info
        return this.getRolesInfo(channelInfo.roleIds)
    }

    public async getPermissionsByRoleId(roleId: number): Promise<Permission[]> {
        const permissions = await this.Roles.read({
            functionName: 'getPermissionsByRoleId',
            args: [BigInt(roleId)],
        })
        return toPermissions(permissions)
    }

    private async getChannelRoleEntitlements(
        channelInfo: IChannelBase['ChannelStructOutput'],
    ): Promise<RoleEntitlements[]> {
        // get all the entitlements for the town
        const entitlementShims = await this.getEntitlementShims()
        const getRoleEntitlementsAsync: Promise<RoleEntitlements | null>[] = []
        for (const roleId of channelInfo.roleIds) {
            getRoleEntitlementsAsync.push(this.getRoleEntitlements(entitlementShims, roleId))
        }
        // get all the role info
        const allRoleEntitlements = await Promise.all(getRoleEntitlementsAsync)
        return allRoleEntitlements.filter((r) => r !== null) as RoleEntitlements[]
    }

    public async findEntitlementByType(
        entitlementType: EntitlementModuleType,
    ): Promise<EntitlementShim | null> {
        const entitlements = await this.getEntitlementShims()
        for (const entitlement of entitlements) {
            if (entitlement.moduleType === entitlementType) {
                return entitlement
            }
        }
        return null
    }

    public parseError(error: unknown): Error {
        // try each of the contracts to see who can give the best error message
        let err = this.channel.parseError(error)
        if (err?.name !== UNKNOWN_ERROR) {
            return err
        }
        err = this.pausable.parseError(error)
        if (err?.name !== UNKNOWN_ERROR) {
            return err
        }
        err = this.entitlements.parseError(error)
        if (err?.name !== UNKNOWN_ERROR) {
            return err
        }
        err = this.roles.parseError(error)
        if (err?.name !== UNKNOWN_ERROR) {
            return err
        }
        err = this.membership.parseError(error)
        if (err?.name !== UNKNOWN_ERROR) {
            return err
        }
        return err
    }

    private async getEntitlementByAddress(address: Address): Promise<EntitlementShim> {
        if (!this.addressToEntitlement[address]) {
            const entitlement = await this.entitlements.read({
                functionName: 'getEntitlement',
                args: [address],
            })
            switch (entitlement.moduleType) {
                case EntitlementModuleType.TokenEntitlement:
                    this.addressToEntitlement[address] = new TokenEntitlementShim(
                        address,
                        this.chainId,
                        this.publicClient,
                    )
                    break
                case EntitlementModuleType.UserEntitlement:
                    this.addressToEntitlement[address] = new UserEntitlementShim(
                        address,
                        this.chainId,
                        this.publicClient,
                    )
                    break
                default:
                    throw new Error(
                        `Unsupported entitlement module type: ${entitlement.moduleType}`,
                    )
            }
        }
        return this.addressToEntitlement[address]
    }

    private async getRoleInfo(roleId: bigint): Promise<IRolesBase['RoleStructOutput'] | null> {
        try {
            return await this.roles.read({
                functionName: 'getRoleById',
                args: [roleId],
            })
        } catch (e) {
            // any error means the role doesn't exist
            //console.error(e)
            return null
        }
    }

    public async getEntitlementShims(): Promise<EntitlementShim[]> {
        // get all the entitlement addresses supported in the town
        const entitlementInfo = await this.entitlements.read({
            functionName: 'getEntitlements',
        })
        const getEntitlementShims: Promise<EntitlementShim>[] = []
        // with the addresses, get the entitlement shims
        for (const info of entitlementInfo) {
            getEntitlementShims.push(this.getEntitlementByAddress(info.moduleAddress))
        }
        return Promise.all(getEntitlementShims)
    }

    private async getEntitlementDetails(
        entitlementShims: EntitlementShim[],
        roleId: bigint,
    ): Promise<EntitlementDetails> {
        let tokens: TokenEntitlementDataTypes['ExternalTokenStruct'][] = []
        let users: string[] = []
        // with the shims, get the role details for each entitlement
        const getEntitlements: Promise<
            TokenEntitlementDataTypes['ExternalTokenStruct'][] | string[]
        >[] = []
        for (const entitlement of entitlementShims) {
            if (isTokenEntitlement(entitlement)) {
                getEntitlements.push(entitlement.getRoleEntitlement(roleId))
            } else if (isUserEntitlement(entitlement)) {
                getEntitlements.push(entitlement.getRoleEntitlement(roleId))
            }
        }
        const entitlements = await Promise.all(getEntitlements)
        for (const entitlment of entitlements) {
            if (isExternalTokenStructArray(entitlment)) {
                tokens = tokens.concat(entitlment)
            } else if (isStringArray(entitlment)) {
                users = users.concat(entitlment)
            }
        }

        return { tokens, users }
    }

    private async getChannelsWithRole(roleId: bigint): Promise<ChannelMetadata[]> {
        const channelMetadatas = new Map<string, ChannelMetadata>()
        // get all the channels from the space
        const allChannels = await this.channel.read({
            functionName: 'getChannels',
        })
        // for each channel, check with each entitlement if the role is in the channel
        // add the channel to the list if it is not already added
        for (const c of allChannels) {
            // TODO: EVAN don't pass an empty array, just doing this so types compile
            if (!channelMetadatas.has(c.id) && isRoleIdInArray([], roleId)) {
                channelMetadatas.set(c.id, {
                    channelNetworkId: c.id,
                    name: c.metadata,
                    disabled: c.disabled,
                })
            }
        }
        return Array.from(channelMetadatas.values())
    }

    private async getRolesInfo(
        roleIds: readonly bigint[],
    ): Promise<IRolesBase['RoleStructOutput'][]> {
        // use a Set to ensure that we only get roles once
        const roles = new Set<string>()
        const getRoleStructsAsync: Promise<IRolesBase['RoleStructOutput']>[] = []
        for (const roleId of roleIds) {
            // get the role info if we don't already have it
            if (!roles.has(roleId.toString())) {
                const roleInfoPromise = this.roles.read({
                    functionName: 'getRoleById',
                    args: [roleId],
                })
                getRoleStructsAsync.push(roleInfoPromise)
            }
        }
        // get all the role info
        return Promise.all(getRoleStructsAsync)
    }

    private async getRoleEntitlements(
        entitlementShims: EntitlementShim[],
        roleId: bigint,
    ): Promise<RoleEntitlements | null> {
        const [roleInfo, entitlementDetails] = await Promise.all([
            this.getRoleInfo(roleId),
            this.getEntitlementDetails(entitlementShims, roleId),
        ])
        // assemble the result
        if (roleInfo === null) {
            return null
        }
        return {
            roleId: Number(roleInfo.id),
            name: roleInfo.name,
            permissions: toPermissions(roleInfo.permissions),
            tokens: entitlementDetails.tokens,
            users: entitlementDetails.users,
        }
    }
}
