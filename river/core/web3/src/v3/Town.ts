import { BigNumber, BigNumberish, ethers } from 'ethers'
import {
    ChannelDetails,
    ChannelMetadata,
    EntitlementDetails,
    EntitlementModuleType,
    EntitlementShim,
    Permission,
    RoleDetails,
    RoleEntitlements,
    isRuleEntitlement,
    isStringArray,
    isUserEntitlement,
} from '../ContractTypes'
import { IChannelBase, IChannelShim } from './IChannelShim'
import { IRolesBase, IRolesShim } from './IRolesShim'
import { ISpaceOwnerBase, ITownOwnerShim } from './ITownOwnerShim'

import { IEntitlementsShim } from './IEntitlementsShim'
import { IMulticallShim } from './IMulticallShim'
import { OwnableFacetShim } from './OwnableFacetShim'
import { TokenPausableFacetShim } from './TokenPausableFacetShim'
import { UNKNOWN_ERROR } from './BaseContractShim'
import { UserEntitlementShim } from './UserEntitlementShim'
import { isRoleIdInArray } from '../ContractHelpers'
import { toPermissions } from '../ConvertersRoles'
import { IMembershipShim } from './IMembershipShim'
import { NoopRuleData } from '../entitlement'
import { RuleEntitlementShim } from './RuleEntitlementShim'
import { IRuleEntitlement } from './'
import { IBanningShim } from './IBanningShim'

interface AddressToEntitlement {
    [address: string]: EntitlementShim
}

interface TownConstructorArgs {
    address: string
    spaceId: string
    chainId: number
    provider: ethers.providers.Provider | undefined
    townOwnerAddress: string
}

export class Town {
    private readonly address: string
    private readonly addressToEntitlement: AddressToEntitlement = {}
    private readonly spaceId: string
    private readonly chainId: number
    private readonly provider: ethers.providers.Provider | undefined
    private readonly channel: IChannelShim
    private readonly entitlements: IEntitlementsShim
    private readonly multicall: IMulticallShim
    private readonly ownable: OwnableFacetShim
    private readonly pausable: TokenPausableFacetShim
    private readonly roles: IRolesShim
    private readonly townOwner: ITownOwnerShim
    private readonly membership: IMembershipShim
    private readonly banning: IBanningShim

    constructor({ address, spaceId, chainId, provider, townOwnerAddress }: TownConstructorArgs) {
        this.address = address
        this.spaceId = spaceId
        this.chainId = chainId
        this.provider = provider
        this.channel = new IChannelShim(address, chainId, provider)
        this.entitlements = new IEntitlementsShim(address, chainId, provider)
        this.multicall = new IMulticallShim(address, chainId, provider)
        this.ownable = new OwnableFacetShim(address, chainId, provider)
        this.pausable = new TokenPausableFacetShim(address, chainId, provider)
        this.roles = new IRolesShim(address, chainId, provider)
        this.townOwner = new ITownOwnerShim(townOwnerAddress, chainId, provider)
        this.membership = new IMembershipShim(address, chainId, provider)
        this.banning = new IBanningShim(address, chainId, provider)
    }

    public get Address(): string {
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

    public get Banning(): IBanningShim {
        return this.banning
    }

    public getTownInfo(): Promise<ISpaceOwnerBase.SpaceStruct> {
        return this.townOwner.read.getSpaceInfo(this.address)
    }

    public async getRole(roleId: BigNumberish): Promise<RoleDetails | null> {
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
            users: roleEntitlements.users,
            ruleData: roleEntitlements.ruleData,
        }
    }

    public async getChannel(channelNetworkId: string): Promise<ChannelDetails | null> {
        // get most of the channel details except the roles which
        // require a separate call to get each role's details
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`
        const channelInfo = await this.Channels.read.getChannel(channelId)
        const roles = await this.getChannelRoleEntitlements(channelInfo)
        return {
            spaceNetworkId: this.spaceId,
            channelNetworkId,
            name: channelInfo.metadata,
            disabled: channelInfo.disabled,
            roles,
        }
    }

    public async getChannels(): Promise<ChannelMetadata[]> {
        const channels: ChannelMetadata[] = []
        const getOutput = await this.Channels.read.getChannels()
        for (const o of getOutput) {
            channels.push({
                name: o.metadata,
                channelNetworkId: o.id.replace('0x', ''),
                disabled: o.disabled,
            })
        }
        return channels
    }

    public async getChannelRoles(channelNetworkId: string): Promise<IRolesBase.RoleStructOutput[]> {
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`
        // get all the roleIds for the channel
        const channelInfo = await this.Channels.read.getChannel(channelId)
        // return the role info
        return this.getRolesInfo(channelInfo.roleIds)
    }

    public async getPermissionsByRoleId(roleId: number): Promise<Permission[]> {
        const permissions = await this.Roles.read.getPermissionsByRoleId(roleId)
        return toPermissions(permissions)
    }

    private async getChannelRoleEntitlements(
        channelInfo: IChannelBase.ChannelStructOutput,
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

    public parseLog(log: ethers.providers.Log): ethers.utils.LogDescription {
        const operations = [
            () => this.channel.parseLog(log),
            () => this.pausable.parseLog(log),
            () => this.entitlements.parseLog(log),
            () => this.roles.parseLog(log),
            () => this.membership.parseLog(log),
        ]

        for (const operation of operations) {
            try {
                return operation()
            } catch (error) {
                // ignore, throw error if none match
            }
        }
        throw new Error('Failed to parse log: ' + JSON.stringify(log))
    }

    private async getEntitlementByAddress(address: string): Promise<EntitlementShim> {
        if (!this.addressToEntitlement[address]) {
            const entitlement = await this.entitlements.read.getEntitlement(address)
            switch (entitlement.moduleType) {
                case EntitlementModuleType.UserEntitlement:
                    this.addressToEntitlement[address] = new UserEntitlementShim(
                        address,
                        this.chainId,
                        this.provider,
                    )
                    break
                case EntitlementModuleType.RuleEntitlement:
                    this.addressToEntitlement[address] = new RuleEntitlementShim(
                        address,
                        this.chainId,
                        this.provider,
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

    private async getRoleInfo(roleId: BigNumberish): Promise<IRolesBase.RoleStructOutput | null> {
        try {
            return await this.roles.read.getRoleById(roleId)
        } catch (e) {
            // any error means the role doesn't exist
            //console.error(e)
            return null
        }
    }

    public async getEntitlementShims(): Promise<EntitlementShim[]> {
        // get all the entitlement addresses supported in the town
        const entitlementInfo = await this.entitlements.read.getEntitlements()
        const getEntitlementShims: Promise<EntitlementShim>[] = []
        // with the addresses, get the entitlement shims
        for (const info of entitlementInfo) {
            getEntitlementShims.push(this.getEntitlementByAddress(info.moduleAddress))
        }
        return Promise.all(getEntitlementShims)
    }

    private async getEntitlementDetails(
        entitlementShims: EntitlementShim[],
        roleId: BigNumberish,
    ): Promise<EntitlementDetails> {
        let users: string[] = []
        let ruleData
        // with the shims, get the role details for each entitlement
        const entitlements = await Promise.all(
            entitlementShims.map(async (entitlement) => {
                if (isUserEntitlement(entitlement)) {
                    return await entitlement.getRoleEntitlement(roleId)
                } else if (isRuleEntitlement(entitlement)) {
                    return await entitlement.getRoleEntitlement(roleId)
                }
                return undefined
            }),
        )

        function isRuleDataStruct(
            ruleData: IRuleEntitlement.RuleDataStruct | undefined,
        ): ruleData is IRuleEntitlement.RuleDataStruct {
            return ruleData !== undefined
        }

        for (const entitlment of entitlements) {
            if (entitlment) {
                if (isStringArray(entitlment)) {
                    users = users.concat(entitlment)
                } else if (isRuleDataStruct(entitlment)) {
                    ruleData = entitlment
                }
            }
        }

        return { users, ruleData: ruleData ?? NoopRuleData }
    }

    private async getChannelsWithRole(roleId: BigNumberish): Promise<ChannelMetadata[]> {
        const channelMetadatas = new Map<string, ChannelMetadata>()
        // get all the channels from the space
        const allChannels = await this.channel.read.getChannels()
        // for each channel, check with each entitlement if the role is in the channel
        // add the channel to the list if it is not already added
        for (const c of allChannels) {
            if (!channelMetadatas.has(c.id) && isRoleIdInArray(c.roleIds, roleId)) {
                channelMetadatas.set(c.id, {
                    channelNetworkId: c.id.replace('0x', ''),
                    name: c.metadata,
                    disabled: c.disabled,
                })
            }
        }
        return Array.from(channelMetadatas.values())
    }

    private async getRolesInfo(roleIds: BigNumber[]): Promise<IRolesBase.RoleStructOutput[]> {
        // use a Set to ensure that we only get roles once
        const roles = new Set<string>()
        const getRoleStructsAsync: Promise<IRolesBase.RoleStructOutput>[] = []
        for (const roleId of roleIds) {
            // get the role info if we don't already have it
            if (!roles.has(roleId.toString())) {
                getRoleStructsAsync.push(this.roles.read.getRoleById(roleId))
            }
        }
        // get all the role info
        return Promise.all(getRoleStructsAsync)
    }

    private async getRoleEntitlements(
        entitlementShims: EntitlementShim[],
        roleId: BigNumberish,
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
            roleId: roleInfo.id.toNumber(),
            name: roleInfo.name,
            permissions: toPermissions(roleInfo.permissions),
            users: entitlementDetails.users,
            ruleData: entitlementDetails.ruleData,
        }
    }
}
