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
import { ISpaceOwnerBase, ISpaceOwnerShim } from './ISpaceOwnerShim'

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
import { IRuleEntitlement } from '.'
import { IBanningShim } from './IBanningShim'
import { IERC721AQueryableShim } from './IERC721AQueryableShim'
import { IEntitlementDataQueryableShim } from './IEntitlementDataQueryableShim'
import { ContractVersion } from '../IStaticContractsInfo'
import { parseChannelMetadataJSON } from '../Utils'

interface AddressToEntitlement {
    [address: string]: EntitlementShim
}

interface SpaceConstructorArgs {
    address: string
    spaceId: string
    version: ContractVersion
    provider: ethers.providers.Provider | undefined
    spaceOwnerAddress: string
}

export class Space {
    private readonly address: string
    private readonly addressToEntitlement: AddressToEntitlement = {}
    private readonly spaceId: string
    private readonly version: ContractVersion
    public readonly provider: ethers.providers.Provider | undefined
    private readonly channel: IChannelShim
    private readonly entitlements: IEntitlementsShim
    private readonly multicall: IMulticallShim
    private readonly ownable: OwnableFacetShim
    private readonly pausable: TokenPausableFacetShim
    private readonly roles: IRolesShim
    private readonly spaceOwner: ISpaceOwnerShim
    private readonly membership: IMembershipShim
    private readonly banning: IBanningShim
    private readonly erc721AQueryable: IERC721AQueryableShim
    private readonly entitlementDataQueryable: IEntitlementDataQueryableShim

    constructor({ address, version, spaceId, provider, spaceOwnerAddress }: SpaceConstructorArgs) {
        this.address = address
        this.spaceId = spaceId
        this.version = version
        this.provider = provider
        //
        // If you add a new contract shim, make sure to add it in getAllShims()
        //
        this.channel = new IChannelShim(address, version, provider)
        this.entitlements = new IEntitlementsShim(address, version, provider)
        this.multicall = new IMulticallShim(address, version, provider)
        this.ownable = new OwnableFacetShim(address, version, provider)
        this.pausable = new TokenPausableFacetShim(address, version, provider)
        this.roles = new IRolesShim(address, version, provider)
        this.spaceOwner = new ISpaceOwnerShim(spaceOwnerAddress, version, provider)
        this.membership = new IMembershipShim(address, version, provider)
        this.banning = new IBanningShim(address, version, provider)
        this.erc721AQueryable = new IERC721AQueryableShim(address, version, provider)
        this.entitlementDataQueryable = new IEntitlementDataQueryableShim(
            address,
            version,
            provider,
        )
    }

    private getAllShims() {
        return [
            this.channel,
            this.entitlements,
            this.multicall,
            this.ownable,
            this.pausable,
            this.roles,
            this.spaceOwner,
            this.membership,
            this.banning,
            this.erc721AQueryable,
            this.entitlementDataQueryable,
        ] as const
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

    public get SpaceOwner(): ISpaceOwnerShim {
        return this.spaceOwner
    }

    public get Membership(): IMembershipShim {
        return this.membership
    }

    public get Banning(): IBanningShim {
        return this.banning
    }

    public get ERC721AQueryable(): IERC721AQueryableShim {
        return this.erc721AQueryable
    }

    public get EntitlementDataQueryable(): IEntitlementDataQueryableShim {
        return this.entitlementDataQueryable
    }

    public getSpaceInfo(): Promise<ISpaceOwnerBase.SpaceStruct> {
        return this.spaceOwner.read.getSpaceInfo(this.address)
    }

    public async getRole(roleId: BigNumberish): Promise<RoleDetails | null> {
        // get all the entitlements for the space
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
        const metadata = parseChannelMetadataJSON(channelInfo.metadata)
        return {
            spaceNetworkId: this.spaceId,
            channelNetworkId: channelNetworkId.replace('0x', ''),
            name: metadata.name,
            description: metadata.description,
            disabled: channelInfo.disabled,
            roles,
        }
    }

    public async getChannelMetadata(channelNetworkId: string): Promise<ChannelMetadata | null> {
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`
        const channelInfo = await this.Channels.read.getChannel(channelId)
        const metadata = parseChannelMetadataJSON(channelInfo.metadata)
        return {
            name: metadata.name,
            channelNetworkId: channelInfo.id.replace('0x', ''),
            description: metadata.description,
            disabled: channelInfo.disabled,
        }
    }

    public async getChannels(): Promise<ChannelMetadata[]> {
        const channels: ChannelMetadata[] = []
        const getOutput = await this.Channels.read.getChannels()
        for (const o of getOutput) {
            const metadata = parseChannelMetadataJSON(o.metadata)
            channels.push({
                name: metadata.name,
                description: metadata.description,
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
        // get all the entitlements for the space
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
        const shims = this.getAllShims()
        const first = shims[0]
        const rest = shims.slice(1)
        let err = first.parseError(error)
        if (err?.name !== UNKNOWN_ERROR) {
            return err
        }
        for (const contract of rest) {
            err = contract.parseError(error)
            if (err?.name !== UNKNOWN_ERROR) {
                return err
            }
        }
        return err
    }

    public parseLog(log: ethers.providers.Log): ethers.utils.LogDescription {
        const shims = this.getAllShims()

        for (const contract of shims) {
            try {
                return contract.parseLog(log)
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
                        this.version,
                        this.provider,
                    )
                    break
                case EntitlementModuleType.RuleEntitlement:
                    this.addressToEntitlement[address] = new RuleEntitlementShim(
                        address,
                        this.version,
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
        // get all the entitlement addresses supported in the space
        const entitlementInfo = await this.entitlements.read.getEntitlements()
        const getEntitlementShims: Promise<EntitlementShim>[] = []
        // with the addresses, get the entitlement shims
        for (const info of entitlementInfo) {
            getEntitlementShims.push(this.getEntitlementByAddress(info.moduleAddress))
        }
        return Promise.all(getEntitlementShims)
    }

    public async getEntitlementDetails(
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
                const metadata = parseChannelMetadataJSON(c.metadata)
                channelMetadatas.set(c.id, {
                    channelNetworkId: c.id.replace('0x', ''),
                    name: metadata.name,
                    description: metadata.description,
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

    public async getRoleEntitlements(
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
