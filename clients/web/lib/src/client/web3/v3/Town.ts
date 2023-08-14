import { BigNumberish, ethers } from 'ethers'
import {
    ChannelMetadata,
    EntitlementModuleType,
    EntitlementShim,
    RoleDetails,
    isExternalTokenStructArray,
    isStringArray,
    isTokenEntitlement,
    isUserEntitlement,
} from '../ContractTypes'
import { IRolesBase, IRolesShim } from './IRolesShim'
import { TokenEntitlementDataTypes, TokenEntitlementShim } from './TokenEntitlementShim'

import { IChannelShim } from './IChannelShim'
import { IEntitlementsShim } from './IEntitlementsShim'
import { OwnableFacetShim } from './OwnableFacetShim'
import { TokenPausableFacetShim } from './TokenPausableFacetShim'
import { UNKNOWN_ERROR } from './BaseContractShimV3'
import { UserEntitlementShim } from './UserEntitlementShim'
import { isRoleIdInArray } from '../ContractHelpers'
import { toPermissions } from './ConvertersRoles'

interface EntitlementShims {
    [address: string]: EntitlementShim
}

export class Town {
    private readonly address: string
    private readonly spaceId: string
    private readonly chainId: number
    private readonly provider: ethers.providers.Provider | undefined
    private readonly channel: IChannelShim
    private readonly entitlements: IEntitlementsShim
    private readonly ownable: OwnableFacetShim
    private readonly pausable: TokenPausableFacetShim
    private readonly roles: IRolesShim
    private readonly entitlementShims: EntitlementShims = {}

    constructor(
        address: string,
        spaceId: string,
        chainId: number,
        provider: ethers.providers.Provider | undefined,
    ) {
        this.address = address
        this.spaceId = spaceId
        this.chainId = chainId
        this.provider = provider
        this.channel = new IChannelShim(address, chainId, provider)
        this.entitlements = new IEntitlementsShim(address, chainId, provider)
        this.ownable = new OwnableFacetShim(address, chainId, provider)
        this.pausable = new TokenPausableFacetShim(address, chainId, provider)
        this.roles = new IRolesShim(address, chainId, provider)
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

    public async getRole(roleId: BigNumberish): Promise<RoleDetails | null> {
        // get the various pieces of details
        const [roleInfo, roleEntitlements, channels] = await Promise.all([
            this.getRoleInfo(roleId),
            this.getEntitlementDetails(roleId),
            this.getChannelsWithRole(roleId),
        ])
        // assemble the result
        let roleDetails: RoleDetails | null = null
        if (roleInfo) {
            roleDetails = {
                id: roleInfo.id.toNumber(),
                name: roleInfo.name,
                permissions: toPermissions(roleInfo.permissions),
                channels,
                tokens: roleEntitlements.tokens,
                users: roleEntitlements.users,
            }
        }
        return roleDetails
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
        return err
    }

    private async getEntitlementShim(address: string): Promise<EntitlementShim> {
        if (!this.entitlementShims[address]) {
            const entitlement = await this.entitlements.read.getEntitlement(address)
            switch (entitlement.moduleType) {
                case EntitlementModuleType.TokenEntitlement:
                    this.entitlementShims[address] = new TokenEntitlementShim(
                        address,
                        this.chainId,
                        this.provider,
                    )
                    break
                case EntitlementModuleType.UserEntitlement:
                    this.entitlementShims[address] = new UserEntitlementShim(
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
        return this.entitlementShims[address]
    }

    private async getRoleInfo(roleId: BigNumberish): Promise<IRolesBase.RoleStructOutput> {
        return this.roles.read.getRoleById(roleId)
    }

    private async getEntitlementShims(): Promise<EntitlementShim[]> {
        // get all the entitlement addresses supported in the town
        const entitlementInfo = await this.entitlements.read.getEntitlements()
        const getEntitlementShims: Promise<EntitlementShim>[] = []
        // with the addresses, get the entitlement shims
        for (const info of entitlementInfo) {
            getEntitlementShims.push(this.getEntitlementShim(info.moduleAddress))
        }
        return Promise.all(getEntitlementShims)
    }

    private async getEntitlementDetails(roleId: BigNumberish): Promise<{
        tokens: TokenEntitlementDataTypes.ExternalTokenStruct[]
        users: string[]
    }> {
        let tokens: TokenEntitlementDataTypes.ExternalTokenStruct[] = []
        let users: string[] = []
        // with the shims, get the role details for each entitlement
        const getEntitlements: Promise<
            TokenEntitlementDataTypes.ExternalTokenStruct[] | string[]
        >[] = []
        const entitlementShims = await this.getEntitlementShims()
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

    private async getChannelsWithRole(roleId: BigNumberish): Promise<ChannelMetadata[]> {
        const channelMetadatas = new Map<string, ChannelMetadata>()
        // get all the channels from the space
        const allChannels = await this.channel.read.getChannels()
        // for each channel, check with each entitlement if the role is in the channel
        // add the channel to the list if it is not already added
        for (const c of allChannels) {
            if (!channelMetadatas.has(c.id) && isRoleIdInArray(c.roleIds, roleId)) {
                channelMetadatas.set(c.id, {
                    channelNetworkId: c.id,
                    name: c.metadata,
                    disabled: c.disabled,
                })
            }
        }
        return Array.from(channelMetadatas.values())
    }
}
