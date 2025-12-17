import { BigNumber, BigNumberish, ContractTransaction, ethers, Signer } from 'ethers'
import {
    ChannelDetails,
    ChannelMetadata,
    EntitlementDetails,
    EntitlementModuleType,
    EntitlementShim,
    Permission,
    RoleDetails,
    RoleEntitlements,
    TransactionOpts,
    isRuleEntitlement,
    isRuleEntitlementV2,
    isUserEntitlement,
} from '../types/ContractTypes'
import { IChannelBase, IChannelShim } from './IChannelShim'
import { IRolesBase, IRolesShim } from './IRolesShim'

import { IEntitlementsShim } from './IEntitlementsShim'
import { IMulticallShim } from './IMulticallShim'
import { OwnableFacetShim } from './OwnableFacetShim'
import { TokenPausableFacetShim } from './TokenPausableFacetShim'
import { OverrideExecution, UNKNOWN_ERROR } from '../BaseContractShim'
import { UserEntitlementShim } from './entitlements/UserEntitlementShim'
import { toPermissions, parseChannelMetadataJSON } from '../utils/ut'
import { isRoleIdInArray } from '../utils/ContractHelpers'
import { BaseChainConfig } from '../utils/web3Env'

import { IMembershipShim } from './IMembershipShim'
import { NoopRuleData } from './entitlements/entitlement'
import { RuleEntitlementShim, IRuleEntitlementBase } from './entitlements/RuleEntitlementShim'
import { RuleEntitlementV2Shim, IRuleEntitlementV2Base } from './entitlements/RuleEntitlementV2Shim'
import { IBanningShim } from './IBanningShim'
import { ITippingShim } from './ITippingShim'
import { IERC721AQueryableShim } from '../erc-721/IERC721AQueryableShim'
import { IEntitlementDataQueryableShim } from './IEntitlementDataQueryableShim'
import { IERC721AShim } from '../erc-721/IERC721AShim'
import { IReviewShim } from './IReviewShim'
import { ITreasuryShim } from './ITreasuryShim'
import { dlogger } from '@towns-protocol/utils'
import { IAppAccountShim } from './IAppAccountShim'
const log = dlogger('csb:Space')

interface AddressToEntitlement {
    [address: string]: EntitlementShim
}

export class Space {
    private readonly address: string
    private readonly addressToEntitlement: AddressToEntitlement = {}
    private readonly spaceId: string
    public readonly provider: ethers.providers.Provider
    private readonly channel: IChannelShim
    private readonly entitlements: IEntitlementsShim
    private readonly multicall: IMulticallShim
    private readonly ownable: OwnableFacetShim
    private readonly pausable: TokenPausableFacetShim
    private readonly roles: IRolesShim
    private readonly membership: IMembershipShim
    private readonly banning: IBanningShim
    private readonly erc721AQueryable: IERC721AQueryableShim
    private readonly entitlementDataQueryable: IEntitlementDataQueryableShim
    private readonly erc721A: IERC721AShim
    private readonly tipping: ITippingShim
    private readonly review: IReviewShim
    private readonly treasury: ITreasuryShim
    private readonly appAccount: IAppAccountShim

    constructor(
        address: string,
        spaceId: string,
        config: BaseChainConfig,
        provider: ethers.providers.Provider,
    ) {
        this.address = address
        this.spaceId = spaceId
        this.provider = provider
        //
        // If you add a new contract shim, make sure to add it in getAllShims()
        //
        this.channel = new IChannelShim(address, provider)
        this.entitlements = new IEntitlementsShim(address, provider)
        this.multicall = new IMulticallShim(address, provider)
        this.ownable = new OwnableFacetShim(address, provider)
        this.pausable = new TokenPausableFacetShim(address, provider)
        this.roles = new IRolesShim(address, provider)
        this.membership = new IMembershipShim(address, provider)
        this.banning = new IBanningShim(address, provider)
        this.erc721AQueryable = new IERC721AQueryableShim(address, provider)
        this.entitlementDataQueryable = new IEntitlementDataQueryableShim(address, provider)
        this.erc721A = new IERC721AShim(address, provider)
        this.tipping = new ITippingShim(address, provider)
        this.review = new IReviewShim(address, provider)
        this.treasury = new ITreasuryShim(address, provider)
        this.appAccount = new IAppAccountShim(address, provider)
    }

    private getAllShims() {
        return [
            this.channel,
            this.entitlements,
            this.multicall,
            this.ownable,
            this.pausable,
            this.roles,
            this.membership,
            this.banning,
            this.erc721AQueryable,
            this.entitlementDataQueryable,
            this.erc721A,
            this.tipping,
            this.treasury,
            this.appAccount,
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

    public get ERC721A(): IERC721AShim {
        return this.erc721A
    }

    public get Tipping(): ITippingShim {
        return this.tipping
    }

    public get Review(): IReviewShim {
        return this.review
    }

    public get Treasury(): ITreasuryShim {
        return this.treasury
    }

    public get AppAccount(): IAppAccountShim {
        return this.appAccount
    }

    public async totalTips({ currency }: { currency: string }): Promise<{
        count: bigint
        amount: bigint
    }> {
        const [count, amount] = await Promise.all([
            this.tipping.totalTipsByCurrency(currency),
            this.tipping.tipAmountByCurrency(currency),
        ])
        return {
            count,
            amount,
        }
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
        return allRoleEntitlements.filter((r) => r !== null)
    }

    public async findEntitlementByType(entitlementType: EntitlementModuleType) {
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
            switch (entitlement.moduleType as EntitlementModuleType) {
                case EntitlementModuleType.UserEntitlement:
                    this.addressToEntitlement[address] = new UserEntitlementShim(
                        address,
                        this.provider,
                    )
                    break
                case EntitlementModuleType.RuleEntitlement:
                    this.addressToEntitlement[address] = new RuleEntitlementShim(
                        address,
                        this.provider,
                    )
                    break
                case EntitlementModuleType.RuleEntitlementV2:
                    this.addressToEntitlement[address] = new RuleEntitlementV2Shim(
                        address,
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
        const entitlementInfo = await this.entitlements.getEntitlements()
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
        let ruleData: IRuleEntitlementBase.RuleDataStruct | undefined = undefined
        let ruleDataV2: IRuleEntitlementV2Base.RuleDataV2Struct | undefined = undefined
        let useRuleDataV1 = false

        // with the shims, get the role details for each entitlement
        await Promise.all(
            entitlementShims.map(async (entitlement) => {
                if (isUserEntitlement(entitlement)) {
                    users = (await entitlement.getRoleEntitlement(roleId)) ?? []
                } else if (isRuleEntitlement(entitlement)) {
                    ruleData = (await entitlement.getRoleEntitlement(roleId)) ?? undefined
                    useRuleDataV1 = true
                } else if (isRuleEntitlementV2(entitlement)) {
                    ruleDataV2 = (await entitlement.getRoleEntitlement(roleId)) ?? undefined
                }
            }),
        )
        if (useRuleDataV1) {
            return {
                users,
                ruleData: {
                    kind: 'v1',
                    rules: ruleData ?? NoopRuleData,
                },
            }
        } else {
            return {
                users,
                ruleData: {
                    kind: 'v2',
                    rules: ruleDataV2 ?? NoopRuleData,
                },
            }
        }
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

    public async getTokenIdsOfOwner(wallets: string[]): Promise<string[]> {
        const results = await this.multicall.makeCalls({
            encoder: () =>
                wallets.map((wallet) =>
                    this.erc721AQueryable.encodeFunctionData('tokensOfOwner', [wallet]),
                ),
            decoder: (result) => {
                return this.erc721AQueryable
                    .decodeFunctionResult('tokensOfOwner', result)[0]
                    .map((token) => token.toString())
            },
        })

        const tokenIds = new Set(results.flat())
        return Array.from(tokenIds)
    }

    public async getMembershipStatus(wallets: string[]): Promise<{
        isMember: boolean
        tokenId?: string
        isExpired?: boolean
        expiryTime?: bigint
        expiredAt?: bigint
    }> {
        const tokenIds = await this.getTokenIdsOfOwner(wallets)

        if (tokenIds.length === 0) {
            return {
                isMember: false,
            }
        }

        let expirations: bigint[] = []
        try {
            expirations = await this.multicall.makeCalls({
                encoder: () =>
                    tokenIds.map((id) => this.membership.encodeFunctionData('expiresAt', [id])),
                decoder: (result) => {
                    return this.membership.decodeFunctionResult('expiresAt', result)[0].toBigInt()
                },
            })
        } catch (error) {
            log.error('getMembershipStatus expirations::error', { error })
            throw new Error('Error evaluating membership status', { cause: error })
        }

        const currentTime = BigInt(Math.floor(Date.now() / 1000))

        // Track status values
        let hasActiveToken = false
        let expiryTime: bigint | undefined = undefined
        let expiredAt: bigint | undefined = undefined
        let tokenId: string | undefined = undefined

        // check for permanent tokens
        for (let i = 0; i < expirations.length; i++) {
            if (expirations[i] === 0n) {
                hasActiveToken = true
                expiryTime = 0n
                tokenId = tokenIds[i]
                break
            }
        }

        // if no permanent tokens, check for active tokens
        if (expiryTime !== 0n) {
            for (let i = 0; i < expirations.length; i++) {
                const expiration = expirations[i]

                // check if token is not expired yet
                if (expiration > currentTime) {
                    hasActiveToken = true

                    // track the furthest future expiry
                    if (expiryTime === undefined || expiration > expiryTime) {
                        expiryTime = expiration
                        tokenId = tokenIds[i]
                    }
                } else {
                    // this is an expired token, track the most recent expiry
                    if (expiredAt === undefined || expiration > expiredAt) {
                        expiredAt = expiration

                        // only use this token if we don't have any active ones
                        if (!hasActiveToken) {
                            tokenId = tokenIds[i]
                        }
                    }
                }
            }
        }

        return {
            isMember: true,
            isExpired: !hasActiveToken,
            expiredAt,
            expiryTime,
            tokenId,
        }
    }

    public async getMembershipRenewalPrice(tokenId: string): Promise<bigint> {
        return this.membership.getMembershipRenewalPrice(tokenId)
    }

    public async renewMembership<T = ContractTransaction>(args: {
        tokenId: string
        signer: Signer
        overrideExecution?: OverrideExecution<T>
        transactionOpts?: TransactionOpts
    }) {
        return this.membership.renewMembership<T>({
            tokenId: args.tokenId,
            signer: args.signer,
            overrideExecution: args.overrideExecution,
            transactionOpts: args.transactionOpts,
        })
    }

    public async getProtocolFee(): Promise<bigint> {
        return (await this.membership.read.getProtocolFee()).toBigInt()
    }

    /**
     * This function is potentially expensive and should be used with caution.
     * For example, a space with 1000 members will make 1000 + 1 calls to the blockchain.
     * @param untilTokenId - The token id to stop at, if not provided, will get all members
     * @returns An array of member addresses
     */
    public async __expensivelyGetMembers(untilTokenId?: BigNumberish): Promise<string[]> {
        if (untilTokenId === undefined) {
            untilTokenId = await this.erc721A.read.totalSupply()
        }

        untilTokenId = Number(untilTokenId)

        const tokenIds = Array.from({ length: untilTokenId }, (_, i) => i)
        const promises = tokenIds.map((tokenId) => this.erc721A.read.ownerOf(tokenId))
        return Promise.all(promises)
    }
}
