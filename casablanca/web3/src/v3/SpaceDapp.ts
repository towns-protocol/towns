import {
    BasicRoleInfo,
    ChannelDetails,
    ChannelMetadata,
    EntitlementModuleType,
    Permission,
    RoleDetails,
} from '../ContractTypes'
import { BytesLike, ContractTransaction, ethers } from 'ethers'
import { CreateSpaceParams, ISpaceDapp, UpdateChannelParams, UpdateRoleParams } from '../ISpaceDapp'
import {
    createTokenEntitlementStruct,
    createUserEntitlementStruct,
} from '../ConvertersEntitlements'

import { IRolesBase } from './IRolesShim'
import { ITownArchitectBase } from './ITownArchitectShim'
import { Town } from './Town'
import { TownRegistrar } from './TownRegistrar'
import { createEntitlementStruct } from '../ConvertersRoles'
import { getContractsInfo } from '../IStaticContractsInfo'
import { TokenEntitlementDataTypes } from './TokenEntitlementShim'
import { WalletLink } from './WalletLink'
import { PaymasterConfig, UserOpParams, SpaceDappConfig, SpaceInfo } from '../SpaceDappTypes'
import { Client, ISendUserOperationResponse, Presets } from 'userop'

export class SpaceDapp implements ISpaceDapp {
    public readonly chainId: number
    public readonly provider: ethers.providers.Provider | undefined
    protected readonly townRegistrar: TownRegistrar
    public readonly walletLink: WalletLink

    // userop related
    public readonly bundlerUrl: string
    public readonly aaRpcUrl: string
    public readonly paymasterProxyUrl: string | undefined
    public readonly entryPointAddress: string | undefined
    public readonly factoryAddress: string | undefined
    public paymasterMiddleware: SpaceDappConfig['paymasterMiddleware']
    public userOpClient: Client | undefined

    constructor(config: SpaceDappConfig) {
        const {
            chainId,
            provider,
            aaRpcUrl,
            bundlerUrl,
            paymasterProxyUrl,
            entryPointAddress,
            factoryAddress,
            paymasterMiddleware,
        } = config
        this.chainId = chainId
        this.provider = provider
        const contractsInfo = getContractsInfo(chainId)
        this.townRegistrar = new TownRegistrar(contractsInfo, chainId, provider)
        this.walletLink = new WalletLink(contractsInfo, chainId, provider)

        this.aaRpcUrl = aaRpcUrl
        this.bundlerUrl = bundlerUrl ?? aaRpcUrl
        this.paymasterProxyUrl = paymasterProxyUrl
        this.entryPointAddress = entryPointAddress
        this.factoryAddress = factoryAddress
        this.paymasterMiddleware = paymasterMiddleware
    }

    public async addRoleToChannel(
        spaceId: string,
        channelNetworkId: string,
        roleId: number,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Channels.write(signer).addRoleToChannel(channelNetworkId, roleId)
    }

    public async createSpace(
        params: CreateSpaceParams,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const townInfo: ITownArchitectBase.TownInfoStruct = {
            id: params.spaceId,
            name: params.spaceName,
            uri: params.spaceMetadata,
            membership: params.membership,
            channel: {
                id: params.channelId,
                metadata: params.channelName || '',
            },
        }
        return this.townRegistrar.TownArchitect.write(signer).createTown(townInfo)
    }

    public async createChannel(
        spaceId: string,
        channelName: string,
        channelNetworkId: string,
        roleIds: number[],
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Channels.write(signer).createChannel(channelNetworkId, channelName, roleIds)
    }

    public async createRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        tokens: TokenEntitlementDataTypes.ExternalTokenStruct[],
        users: string[],
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const entitlements = await createEntitlementStruct(town, tokens, users)
        return town.Roles.write(signer).createRole(roleName, permissions, entitlements)
    }

    public async deleteRole(
        spaceId: string,
        roleId: number,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Roles.write(signer).removeRole(roleId)
    }

    public async getChannels(spaceId: string): Promise<ChannelMetadata[]> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.getChannels()
    }

    public async getChannelDetails(
        spaceId: string,
        channelId: string,
    ): Promise<ChannelDetails | null> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.getChannel(channelId)
    }

    public async getPermissionsByRoleId(spaceId: string, roleId: number): Promise<Permission[]> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.getPermissionsByRoleId(roleId)
    }

    public async getRole(spaceId: string, roleId: number): Promise<RoleDetails | null> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.getRole(roleId)
    }

    public async getRoles(spaceId: string): Promise<BasicRoleInfo[]> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const roles: IRolesBase.RoleStructOutput[] = await town.Roles.read.getRoles()
        return roles.map((role) => ({
            roleId: role.id.toNumber(),
            name: role.name,
        }))
    }

    public async getSpaceInfo(spaceId: string): Promise<SpaceInfo | undefined> {
        const town = await this.getTown(spaceId)
        if (!town) {
            return undefined
        }
        const [owner, disabled, townInfo] = await Promise.all([
            town.Ownable.read.owner(),
            town.Pausable.read.paused(),
            town.getTownInfo(),
        ])
        return {
            address: town.Address,
            networkId: town.SpaceId,
            name: (townInfo.name as string) ?? '',
            owner,
            disabled,
        }
    }

    public async updateSpaceName(
        spaceId: string,
        name: string,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const townInfo = await town.getTownInfo()
        // update the town name
        return town.TownOwner.write(signer).updateTownInfo(town.Address, name, townInfo.uri)
    }

    public async isEntitledToSpace(
        spaceId: string,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        const town = await this.getTown(spaceId)
        if (!town) {
            return false
        }
        return town.Entitlements.read.isEntitledToTown(user, permission)
    }

    public async isEntitledToChannel(
        spaceId: string,
        channelId: string,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        const town = await this.getTown(spaceId)
        if (!town) {
            return false
        }
        return town.Entitlements.read.isEntitledToChannel(channelId, user, permission)
    }

    public parseSpaceFactoryError(error: unknown): Error {
        if (!this.townRegistrar.TownArchitect) {
            throw new Error('TownArchitect is not deployed properly.')
        }
        const decodedErr = this.townRegistrar.TownArchitect.parseError(error)
        console.error(decodedErr)
        return decodedErr
    }

    public async parseSpaceError(spaceId: string, error: unknown): Promise<Error> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const decodedErr = town.parseError(error)
        console.error(decodedErr)
        return decodedErr
    }

    public async updateChannel(
        params: UpdateChannelParams,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(params.spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${params.spaceId}" is not found.`)
        }
        // data for the multicall
        const encodedCallData: BytesLike[] = []
        // update the channel metadata
        encodedCallData.push(
            town.Channels.interface.encodeFunctionData('updateChannel', [
                params.channelId,
                params.channelName,
                params.disabled ?? false, // default to false
            ]),
        )
        // update any channel role changes
        const encodedUpdateChannelRoles = await this.encodeUpdateChannelRoles(
            town,
            params.channelId,
            params.roleIds,
        )
        for (const callData of encodedUpdateChannelRoles) {
            encodedCallData.push(callData)
        }
        return town.Multicall.write(signer).multicall(encodedCallData)
    }

    public async updateRole(
        params: UpdateRoleParams,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(params.spaceNetworkId)
        if (!town) {
            throw new Error(`Town with spaceId "${params.spaceNetworkId}" is not found.`)
        }
        const updatedEntitlemets = await this.createUpdatedEntitlements(town, params)
        return town.Roles.write(signer).updateRole(
            params.roleId,
            params.roleName,
            params.permissions,
            updatedEntitlemets,
        )
    }

    public async setSpaceAccess(
        spaceId: string,
        disabled: boolean,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        if (disabled) {
            return town.Pausable.write(signer).pause()
        } else {
            return town.Pausable.write(signer).unpause()
        }
    }

    public async setChannelAccess(
        spaceId: string,
        channelId: string,
        disabled: boolean,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Channels.write(signer).updateChannel(channelId, '', disabled)
    }

    public async getTownMembershipTokenAddress(spaceId: string): Promise<string> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Membership.address
    }

    public async joinTown(
        spaceId: string,
        recipient: string,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Membership.write(signer).joinTown(recipient)
    }

    public async hasTownMembership(spaceId: string, address: string): Promise<boolean> {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town.Membership.hasMembership(address)
    }

    public async getMembershipSupply(spaceId: string) {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const totalSupply = await town.Membership.read.totalSupply()

        return { totalSupply: totalSupply.toNumber() }
    }

    public async getMembershipInfo(spaceId: string) {
        const town = await this.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        const [price, limit, currency, feeRecipient] = await Promise.all([
            town.Membership.read.getMembershipPrice(),
            town.Membership.read.getMembershipLimit(),
            town.Membership.read.getMembershipCurrency(),
            town.Membership.read.getMembershipFeeRecipient(),
        ])

        return {
            price: price.toNumber(),
            maxSupply: limit.toNumber(),
            currency: currency,
            feeRecipient: feeRecipient,
        }
    }

    public getWalletLink(): WalletLink {
        return this.walletLink
    }

    public async getAbstractAccountAddress(args: UserOpParams) {
        return (await this.initBuilder(args)).getSender()
    }

    public getTown(townId: string): Promise<Town | undefined> {
        return this.townRegistrar.getTown(townId)
    }

    public async sendUserOp(
        args: UserOpParams & {
            // a function signature hash to pass to paymaster proxy - this is just the function name for now
            functionHashForPaymasterProxy: string
            townId: string
        },
    ): Promise<ISendUserOperationResponse> {
        const { toAddress, callData, value } = args

        const builder = await this.initBuilder(args)

        if (!toAddress) {
            throw new Error('toAddress is required')
        }
        if (!callData) {
            throw new Error('callData is required')
        }
        // local bundler and no paymaster needs to estimate gas
        // MAYBE WE DON'T NEED THIS WITH SKANDHA BUNDLER
        // if (this.chainId === 31337) {
        //     const { preVerificationGas, callGasLimit, verificationGasLimit } =
        //         await estimateGasForLocalBundler({
        //             target: toAddress,
        //             provider: new ethers.providers.JsonRpcProvider(this.rpcUrl),
        //             entryPointAddress: this.entryPointAddress ?? '',
        //             sender: builder.getSender(),
        //             callData,
        //             factoryAddress: this.factoryAddress ?? '',
        //             signer,
        //         })

        //     builder.setPreVerificationGas(preVerificationGas)
        //     builder.setCallGasLimit(callGasLimit)
        //     builder.setVerificationGasLimit(verificationGasLimit)
        // }

        const userOp = builder.execute(toAddress, value ?? 0, callData)
        const userOpClient = await this.getUserOpClient()
        return userOpClient.sendUserOperation(userOp, {
            onBuild: (op) => console.log('Signed UserOperation:', op),
        })
    }

    public async getUserOpClient() {
        if (!this.userOpClient) {
            this.userOpClient = await Client.init(this.aaRpcUrl, {
                entryPoint: this.entryPointAddress,
                overrideBundlerRpc: this.bundlerUrl,
            })
        }
        return this.userOpClient
    }

    public async sendCreateSpaceOp(
        args: Parameters<SpaceDapp['createSpace']>,
        paymasterConfig?: PaymasterConfig,
    ): Promise<ISendUserOperationResponse> {
        const [createSpaceParams, signer] = args
        const townInfo: ITownArchitectBase.TownInfoStruct = {
            id: createSpaceParams.spaceId,
            name: createSpaceParams.spaceName,
            uri: createSpaceParams.spaceMetadata,
            membership: createSpaceParams.membership,
            channel: {
                id: createSpaceParams.channelId,
                metadata: createSpaceParams.channelName || '',
            },
        }

        const functionName = 'createTown'

        const functionHashForPaymasterProxy = this.getFunctionSigHash(
            this.townRegistrar.TownArchitect.interface,
            functionName,
        )

        const callData = this.townRegistrar.TownArchitect.interface.encodeFunctionData(
            functionName,
            [townInfo],
        )

        // TODO: determine if this simulation causes an additional signature in UX
        // try {
        //     await this.townRegistrar.TownArchitect.write(signer).callStatic.createTown(townInfo)
        // } catch (error) {
        //     throw this.parseSpaceError(createSpaceParams.spaceId, error)
        // }
        return this.sendUserOp({
            toAddress: this.townRegistrar.TownArchitect.address,
            callData,
            signer,
            paymasterConfig,
            townId: townInfo.id as string,
            functionHashForPaymasterProxy,
        })
    }

    public async sendJoinTownOp(
        args: Parameters<SpaceDapp['joinTown']>,
        paymasterConfig?: PaymasterConfig,
    ): Promise<ISendUserOperationResponse> {
        const [spaceId, recipient, signer] = args
        const town = await this.getTown(spaceId)
        const functionName = 'joinTown'

        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }

        const functionHashForPaymasterProxy = this.getFunctionSigHash(
            town.Membership.interface,
            functionName,
        )

        const callData = town.Membership.interface.encodeFunctionData(functionName, [recipient])

        // try {
        //     // simulate the tx - throws an error second time you run it!
        //     await town.Membership.write(signer).callStatic.joinTown(recipient)
        // } catch (error) {
        //     throw this.parseSpaceError(spaceId, error)
        // }
        return this.sendUserOp({
            toAddress: town.Address,
            callData,
            signer,
            paymasterConfig,
            townId: (await town.getTownInfo()).networkId as string,
            functionHashForPaymasterProxy,
        })
    }

    /**
     * should return a matching functionHash as the paymaster proxy validation
     * TODO: convert to same hash as paymaster proxy validation, for now it's just function name
     */
    private getFunctionSigHash<ContractInterface extends ethers.utils.Interface>(
        _contractInterface: ContractInterface,
        functionName: string,
    ) {
        return functionName
        // TODO: swap to this
        // const frag = contractInterface.getFunction(functionName)
        // return frag.format() // format sigHash
    }

    // Initialize a builder with middleware based on paymaster config
    //
    // Because we are still determining exactly how we are using paymaster,
    // and userop.js doesn't allow for add/remove a specific middleware from the middleware stack,
    // each user operation can just initiliaze a new builder to make things simpler
    private async initBuilder(
        args: UserOpParams & {
            // a function signature hash to pass to paymaster proxy - this is just the function name for now
            functionHashForPaymasterProxy?: string
            townId?: string
        },
    ) {
        const { signer } = args

        return Presets.Builder.SimpleAccount.init(signer, this.aaRpcUrl, {
            entryPoint: this.entryPointAddress,
            factory: this.factoryAddress,
            overrideBundlerRpc: this.bundlerUrl,
            // salt?: BigNumberish;
            // nonceKey?: number;
            paymasterMiddleware: async (ctx) =>
                this.paymasterMiddleware?.({
                    userOpContext: ctx,
                    bundlerUrl: this.bundlerUrl,
                    provider: this.provider,
                    aaRpcUrl: this.aaRpcUrl,
                    paymasterProxyUrl: this.paymasterProxyUrl,
                    functionHashForPaymasterProxy: args.functionHashForPaymasterProxy,
                    townId: args.townId,
                }),
        })
    }

    private async encodeUpdateChannelRoles(
        town: Town,
        channelId: string,
        _updatedRoleIds: number[],
    ): Promise<BytesLike[]> {
        const encodedCallData: BytesLike[] = []
        const [channelInfo] = await Promise.all([
            town.Channels.read.getChannel(channelId),
            town.getEntitlementShims(),
        ])
        const currentRoleIds = new Set<number>(channelInfo.roleIds.map((r) => r.toNumber()))
        const updatedRoleIds = new Set<number>(_updatedRoleIds)
        const rolesToRemove: number[] = []
        const rolesToAdd: number[] = []
        for (const r of updatedRoleIds) {
            // if the current role IDs does not have the updated role ID, then that role should be added.
            if (!currentRoleIds.has(r)) {
                rolesToAdd.push(r)
            }
        }
        for (const r of currentRoleIds) {
            // if the updated role IDs no longer have the current role ID, then that role should be removed.
            if (!updatedRoleIds.has(r)) {
                rolesToRemove.push(r)
            }
        }
        // encode the call data for each role to remove
        const encodedRemoveRoles = this.encodeRemoveRolesFromChannel(town, channelId, rolesToRemove)
        for (const callData of encodedRemoveRoles) {
            encodedCallData.push(callData)
        }
        // encode the call data for each role to add
        const encodedAddRoles = this.encodeAddRolesToChannel(town, channelId, rolesToAdd)
        for (const callData of encodedAddRoles) {
            encodedCallData.push(callData)
        }
        return encodedCallData
    }

    private encodeAddRolesToChannel(town: Town, channelId: string, roleIds: number[]): BytesLike[] {
        const encodedCallData: BytesLike[] = []
        for (const roleId of roleIds) {
            const encodedBytes = town.Channels.interface.encodeFunctionData('addRoleToChannel', [
                channelId,
                roleId,
            ])
            encodedCallData.push(encodedBytes)
        }
        return encodedCallData
    }

    private encodeRemoveRolesFromChannel(
        town: Town,
        channelId: string,
        roleIds: number[],
    ): BytesLike[] {
        const encodedCallData: BytesLike[] = []
        for (const roleId of roleIds) {
            const encodedBytes = town.Channels.interface.encodeFunctionData(
                'removeRoleFromChannel',
                [channelId, roleId],
            )
            encodedCallData.push(encodedBytes)
        }
        return encodedCallData
    }

    private async createUpdatedEntitlements(
        town: Town,
        params: UpdateRoleParams,
    ): Promise<IRolesBase.CreateEntitlementStruct[]> {
        const updatedEntitlements: IRolesBase.CreateEntitlementStruct[] = []
        const [tokenEntitlement, userEntitlement] = await Promise.all([
            town.findEntitlementByType(EntitlementModuleType.TokenEntitlement),
            town.findEntitlementByType(EntitlementModuleType.UserEntitlement),
        ])
        if (params.tokens.length > 0 && tokenEntitlement?.address) {
            const entitlementData = createTokenEntitlementStruct(
                tokenEntitlement.address,
                params.tokens,
            )
            updatedEntitlements.push(entitlementData)
        }
        if (params.users.length > 0 && userEntitlement?.address) {
            const entitlementData = createUserEntitlementStruct(
                userEntitlement.address,
                params.users,
            )
            updatedEntitlements.push(entitlementData)
        }
        return updatedEntitlements
    }
}
