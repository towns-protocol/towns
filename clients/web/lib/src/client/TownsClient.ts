import { Empty } from '@bufbuild/protobuf'
import { BigNumber, ContractReceipt, ContractTransaction, ethers } from 'ethers'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { RoomMessageEvent, transformAttachments } from '../types/timeline-types'
import {
    Client as CasablancaClient,
    RiverDbManager,
    StreamRpcClient,
    UnauthenticatedClient,
    isGDMChannelStreamId,
    makeStreamRpcClient,
    userIdFromAddress,
    makeRiverRpcClient,
    isChannelStreamId,
    isDMChannelStreamId,
} from '@river/sdk'
import { EntitlementsDelegate, DecryptionStatus } from '@river-build/encryption'
import { CreateSpaceParams, IRuleEntitlement, UpdateChannelParams } from '@river-build/web3'
import { ChannelMessage_Post_Mention, FullyReadMarker } from '@river-build/proto'
import {
    ChannelTransactionContext,
    ChannelUpdateTransactionContext,
    CreateSpaceTransactionContext,
    ITownsServerVersions,
    RoleTransactionContext,
    TransactionContext,
    TransactionStatus,
    WalletLinkTransactionContext,
    TownsClientEventHandlers,
    TownsOpts,
    createTransactionContext,
    logTxnResult,
    BanUnbanWalletTransactionContext,
} from './TownsClientTypes'
import {
    CreateChannelInfo,
    CreateSpaceInfo,
    Membership,
    MessageType,
    RoomMember,
    SendMessageOptions,
    SendTextMessageOptions,
    StreamView,
    UpdateChannelInfo,
    toMembership,
} from '../types/towns-types'
import { SignerContext } from '@river/sdk'
import { PushNotificationClient } from './PushNotificationClient'
import { MembershipRejectedError, SignerUndefinedError } from '../types/error-types'
import { makeUniqueChannelStreamId } from '@river/sdk'
import { makeSpaceStreamId, makeDefaultChannelStreamId } from '@river/sdk'
import { staticAssertNever } from '../utils/towns-utils'
import { toUtf8String } from 'ethers/lib/utils.js'
import { toStreamView } from './casablanca/CasablancaUtils'
import {
    RoleIdentifier,
    BlockchainTransactionType,
    ReceiptType,
    TransactionOrUserOperation,
    Address,
} from '../types/web3-types'
import {
    createSpaceDapp,
    IArchitectBase,
    Permission,
    SpaceInfo,
    ISpaceDapp,
} from '@river-build/web3'
import { BlockchainTransactionStore } from './BlockchainTransactionStore'
import { UserOps, getTransactionHashOrUserOpHash, isUserOpResponse } from '@towns/userops'
import AnalyticsService, { AnalyticsEvents } from '../utils/analyticsService'

/***
 * Towns Client
 * for calls that originate from a roomIdentifier, or for createing new rooms
 * the Towns client will:
 * - always encrypt
 * - enforce space / channel relationships
 * - get user wallet info
 * - go to the blockchain when creating a space
 * - go to the blockchain when updating channel settings, etc
 * - etc
 */

export type TownsClientEvents = {
    onCasablancaClientCreated: (client: CasablancaClient) => void
}

export class TownsClient
    extends (EventEmitter as new () => TypedEmitter<TownsClientEvents>)
    implements EntitlementsDelegate
{
    public readonly opts: TownsOpts
    public readonly name: string
    public spaceDapp: ISpaceDapp
    public blockchainTransactionStore: BlockchainTransactionStore
    protected casablancaClient?: CasablancaClient
    private _signerContext?: SignerContext
    protected _eventHandlers?: TownsClientEventHandlers
    private pushNotificationClient?: PushNotificationClient
    private userOps: UserOps | undefined = undefined

    constructor(opts: TownsOpts, name?: string) {
        super()
        this.opts = opts
        this.name = name || Math.random().toString(36).substring(7)
        console.log('~~~ new TownsClient ~~~', this.name, this.opts)
        AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.ClientWrapperCreated)
        this.spaceDapp = createSpaceDapp(opts.baseProvider, opts.baseConfig)

        if (opts.accountAbstractionConfig?.aaRpcUrl) {
            this.userOps = new UserOps({
                ...opts.accountAbstractionConfig,
                provider: opts.baseProvider,
                config: opts.baseConfig,
                spaceDapp: this.spaceDapp,
            })
        }
        this.blockchainTransactionStore = new BlockchainTransactionStore(this.spaceDapp)
        this._eventHandlers = opts.eventHandlers
        if (opts.pushNotificationWorkerUrl && opts.pushNotificationAuthToken) {
            this.pushNotificationClient = new PushNotificationClient({
                url: opts.pushNotificationWorkerUrl,
                authToken: opts.pushNotificationAuthToken,
            })
        }
    }

    public get signerContext(): SignerContext | undefined {
        return this._signerContext
    }

    public isAccountAbstractionEnabled() {
        return !!this.opts.accountAbstractionConfig?.aaRpcUrl
    }

    public getAbstractAccountAddress({ rootKeyAddress }: { rootKeyAddress: Address }) {
        try {
            return this.userOps?.getAbstractAccountAddress({ rootKeyAddress })
        } catch (error) {
            this.log('[getAbstractAccountAddress]', error)
        }
    }

    /************************************************
     * getServerVersions
     *************************************************/
    // eslint-disable-next-line @typescript-eslint/require-await
    public async getServerVersions() {
        // TODO casablanca, return server versions
        return {
            versions: [],
            unstable_features: {},
            release_version: '0.0.0',
        } satisfies ITownsServerVersions
    }

    /************************************************
     * logout
     *************************************************/
    public async logout(): Promise<void> {
        this.log('logout')
        await this.logoutFromCasablanca()
    }

    /************************************************
     * logoutFromCasablanca
     *************************************************/
    public async logoutFromCasablanca(): Promise<void> {
        if (!this._signerContext) {
            return
        }
        this.log('logoutFromCasablanca')
        await this.stopCasablancaClient()

        this._eventHandlers?.onLogout?.({
            userId: this._signerContext?.creatorAddress.toString() ?? 'unset',
        })

        this._signerContext = undefined
    }

    public async makeUnauthenticatedClient(): Promise<UnauthenticatedClient> {
        if (!this.opts.riverProvider) {
            throw new Error('riverChainProvider is required')
        }
        const rpcClient = await makeRiverRpcClient(this.opts.riverProvider, this.opts.riverConfig)
        return new UnauthenticatedClient(rpcClient)
    }

    /************************************************
     * startCasablancaClient
     *************************************************/
    public async startCasablancaClient(context: SignerContext): Promise<CasablancaClient> {
        this.log('startCasablancaClient', context)
        if (this.casablancaClient) {
            throw new Error('already started casablancaClient')
        }
        if (!this.opts.riverProvider) {
            throw new Error('riverChainProvider is required')
        }
        this._signerContext = context
        let rpcClient: StreamRpcClient

        // to force a specific rpc url, open the console and type `localStorage.RIVER_RPC_URL = 'https://river1.nodes.gamma.towns.com'`
        if (localStorage.getItem('RIVER_RPC_URL')) {
            rpcClient = makeStreamRpcClient(localStorage.getItem('RIVER_RPC_URL') as string)
        } else {
            rpcClient = await makeRiverRpcClient(this.opts.riverProvider, this.opts.riverConfig)
        }

        const userId = userIdFromAddress(context.creatorAddress)
        const envSuffix = this.opts.environmentId === 'gamma' ? '' : `-${this.opts.environmentId}`
        const cryptoDbName = `database-${userId}${envSuffix}`
        const persistenceDbName = `persistence-${userId}${envSuffix}`
        const cryptoStore = RiverDbManager.getCryptoDb(userId, cryptoDbName)
        this.casablancaClient = new CasablancaClient(
            context,
            rpcClient,
            cryptoStore,
            this,
            persistenceDbName,
            this.opts.logNamespaceFilter,
            this.opts.highPriorityStreamIds,
        )
        this.casablancaClient.setMaxListeners(100)

        await this.casablancaClient.initializeUser()

        this._eventHandlers?.onRegister?.({
            userId: this.casablancaClient.userId,
        })

        this.casablancaClient.on('decryptionExtStatusChanged', (status: DecryptionStatus) => {
            AnalyticsService.getInstance().trackEventOnce(`decryptionExtStatus[${status}]`)
        })

        this.casablancaClient.startSync()
        this.emit('onCasablancaClientCreated', this.casablancaClient)
        return this.casablancaClient
    }

    /************************************************
     * stopCasablancaClient
     *************************************************/
    public async stopCasablancaClient() {
        if (this.casablancaClient) {
            this.log('Stopped casablanca client')
            await this.casablancaClient.stop()
            this.casablancaClient = undefined
        }
    }

    /************************************************
     * stopClients
     *************************************************/
    public async stopClients() {
        this.userOps?.clearStore()
        await this.blockchainTransactionStore.stop()
        await this.stopCasablancaClient()
    }

    public async createSpaceTransaction(
        createSpaceInfo: CreateSpaceInfo,
        membership: IArchitectBase.MembershipStruct,
        signer: ethers.Signer | undefined,
    ): Promise<CreateSpaceTransactionContext> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        return this.createCasablancaSpaceTransaction(createSpaceInfo, membership, signer)
    }

    public async waitForCreateSpaceTransaction(
        context: CreateSpaceTransactionContext | undefined,
        signerContext: SignerContext | undefined,
        defaultUsernames: string[] = [],
    ): Promise<CreateSpaceTransactionContext> {
        const txContext = await this._waitForBlockchainTransaction(context)
        if (txContext.status === TransactionStatus.Success) {
            this.log('[waitForCreateSpaceTransaction] space created on chain', txContext.data)
            if (txContext.data) {
                const spaceAddress = this.spaceDapp.getSpaceAddress(txContext.receipt)
                if (!spaceAddress) {
                    throw new Error('Space address not found')
                }
                const spaceId = makeSpaceStreamId(spaceAddress)
                const channelId = makeDefaultChannelStreamId(spaceAddress)
                txContext.data.spaceId = spaceId
                txContext.data.channelId = channelId
                // wait until the space and channel are minted on-chain
                // before creating the streams
                if (!this.casablancaClient && signerContext) {
                    await this.startCasablancaClient(signerContext)
                }
                if (!this.casablancaClient) {
                    throw new Error('casablancaClient not started')
                }
                const result = await this.casablancaClient.createSpace(spaceId)
                await this.casablancaClient.waitForStream(spaceId)
                this.log('[waitForCreateSpaceTransaction] Space stream created', {
                    result: result,
                    spaceId,
                })

                if (defaultUsernames.length > 0) {
                    // new space, no member, we can just set first username as default
                    await this.casablancaClient.setUsername(spaceId, defaultUsernames[0])
                    this.log('[waitForCreateSpaceTransaction] Set default username', {
                        defaultUsername: defaultUsernames[0],
                        spaceId,
                    })
                }

                await this.createSpaceDefaultChannelRoom(spaceId, 'general', channelId)
                this.log(
                    '[waitForCreateSpaceTransaction] default channel stream created',
                    channelId,
                )
                // emiting the event here, because the web app calls different
                // functions to create a space, and this is the only place
                // that all different functions go through
                this._eventHandlers?.onCreateSpace?.(spaceId)
            }
        }

        if (txContext.error) {
            txContext.error = this.getDecodedErrorForSpaceFactory(txContext.error)
        }

        logTxnResult('waitForCreateSpaceTransaction', txContext)

        return txContext
    }

    private async createCasablancaSpaceTransaction(
        createSpaceInfo: CreateSpaceInfo,
        membership: IArchitectBase.MembershipStruct,
        signer: ethers.Signer,
    ): Promise<CreateSpaceTransactionContext> {
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.CreateSpace,
            data: {},
        })

        const args: CreateSpaceParams = {
            spaceName: createSpaceInfo.name,
            spaceMetadata: createSpaceInfo.name,
            channelName: createSpaceInfo.defaultChannelName ?? 'general', // default channel name
            membership,
        }

        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendCreateSpaceOp([args, signer])
            } else {
                transaction = await this.spaceDapp.createSpace(args, signer)
            }

            this.log(`[createCasablancaSpaceTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            console.error('[createCasablancaSpaceTransaction] error', err)
            error = this.getDecodedErrorForSpaceFactory(err)
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: transaction
                ? {
                      spaceName: createSpaceInfo.name,
                  }
                : undefined,
            error,
        }
    }

    /************************************************
     * createChannelRoom
     *************************************************/
    private async createChannelRoom(
        createInfo: CreateChannelInfo,
        networkId?: string,
    ): Promise<string> {
        if (!this.casablancaClient) {
            throw new Error("createChannel: Casablanca client doesn't exist")
        }
        if (networkId === undefined) {
            throw new Error('createChannel: networkId is undefined')
        }

        const { streamId } = await this.casablancaClient.createChannel(
            createInfo.parentSpaceId,
            createInfo.name,
            createInfo.topic ? createInfo.topic : '',
            networkId,
            createInfo.streamSettings,
        )
        await this.casablancaClient.waitForStream(streamId)
        return streamId
    }

    private async createSpaceDefaultChannelRoom(
        parentSpaceId: string,
        channelName?: string,
        channelId?: string,
    ): Promise<string> {
        const channelInfo: CreateChannelInfo = {
            name: channelName ?? 'general',
            parentSpaceId,
            roleIds: [],
        }
        return await this.createChannelRoom(channelInfo, channelId)
    }

    /************************************************
     * createChannel
     *************************************************/
    public async createChannel(
        createChannelInfo: CreateChannelInfo,
        signer: ethers.Signer | undefined,
    ): Promise<string> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        this.log('[createChannel] creating channel', createChannelInfo)
        const txContext = await this.createChannelTransaction(createChannelInfo, signer)
        if (txContext.error) {
            throw txContext.error
        }
        if (txContext.status === TransactionStatus.Pending) {
            const rxContext = await this.waitForCreateChannelTransaction(
                createChannelInfo,
                txContext,
            )
            if (!rxContext) {
                throw new Error('no rxContext returned')
            }
            if (!rxContext.data) {
                throw new Error('no room identifier returned')
            }
            return rxContext.data
        }
        // Something went wrong. Don't return a room identifier.
        throw new Error('Failed to create channel')
    }

    public async createChannelTransaction(
        createChannelInfo: CreateChannelInfo,
        signer: ethers.Signer | undefined,
    ): Promise<ChannelTransactionContext> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        const roomId: string = makeUniqueChannelStreamId(createChannelInfo.parentSpaceId)

        this.log('[createChannelTransaction] Channel created', roomId)

        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined

        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.CreateChannel,
            data: {
                spaceStreamId: createChannelInfo.parentSpaceId,
                channeStreamId: roomId,
            },
        })

        const args = [
            createChannelInfo.parentSpaceId,
            createChannelInfo.name,
            roomId,
            createChannelInfo.roleIds,
            signer,
        ] as const

        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendCreateChannelOp([...args])
            } else {
                transaction = await this.spaceDapp.createChannel(...args)
            }
            this.log(`[createChannelTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            console.error('[createChannelTransaction] error', err)
            error = await this.getDecodedErrorForSpace(createChannelInfo.parentSpaceId, err)
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: transaction ? roomId : undefined,
            error,
        }
    }

    public async waitForCreateChannelTransaction(
        createChannelInfo: CreateChannelInfo,
        context: ChannelTransactionContext | undefined,
    ): Promise<ChannelTransactionContext> {
        const txnContext = await this._waitForBlockchainTransaction(context)

        if (txnContext.status === TransactionStatus.Success) {
            if (txnContext?.data) {
                const roomId = txnContext.data
                // wait until the channel is minted on-chain
                // before creating the stream
                await this.createChannelRoom(createChannelInfo, roomId)
                this.log('[waitForCreateChannelTransaction] Channel stream created', roomId)
            }
        }

        if (txnContext.error) {
            txnContext.error = await this.getDecodedErrorForSpace(
                createChannelInfo.parentSpaceId,
                txnContext.error,
            )
        }

        logTxnResult('waitForCreateChannelTransaction', txnContext)
        return txnContext
    }

    public async updateChannelTransaction(
        updateChannelInfo: UpdateChannelInfo,
        signer: ethers.Signer | undefined,
    ): Promise<ChannelUpdateTransactionContext> {
        if (!signer) {
            const _error = new Error('signer is undefined')
            console.error('[updateChannelTransaction]', _error)
            return createTransactionContext({
                status: TransactionStatus.Failed,
                error: _error,
            })
        }

        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined

        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.EditChannel,
            data: {
                spaceStreamId: updateChannelInfo.parentSpaceId,
                channeStreamId: updateChannelInfo.channelId,
            },
        })

        try {
            if (updateChannelInfo.updatedChannelName && updateChannelInfo.updatedRoleIds) {
                const newChannelInfo = {
                    spaceId: updateChannelInfo.parentSpaceId,
                    channelId: updateChannelInfo.channelId,
                    channelName: updateChannelInfo.updatedChannelName,
                    channelDescription: updateChannelInfo.updatedChannelTopic ?? '',
                    roleIds: updateChannelInfo.updatedRoleIds,
                } satisfies UpdateChannelParams

                if (this.isAccountAbstractionEnabled()) {
                    transaction = await this.userOps?.sendUpdateChannelOp([newChannelInfo, signer])
                } else {
                    transaction = await this.spaceDapp.updateChannel(newChannelInfo, signer)
                }

                this.log(`[updateChannelTransaction] transaction created` /*, transaction*/)
            } else {
                // this is an off chain state update
            }
        } catch (err) {
            console.error('[updateChannelTransaction]', err)
            error = await this.spaceDapp.parseSpaceError(updateChannelInfo.parentSpaceId, err)
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return createTransactionContext({
            transaction,
            status: !error && transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: updateChannelInfo,
            error,
        })
    }

    public async waitForUpdateChannelTransaction(
        context: ChannelUpdateTransactionContext | undefined,
    ): Promise<ChannelUpdateTransactionContext> {
        const txContext = await this._waitForBlockchainTransaction(context)

        if (txContext.status === TransactionStatus.Success && txContext.data) {
            await this.updateChannelRoom(txContext.data)
        }

        logTxnResult('waitForUpdateChannelTransaction', txContext)
        return txContext
    }

    private async updateChannelRoom(updateChannelInfo: UpdateChannelInfo): Promise<void> {
        if (!this.casablancaClient) {
            throw new Error("updatedChannel: Casablanca client doesn't exist")
        }
        if (updateChannelInfo.channelId === undefined) {
            throw new Error('updateChannel: channelId is undefined')
        }
        const channelProperties = this.casablancaClient.streams
            .get(updateChannelInfo.parentSpaceId)
            ?.view.spaceContent.spaceChannelsMetadata.get(updateChannelInfo.channelId)

        this.log('[updateChannelRoom] channelProperties', {
            prev: channelProperties,
            new: updateChannelInfo,
        })

        // update to updated info if it's defined, otherwise update to the current info
        await this.casablancaClient.updateChannel(
            updateChannelInfo.parentSpaceId,
            updateChannelInfo.channelId,
            updateChannelInfo.updatedChannelName ?? channelProperties?.name ?? '',
            updateChannelInfo.updatedChannelTopic ?? channelProperties?.topic ?? '',
        )
    }

    /************************************************
     * DMs
     *************************************************/

    public async createDMChannel(userId: string): Promise<string | undefined> {
        const client = this.casablancaClient
        if (!client) {
            throw new Error('No casablanca client')
        }
        const { streamId } = await client.createDMChannel(userId)
        return streamId
    }

    /************************************************
     * GDMs
     *************************************************/

    public async createGDMChannel(userIds: string[]): Promise<string | undefined> {
        const client = this.casablancaClient
        if (!client) {
            throw new Error('No casablanca client')
        }
        const { streamId } = await client.createGDMChannel(userIds)
        return streamId
    }

    /************************************************
     * Media
     *************************************************/
    public async createMediaStream(
        channelId: string,
        spaceId: string | undefined,
        chunkCount: number,
    ): Promise<{ streamId: string; prevMiniblockHash: Uint8Array }> {
        if (!this.casablancaClient) {
            throw new Error("Casablanca client doesn't exist")
        }
        return await this.casablancaClient.createMediaStream(channelId, spaceId, chunkCount)
    }

    /************************************************
     * isOwner
     *************************************************/
    public async isOwner(spaceId: string, user: string): Promise<boolean> {
        const spaceInfo = await this.spaceDapp.getSpaceInfo(spaceId)

        if (spaceInfo) {
            if (spaceInfo.owner === user) {
                return true
            } else {
                const wallets = await this.getLinkedWallets(user)
                return wallets.includes(spaceInfo.owner)
            }
        }
        return false
    }

    /************************************************
     * isEntitled
     *************************************************/

    public async isEntitled(
        spaceId: string | undefined,
        channelId: string | undefined,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        const rootKeyPromise = this.isWalletEntitled(
            spaceId,
            channelId,
            user,
            permission,
            `rootKey:${user}`,
        ).then((result) => {
            if (!result) {
                throw new Error('not entitled')
            } else {
                return result
            }
        })

        const walletsPromise = this.getLinkedWallets(user).then((wallets) =>
            Promise.any(
                wallets.map((wallet) =>
                    this.isWalletEntitled(
                        spaceId,
                        channelId,
                        wallet,
                        permission,
                        `wallet:${wallet}`,
                    ).then((result) => {
                        if (!result) {
                            throw new Error('not entitled')
                        } else {
                            return result
                        }
                    }),
                ),
            ),
        )
        const allPromises = [rootKeyPromise, walletsPromise]

        return Promise.any(allPromises).catch(() => false)
    }

    private async isWalletEntitled(
        spaceId: string | undefined,
        channelId: string | undefined,
        wallet: string,
        permission: Permission,
        subTag: string,
    ): Promise<boolean> {
        let isEntitled = false
        if (channelId && spaceId) {
            isEntitled = await this.spaceDapp.isEntitledToChannel(
                spaceId,
                channelId,
                wallet,
                permission,
            )
        } else if (spaceId) {
            isEntitled = await this.spaceDapp.isEntitledToSpace(spaceId, wallet, permission)
        } else {
            // TODO: Implement entitlement checks for DMs (channels without a space)
            // https://linear.app/hnt-labs/issue/HNT-3112/implement-entitlement-checks
            isEntitled = true
        }
        this.log(
            `[isEntitled] [${subTag}] is user entitlted for channel and space for permission`,
            isEntitled,
            {
                user: wallet,
                spaceId: spaceId,
                channelId: channelId,
                permission: permission,
            },
        )
        return isEntitled
    }

    /************************************************
     * getSpaceInfoBySpaceId
     *************************************************/
    public async getSpaceInfoBySpaceId(spaceNetworkId: string): Promise<SpaceInfo | undefined> {
        return this.spaceDapp.getSpaceInfo(spaceNetworkId)
    }

    public async createRoleTransaction(
        spaceNetworkId: string,
        roleName: string,
        permissions: Permission[],
        users: string[],
        ruleData: IRuleEntitlement.RuleDataStruct,
        signer: ethers.Signer | undefined,
    ): Promise<RoleTransactionContext> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.CreateRole,
            data: {
                spaceStreamId: spaceNetworkId,
                roleName: roleName,
            },
        })

        const args = [spaceNetworkId, roleName, permissions, users, ruleData, signer] as const

        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendCreateRoleOp([...args])
            } else {
                transaction = await this.spaceDapp.createRole(...args)
            }

            this.log(`[createRoleTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            error = await this.spaceDapp.parseSpaceError(spaceNetworkId, err)
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: {
                spaceNetworkId,
                roleId: undefined,
            },
            error,
        }
    }

    public async waitForCreateRoleTransaction(
        context: RoleTransactionContext | undefined,
    ): Promise<RoleTransactionContext> {
        const txResult = await this._waitForBlockchainTransaction(context)

        if (txResult.status === TransactionStatus.Success && txResult.data?.spaceNetworkId) {
            const parsedLogs = await this.spaceDapp.parseSpaceLogs(
                txResult.data.spaceNetworkId,
                txResult.receipt.logs,
            )

            const roleCreatedEvent = parsedLogs.find((log) => log?.name === 'RoleCreated')
            if (!roleCreatedEvent) {
                throw new Error('RoleCreated event not found')
            }
            const roleId = (roleCreatedEvent.args[1] as BigNumber).toNumber()

            const roleIdentifier: RoleIdentifier = {
                roleId,
                spaceNetworkId: txResult.data.spaceNetworkId,
            }

            txResult.data = {
                spaceNetworkId: txResult.data.spaceNetworkId,
                roleId: roleIdentifier,
            }
        }

        logTxnResult('waitForCreateRoleTransaction', txResult)

        return txResult
    }

    public async addRoleToChannelTransaction(
        spaceNetworkId: string,
        channelNetworkId: string,
        roleId: number,
        signer: ethers.Signer | undefined,
    ): Promise<TransactionContext<void>> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined
        this.log('[addRoleToChannelTransaction] space', {
            spaceNetworkId,
            channelNetworkId,
            roleId,
        })
        try {
            transaction = await this.spaceDapp.addRoleToChannel(
                spaceNetworkId,
                channelNetworkId,
                roleId,
                signer,
            )
            this.log(`[addRoleToChannelTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            error = await this.spaceDapp.parseSpaceError(spaceNetworkId, err)
        }

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: undefined,
            error,
        }
    }

    public async updateSpaceNameTransaction(
        spaceNetworkId: string,
        name: string,
        signer: ethers.Signer | undefined,
    ): Promise<TransactionContext<void>> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.UpdateSpaceName,
            data: {
                spaceStreamId: spaceNetworkId,
            },
        })
        try {
            const args = [spaceNetworkId, name, signer] as const
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendUpdateSpaceNameOp([...args])
            } else {
                transaction = await this.spaceDapp.updateSpaceName(...args)
            }
            this.log(`[updateSpaceNameTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            error = await this.spaceDapp.parseSpaceError(spaceNetworkId, err)
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return createTransactionContext({
            transaction,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            error,
        })
    }

    /**
     * This function is used to edit the membership settings of a space.
     * With account abstraciton enabled, it consists of multiple transactions that are combined into a single user operation.
     * Without account abstraction, it is a single transaction that should only update the minter role
     */
    public async editSpaceMembershipTransaction(
        args: Parameters<UserOps['sendEditMembershipSettingsOp']>['0'],
    ): Promise<TransactionContext<void>> {
        const { spaceId, updateRoleParams, membershipParams, signer } = args
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.EditSpaceMembership,
            data: {
                spaceStreamId: spaceId,
            },
        })

        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendEditMembershipSettingsOp({
                    spaceId,
                    updateRoleParams,
                    membershipParams,
                    signer,
                })
            } else {
                transaction = await this.spaceDapp.updateRole(updateRoleParams, signer)
            }

            this.log(`[updateRoleTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            error = await this.spaceDapp.parseSpaceError(spaceId, err)
        }
        // todo: add necessary contextual data
        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return createTransactionContext({
            transaction,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            error,
        })
    }

    public async waitForEditSpaceMembershipTransaction(
        context: TransactionContext<void> | undefined,
    ): Promise<TransactionContext<void>> {
        const txnContext = await this._waitForBlockchainTransaction(context)
        logTxnResult('waitForEditSpaceMembershipTransaction', txnContext)
        return txnContext
    }

    public async updateRoleTransaction(
        spaceNetworkId: string,
        roleId: number,
        roleName: string,
        permissions: Permission[],
        users: string[],
        ruleData: IRuleEntitlement.RuleDataStruct,
        signer: ethers.Signer | undefined,
    ): Promise<TransactionContext<void>> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.UpdateRole,
            data: {
                spaceStreamId: spaceNetworkId,
                roleName,
            },
        })

        const args = {
            spaceNetworkId,
            roleId,
            roleName,
            permissions,
            users,
            ruleData,
        }
        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendUpdateRoleOp([args, signer])
            } else {
                transaction = await this.spaceDapp.updateRole(args, signer)
            }

            this.log(`[updateRoleTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            error = await this.spaceDapp.parseSpaceError(spaceNetworkId, err)
        }
        // todo: add necessary contextual data
        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return createTransactionContext({
            transaction,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            error,
        })
    }

    public async waitForAddRoleToChannelTransaction(
        context: TransactionContext<void> | undefined,
    ): Promise<TransactionContext<void>> {
        const txnContext = await this._waitForBlockchainTransaction(context)
        logTxnResult('waitForAddRoleToChannelTransaction', txnContext)
        return txnContext
    }

    public async waitForUpdateSpaceNameTransaction(
        context: TransactionContext<void> | undefined,
    ): Promise<TransactionContext<void>> {
        const txnContext = await this._waitForBlockchainTransaction(context)
        logTxnResult('waitForUpdateSpaceNameTransaction', txnContext)
        return txnContext
    }

    public async waitForUpdateRoleTransaction(
        context: TransactionContext<void> | undefined,
    ): Promise<TransactionContext<void>> {
        const txnContext = await this._waitForBlockchainTransaction(context)
        logTxnResult('waitForUpdateRoleTransaction', txnContext)
        return txnContext
    }

    public async banTransaction(
        spaceId: string,
        walletAddress: string,
        signer: ethers.Signer,
    ): Promise<BanUnbanWalletTransactionContext> {
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        this.log('[banUserTransaction] space', { spaceId, walletAddress })

        const walletAddressWithToken = await this.walletAddressForMembership(spaceId, walletAddress)
        if (!walletAddressWithToken) {
            throw new Error('Membership token not found')
        }

        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.BanUser,
        })

        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendBanWalletAddressOp([
                    spaceId,
                    walletAddressWithToken,
                    signer,
                ])
            } else {
                transaction = await this.spaceDapp.banWalletAddress(
                    spaceId,
                    walletAddressWithToken,
                    signer,
                )
            }
            this.log(`[banTransaction] transaction created`)
        } catch (err) {
            error = await this.spaceDapp.parseSpaceError(spaceId, err)
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: { spaceId: spaceId, walletAddress: walletAddress, isBan: true },
            error,
        }
    }

    public async unbanTransaction(
        spaceId: string,
        walletAddress: string,
        signer: ethers.Signer,
    ): Promise<BanUnbanWalletTransactionContext> {
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        this.log('[unbanUserTransaction] space', { spaceId, walletAddress })

        const walletAddressWithToken = await this.walletAddressForMembership(spaceId, walletAddress)
        if (!walletAddressWithToken) {
            throw new Error('Membership token not found')
        }

        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.UnbanUser,
        })

        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendUnbanWalletAddressOp([
                    spaceId,
                    walletAddressWithToken,
                    signer,
                ])
            } else {
                transaction = await this.spaceDapp.unbanWalletAddress(
                    spaceId,
                    walletAddressWithToken,
                    signer,
                )
            }
            this.log(`[unbanTransaction] transaction created`)
        } catch (err) {
            error = await this.spaceDapp.parseSpaceError(spaceId, err)
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: { spaceId: spaceId, walletAddress: walletAddress, isBan: false },
            error,
        }
    }

    public async waitForBanUnbanTransaction(transactionContext: BanUnbanWalletTransactionContext) {
        const txnContext = await this._waitForBlockchainTransaction(transactionContext)
        logTxnResult('waitForBanTransaction', txnContext)
        return txnContext
    }

    public async walletAddressIsBanned(spaceId: string, walletAddress: string): Promise<boolean> {
        const wallets = (await this.getLinkedWallets(walletAddress)).concat(walletAddress)
        for (const walletAddress of wallets) {
            if (await this.spaceDapp.walletAddressIsBanned(spaceId, walletAddress)) {
                return true
            }
        }
        return false
    }

    public async deleteRoleTransaction(
        spaceNetworkId: string,
        roleId: number,
        signer: ethers.Signer | undefined,
    ): Promise<TransactionContext<void>> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.DeleteRole,
            data: {
                spaceStreamId: spaceNetworkId,
            },
        })
        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendDeleteRoleOp([spaceNetworkId, roleId, signer])
            } else {
                transaction = await this.spaceDapp.deleteRole(spaceNetworkId, roleId, signer)
            }
            this.log(`[deleteRoleTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            error = await this.spaceDapp.parseSpaceError(spaceNetworkId, err)
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return createTransactionContext({
            transaction,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            error,
        })
    }

    public async waitForDeleteRoleTransaction(
        context: TransactionContext<void> | undefined,
    ): Promise<TransactionContext<void>> {
        const txnContext = await this._waitForBlockchainTransaction(context)
        logTxnResult('waitForDeleteRoleTransaction', txnContext)
        return txnContext
    }

    /************************************************
     * setSpaceAccess
     *************************************************/
    public async setSpaceAccess(
        spaceNetworkId: string,
        disabled: boolean,
        signer: ethers.Signer | undefined,
    ): Promise<boolean> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let success = false
        try {
            transaction = await this.spaceDapp.setSpaceAccess(spaceNetworkId, disabled, signer)
            receipt = await transaction.wait()
        } catch (err) {
            const decodedError = await this.getDecodedErrorForSpace(spaceNetworkId, err)
            console.error('[setSpaceAccess] failed', decodedError)
            throw decodedError
        } finally {
            if (receipt?.status === 1) {
                this.log('[setSpaceAccess] successful')
                success = true
            } else {
                console.error('[setSpaceAccess] failed')
            }
        }
        return success
    }

    /************************************************
     * inviteUser
     * if it's GDM, invite and auto join the user
     *************************************************/
    public async inviteUser(roomId: string, userId: string) {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }
        if (isGDMChannelStreamId(roomId)) {
            await this.casablancaClient.joinUser(roomId, userId)
        } else {
            await this.casablancaClient.inviteUser(roomId, userId)
        }
    }

    /************************************************
     * leave
     * ************************************************/
    public async leave(roomId: string, _parentNetworkId?: string): Promise<void> {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }
        await this.casablancaClient.leaveStream(roomId)
    }

    /************************************************
     * joinRoom
     * - this function can handle joining both spaces and channels BUT should be used for channels only
     * - for spaces, use joinTown
     * @todo deprecate this in favor of separate joinTown and joinChannel functions
     *************************************************/
    public async joinRoom(
        roomId: string,
        _parentNetworkId?: string,
        opts?: {
            skipWaitForMiniblockConfirmation?: boolean
            skipWaitForUserStreamUpdate?: boolean
        },
    ) {
        // TODO: not doing event handlers here since Casablanca is not part of alpha
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }
        const stream = await this.casablancaClient.joinStream(roomId, opts)
        let parentId = roomId
        if (stream.view.contentKind === 'channelContent' && stream.view.channelContent.spaceId) {
            parentId = stream.view.channelContent.spaceId
        }
        this._eventHandlers?.onJoinRoom?.(roomId, parentId)
        return toStreamView(stream, this.getMembership(roomId))
    }

    public async removeUser(streamId: string, userId: string): Promise<void> {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }
        await this.casablancaClient.removeUser(streamId, userId)
    }

    /************************************************
     * joinTown
     * - mints membership if needed
     * - joins the space
     *************************************************/
    public async joinTown(spaceId: string, signer: ethers.Signer, signerContext?: SignerContext) {
        if (!this.casablancaClient && !signerContext) {
            throw new Error('Casablanca client not initialized, pass signer context')
        }
        const userId = await signer.getAddress()
        const linkedWallets = await this.getLinkedWallets(userId)

        const joinRiverRoom = async () => {
            if (!this.casablancaClient && signerContext) {
                await this.startCasablancaClient(signerContext)
            }
            const room = await this.joinRoom(spaceId)
            this.log('[joinTown] room', room)
            // join the default channels
            const spaceContent = this.casablancaClient?.streams.get(spaceId)?.view.spaceContent
            if (spaceContent) {
                for (const [key, value] of spaceContent.spaceChannelsMetadata.entries()) {
                    if (value.isDefault) {
                        this.log('[joinTown] joining default channel', key)
                        await this.joinRoom(key, undefined, {
                            skipWaitForMiniblockConfirmation: true,
                            skipWaitForUserStreamUpdate: true,
                        })
                    }
                }
            }
            return room
        }

        // check membership nft first to avoid uncessary mint attempts on rejoins
        try {
            const allPromises = linkedWallets
                .map((wallet) => this.spaceDapp.hasSpaceMembership(spaceId, wallet))
                .concat(this.spaceDapp.hasSpaceMembership(spaceId, userId))
            const results = await Promise.all(allPromises)
            if (results.some((result) => result)) {
                this.log('[joinTown] already have member nft')
                const room = await joinRiverRoom()
                return room
            }
        } catch (error) {
            // skip if no membership nft found
            if (error instanceof AggregateError) {
                this.log('[joinTown] no membership nft found, proceeding with mint', error)
            }
            // otherwise some other error occurred
            else {
                throw error
            }
        }

        try {
            this.log('[joinTown] minting membership')
            await this.mintMembershipTransaction(spaceId, signer)
            this.log('[joinTown] minted membership')
        } catch (error: unknown) {
            if (
                error &&
                typeof error === 'object' &&
                'name' in error &&
                typeof error.name === 'string' &&
                error.name.match('Membership__AlreadyMember')
            ) {
                this.log('[joinTown] already member')
            } else {
                console.error('[joinTown] mint membership failed', error)
                throw error
            }
        }
        const room = await joinRiverRoom()
        return room
    }

    /************************************************
     * mintMembershipTransaction
     *************************************************/
    public async mintMembershipTransaction(spaceId: string, signer: ethers.Signer) {
        this.log('[mintMembershipTransaction] start')

        const rootWallet = (await signer?.getAddress()) ?? ''
        let transaction: TransactionOrUserOperation | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.JoinSpace,
        })

        try {
            // If any of the linked wallets are entitled, we can join the room
            // get linked wallets includes the root wallet
            const wallets = await this.getLinkedWallets(rootWallet)
            const allPromises = wallets.map(async (wallet) => {
                const isEntitled = await this.isWalletEntitled(
                    spaceId,
                    undefined,
                    wallet,
                    Permission.JoinSpace,
                    `mintMembershipTransaction:wallet`,
                )
                if (isEntitled) {
                    return wallet
                } else {
                    throw new Error('not entitled')
                }
            })
            allPromises.push(
                (async () => {
                    const isEntitled = await this.isWalletEntitled(
                        spaceId,
                        undefined,
                        rootWallet,
                        Permission.JoinSpace,
                        `mintMembershipTransaction:rootWallet`,
                    )
                    if (isEntitled) {
                        return rootWallet
                    } else {
                        throw new Error('not entitled')
                    }
                })(),
            )
            // This will throw an AggregateError if none of the wallets are entitled
            const entitledWallet = await Promise.any(allPromises)

            const hasMembership = await this.spaceDapp.hasSpaceMembership(spaceId, entitledWallet)

            if (hasMembership) {
                return
            }

            // add listener for the minted membership
            // await this.spaceDapp.addMembershipListener(spaceId, entitledWallet)
            const membershipListener = this.spaceDapp.listenForMembershipEvent(
                spaceId,
                entitledWallet,
            )

            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendJoinSpaceOp([spaceId, entitledWallet, signer])
            } else {
                transaction = await this.spaceDapp.joinSpace(spaceId, entitledWallet, signer)
            }

            continueStoreTx({
                hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
                transaction,
                eventListener: membershipListener,
                error: undefined, // if no throw then no error
            })

            this.log(
                `[mintMembershipTransaction] transaction created, starting membershipListener`,
                {
                    transaction,
                },
            )
            const result = await membershipListener.wait()
            this.log('[mintMembershipTransaction] membershipListener result', result)

            if (!result.success) {
                throw new MembershipRejectedError()
            }
        } catch (error) {
            if (error instanceof AggregateError) {
                console.error('[mintMembershipTransaction] failed', error)
                const err = new Error('execution reverted')
                err.name = 'Entitlement__NotAllowed'
                throw err
            }
            console.error('[mintMembershipTransaction] failed', error)
            let decodeError: Error
            if (error instanceof MembershipRejectedError) {
                decodeError = error
            } else {
                decodeError = await this.getDecodedErrorForSpace(spaceId, error)
            }
            console.error('[mintMembershipAndJoinRoom] failed', decodeError)
            continueStoreTx({
                hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
                transaction,
                error: decodeError,
            })
            throw decodeError
        }
    }

    /************************************************
     * sendMessage
     *************************************************/
    public async sendMessage(roomId: string, message: string, options?: SendMessageOptions) {
        if (this.pushNotificationClient && options) {
            const messageIsEmpty = message.trim() === ''
            await this.pushNotificationClient.sendNotificationTagIfAny(
                roomId,
                messageIsEmpty,
                options,
            )
        }

        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }

        switch (options?.messageType) {
            case undefined:
            case MessageType.Text:
                {
                    const mentions =
                        options?.mentions?.map((x) => {
                            if (x.atChannel) {
                                return new ChannelMessage_Post_Mention({
                                    mentionBehavior: {
                                        case: 'atChannel',
                                        value: new Empty(),
                                    },
                                })
                            } else {
                                return new ChannelMessage_Post_Mention(x)
                            }
                        }) ?? []
                    await this.casablancaClient.sendChannelMessage_Text(roomId, {
                        threadId: options?.threadId,
                        threadPreview: options?.threadPreview,
                        replyId: options?.replyId,
                        replyPreview: options?.replyPreview,
                        content: {
                            body: message,
                            mentions,
                            attachments: transformAttachments(options?.attachments),
                        },
                    })
                }
                break
            case MessageType.Image:
                await this.casablancaClient.sendChannelMessage_Image(roomId, {
                    threadId: options?.threadId,
                    threadPreview: options?.threadPreview,
                    replyId: options?.replyId,
                    replyPreview: options?.replyPreview,
                    content: {
                        title: message,
                        info: options?.info,
                        thumbnail: options?.thumbnail,
                    },
                })
                break
            case MessageType.GM:
                await this.casablancaClient.sendChannelMessage_GM(roomId, {
                    threadId: options?.threadId,
                    threadPreview: options?.threadPreview,
                    replyId: options?.replyId,
                    replyPreview: options?.replyPreview,
                    content: {
                        typeUrl: message,
                    },
                })
                break
            default:
                staticAssertNever(options)
        }
        this._eventHandlers?.onSendMessage?.(roomId, message, options)
    }

    public async sendMediaPayload(
        streamId: string,
        data: Uint8Array,
        chunkIndex: number,
        prevMiniblockHash: Uint8Array,
    ): Promise<{ prevMiniblockHash: Uint8Array }> {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }
        return await this.casablancaClient.sendMediaPayload(
            streamId,
            data,
            chunkIndex,
            prevMiniblockHash,
        )
    }

    /************************************************
     * sendReaction
     *************************************************/
    public async sendReaction(roomId: string, eventId: string, reaction: string): Promise<void> {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }
        const creatorUserId = this.casablancaClient?.stream(roomId)?.view.events.get(eventId)
            ?.remoteEvent?.creatorUserId
        if (
            this.pushNotificationClient &&
            creatorUserId &&
            (isChannelStreamId(roomId) ||
                isGDMChannelStreamId(roomId) ||
                isDMChannelStreamId(roomId))
        ) {
            await this.pushNotificationClient.sendUserReactionToNotificationService(
                roomId,
                creatorUserId,
            )
        }
        await this.casablancaClient.sendChannelMessage_Reaction(roomId, {
            reaction,
            refEventId: eventId,
        })
        this.log('sendReaction')
    }

    /************************************************
     * retrySendMessage
     *************************************************/
    public async retrySendMessage(roomId: string, localEventId: string): Promise<void> {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }
        try {
            await this.casablancaClient.retrySendMessage(roomId, localEventId)
        } catch (err) {
            console.error('retrySendMessage failed', err)
        }
    }

    /************************************************
     * editMessage
     *************************************************/
    public async editMessage(
        roomId: string,
        eventId: string,
        originalEventContent: RoomMessageEvent,
        message: string,
        options: SendTextMessageOptions | undefined,
    ) {
        if (!this.casablancaClient) {
            throw new Error('casablanca client is undefined')
        }
        return await this.casablancaClient.sendChannelMessage_Edit_Text(roomId, eventId, {
            threadId: originalEventContent.threadId,
            threadPreview: originalEventContent.threadPreview,
            content: {
                body: message,
                mentions: options?.mentions?.map((x) => new ChannelMessage_Post_Mention(x)) ?? [],
                attachments: transformAttachments(options?.attachments),
            },
        })
    }

    /************************************************
     * redactEvent
     *************************************************/
    public async redactEvent(roomId: string, eventId: string, reason?: string) {
        if (!this.casablancaClient) {
            throw new Error('casablanca client is undefined')
        }
        await this.casablancaClient.sendChannelMessage_Redaction(roomId, {
            refEventId: eventId,
            reason,
        })
    }

    /************************************************
     * setRoomFullyReadData
     ************************************************/
    public async setRoomFullyReadData(channelId: string, content: Record<string, FullyReadMarker>) {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client is undefined')
        }
        await this.casablancaClient.sendFullyReadMarkers(channelId, content)
    }

    /************************************************
     * updateUserBlock
     ************************************************/
    public async updateUserBlock(userId: string, isBlocked: boolean) {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client is undefined')
        }
        await this.casablancaClient.updateUserBlock(userId, isBlocked)
    }

    /************************************************
     * getMembership
     ************************************************/
    public getMembership(streamId: string): Membership {
        if (!this.casablancaClient) {
            throw new Error('casablanca client is undefined')
        }
        const userStreamId = this.casablancaClient.userStreamId
        if (!userStreamId) {
            return Membership.None
        }
        const membershipOp = this.casablancaClient
            .stream(userStreamId)
            ?.view.userContent.getMembership(streamId)?.op
        return toMembership(membershipOp)
    }

    /************************************************
     * getRoomMember
     * - This function is primarily intended for testing purposes
     * **********************************************/
    public getRoomMember(roomId: string, userId: string): RoomMember | undefined {
        const roomData = this.getRoomData(roomId)
        return roomData?.members.find((x) => x.userId === userId)
    }

    /************************************************
     * getRoomData
     * - This function is primarily intended for testing purposes
     ************************************************/
    public getRoomData(streamId: string): StreamView | undefined {
        if (!this.casablancaClient) {
            throw new Error('casablanca client is undefined')
        }
        const membership = this.getMembership(streamId)
        const stream = this.casablancaClient.stream(streamId)
        if (stream) {
            return toStreamView(stream, membership)
        } else if (membership !== Membership.None) {
            return {
                id: streamId,
                membership,
                members: [],
            }
        } else {
            return undefined
        }
    }

    /************************************************
     * getIsUsernameAvailable
     ************************************************/
    public getIsUsernameAvailable(streamId: string, username: string): Promise<boolean> {
        if (!this.casablancaClient) {
            throw new Error('No casablanca client')
        }
        return Promise.resolve(this.casablancaClient.isUsernameAvailable(streamId, username))
    }

    public async adminRedactMessage(streamId: string, eventId: string): Promise<void> {
        if (!this.casablancaClient) {
            throw new Error('No casablanca client')
        }
        await this.casablancaClient.redactMessage(streamId, eventId)
    }

    /************************************************
     * setDisplayName
     ************************************************/
    // eslint-disable-next-line @typescript-eslint/require-await
    public async setDisplayName(streamId: string, displayName: string): Promise<void> {
        if (!this.casablancaClient) {
            throw new Error('No casablanca client')
        }
        await this.casablancaClient.setDisplayName(streamId, displayName)
    }

    /************************************************
     * avatarUrl
     ************************************************/
    // eslint-disable-next-line @typescript-eslint/require-await
    public async setAvatarUrl(url: string): Promise<void> {
        // todo casablanca avatar url
        console.error('not implemented for casablanca', url)
    }

    public async setRoomProperties(roomId: string, title: string, topic: string) {
        if (!this.casablancaClient) {
            throw new Error('casablanca client is undefined')
        }
        await this.casablancaClient.updateGDMChannelProperties(roomId, title, topic)
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async setHighPriorityStreams(streamIds: string[]): Promise<void> {
        if (!this.casablancaClient) {
            throw new Error('casablanca client is undefined')
        }
        this.casablancaClient.setHighPriorityStreams(streamIds)
    }

    /************************************************
     * scrollback
     ************************************************/
    public async scrollback(roomId: string): Promise<{
        terminus: boolean
        eventCount: number
        firstEventId?: string
        firstEventTimestamp?: number
    }> {
        if (!this.casablancaClient) {
            throw new Error('casablanca client is undefined')
        }
        const result = await this.casablancaClient.scrollback(roomId)
        return {
            terminus: result.terminus,
            eventCount: this.casablancaClient?.stream(roomId)?.view?.timeline.length ?? 0,
            firstEventId: result.firstEvent?.hashStr,
            firstEventTimestamp: result.firstEvent
                ? Number(result.firstEvent.createdAtEpochMs)
                : undefined,
        }
    }

    public async scrollbackToEvent(
        roomId: string,
        eventId: string,
        limit: number,
    ): Promise<boolean> {
        if (!this.casablancaClient) {
            throw new Error('casablanca client is undefined')
        }
        for (let i = 0; i < limit; i++) {
            await this.casablancaClient.scrollback(roomId)
            if (this.casablancaClient.stream(roomId)?.view.events.get(eventId)) {
                return true
            }
        }
        return false
    }

    /************************************************
     * Wallet linking
     */
    public async linkEOAToRootKey(
        rootKey: ethers.Signer,
        wallet: ethers.Signer,
    ): Promise<WalletLinkTransactionContext> {
        const rootKeyAddress = await rootKey.getAddress()
        const walletAddress = await wallet.getAddress()
        const walletLink = this.spaceDapp.getWalletLink()

        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.LinkWallet,
        })

        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendLinkEOAToRootKeyOp([rootKey, wallet])
            } else {
                transaction = await walletLink.linkWalletToRootKey(rootKey, wallet)
            }
            this.log(`[linkEOAToRootKey] transaction created` /*, transaction*/)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            const parsedError = walletLink.parseError(err)
            error = parsedError
        }
        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: transaction
                ? {
                      rootKeyAddress,
                      walletAddress,
                  }
                : undefined,
            error,
        }
    }

    /**
     * Link the caller of the tx to the root key. For now, this is used to link a smart account to a root key.
     * @param rootKey
     * @param wallet - optional because if it's a user op, we only need the root key
     * @returns
     */
    public async linkCallerToRootKey(
        rootKey: ethers.Signer,
        wallet?: ethers.Signer,
    ): Promise<WalletLinkTransactionContext> {
        const rootKeyAddress = await rootKey.getAddress()
        let walletAddress = ''
        const walletLink = this.spaceDapp.getWalletLink()

        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.LinkWallet,
        })

        try {
            if (this.isAccountAbstractionEnabled()) {
                // when account abstraction is enabled, the only time we should be using this method is when linking a smart account to a root key
                if (wallet) {
                    throw new Error(
                        '[linkCallerToRootKey] wallet address should not be provided when account abstraction is enabled',
                    )
                }
                transaction = await this.userOps?.sendLinkSmartAccountToRootKeyOp(rootKey)
                walletAddress =
                    (await this.getAbstractAccountAddress({
                        rootKeyAddress: rootKeyAddress as Address,
                    })) ?? ''
            } else {
                if (!wallet) {
                    throw new Error(
                        '[linkCallerToRootKey] wallet address must be provided when account abstraction is disabled',
                    )
                }
                walletAddress = await wallet.getAddress()
                transaction = await walletLink.linkCallerToRootKey(rootKey, wallet)
            }
            this.log(`[linkCallerToRootKey] transaction created` /*, transaction*/)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            const parsedError = walletLink.parseError(err)
            error = parsedError
        }
        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: transaction
                ? {
                      rootKeyAddress,
                      walletAddress,
                  }
                : undefined,
            error,
        }
    }

    public async removeLink(
        rootKey: ethers.Signer,
        walletAddress: string,
    ): Promise<WalletLinkTransactionContext> {
        const walletLink = this.spaceDapp.getWalletLink()

        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.UnlinkWallet,
        })

        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendRemoveWalletLinkOp([rootKey, walletAddress])
            } else {
                transaction = await walletLink.removeLink(rootKey, walletAddress)
            }
        } catch (err) {
            const parsedError = walletLink.parseError(err)
            error = parsedError
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: transaction
                ? {
                      rootKeyAddress: await rootKey.getAddress(),
                      walletAddress,
                  }
                : undefined,
            error,
        }
    }

    public async getLinkedWallets(walletAddress: string): Promise<string[]> {
        const walletLink = this.spaceDapp.getWalletLink()
        return await walletLink.getLinkedWallets(walletAddress)
    }

    public async waitWalletLinkTransaction(transactionContext: WalletLinkTransactionContext) {
        const txnContext = await this._waitForBlockchainTransaction(transactionContext)
        logTxnResult('waitWalletLinkTransaction', txnContext)
        return txnContext
    }

    public async getRootKeyFromLinkedWallet(walletAddress: string): Promise<string> {
        const walletLink = this.spaceDapp.getWalletLink()
        return await walletLink.getRootKeyForWallet(walletAddress)
    }

    /************************************************
     * log
     *************************************************/
    protected log(message: string, ...optionalParams: unknown[]) {
        console.log(message, ...optionalParams)
    }

    /*
     * Error when baseProvider.waitForTransaction receipt has a status of 0
     */
    private async throwTransactionError(receipt: ContractReceipt): Promise<Error> {
        try {
            const code = await this.opts.baseProvider?.call(receipt, receipt.blockNumber)
            const reason = toUtf8String(`0x${code?.substring(138) || ''}`)
            throw new Error(reason)
        } catch (error) {
            // This might be causing issues https://github.com/foundry-rs/foundry/issues/4843
            // and hopefully this provides a little better error message
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const deepMessage = error.error?.error?.message as string | undefined
            if (deepMessage) {
                throw new Error(deepMessage)
            }
            throw error
        }
    }

    private async walletAddressForMembership(
        spaceId: string,
        walletAddress: string,
    ): Promise<string | undefined> {
        const wallets = (await this.getLinkedWallets(walletAddress)).concat(walletAddress)
        for (const walletAddress of wallets) {
            if (await this.spaceDapp.hasSpaceMembership(spaceId, walletAddress)) {
                return walletAddress
            }
        }
        return undefined
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private getDecodedErrorForSpaceFactory(error: any): Error & { code?: string } {
        try {
            return this.spaceDapp.parseSpaceFactoryError(error)
        } catch (e: unknown) {
            if (e instanceof Error) {
                return e
            }
            if (
                typeof e === 'object' &&
                e !== null &&
                'name' in e &&
                typeof e.name === 'string' &&
                'message' in e &&
                typeof e.message === 'string' &&
                e.message !== undefined
            ) {
                const newErr = new Error(e.message)
                newErr.name = e.name
                if ('code' in e) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    newErr.code = e.code
                }
                return newErr
            } else {
                return new Error(`[getDecodedErrorForSpaceFactory] cannot decode error`)
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async getDecodedErrorForSpace(spaceId: string, error: any): Promise<Error> {
        try {
            // parseSpaceError needs to be rewritten to return actual errors
            const fakeError = await this.spaceDapp.parseSpaceError(spaceId, error)
            const realError = new Error(fakeError.message)
            realError.name = fakeError.name
            if ('code' in error) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                realError.code = error.code
            }
            return realError
        } catch (e: unknown) {
            if (e instanceof Error) {
                return e
            }
            if (
                typeof e === 'object' &&
                e !== null &&
                'name' in e &&
                typeof e.name === 'string' &&
                'message' in e &&
                typeof e.message === 'string' &&
                e.message !== undefined
            ) {
                const newErr = new Error(e.message)
                newErr.name = e.name
                if ('code' in e) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    newErr.code = e.code
                }
                return newErr
            } else {
                return new Error(`[getDecodedErrorForSpace] cannot decode error`)
            }
        }
    }

    public setEventHandlers(eventHandlers: TownsClientEventHandlers | undefined) {
        this._eventHandlers = eventHandlers
    }

    public onLogin({ userId }: { userId: string }) {
        this._eventHandlers?.onLogin?.({ userId: userId })
    }

    private async _waitForBlockchainTransaction<TxnContext>(
        context: TransactionContext<TxnContext> | undefined,
    ): Promise<TransactionContext<TxnContext>> {
        if (!context?.transaction) {
            return createTransactionContext<TxnContext>({
                status: TransactionStatus.Failed,
                error: new Error(`[_waitForBlockchainTransaction] transaction is undefined`),
            })
        }

        let transaction: TransactionOrUserOperation | undefined = undefined
        let receipt: ReceiptType | undefined = undefined
        let error: Error | undefined = undefined

        transaction = context.transaction

        try {
            if (isUserOpResponse(transaction)) {
                // wait for the userop event - this .wait is not the same as ethers.ContractTransaction.wait - see userop.js sendUserOperation
                const userOpEvent = await transaction.wait()

                if (userOpEvent) {
                    if (userOpEvent.args.success === false) {
                        // TODO: parse the user operation error
                        throw new Error(
                            `[_waitForBlockchainTransaction] user operation was not successful`,
                        )
                    }

                    // we probably don't need to wait for this transaction, but for now we can convert it to a receipt for less refactoring
                    receipt = await this.opts.baseProvider?.waitForTransaction(
                        userOpEvent.transactionHash,
                    )
                } else {
                    throw new Error(`[_waitForBlockchainTransaction] userOpEvent is undefined`)
                }
            } else {
                receipt = await this.opts.baseProvider?.waitForTransaction(transaction.hash)
            }

            if (receipt?.status === 1) {
                return createTransactionContext({
                    status: TransactionStatus.Success,
                    transaction,
                    data: context.data,
                    receipt,
                })
            } else if (receipt?.status === 0) {
                await this.throwTransactionError(receipt)
            } else {
                throw new Error(
                    `[_waitForBlockchainTransaction] failed because receipt.status is undefined`,
                )
            }
        } catch (err) {
            if (err instanceof Error) {
                error = err
            } else {
                error = new Error(`$[_waitForBlockchainTransaction] failed: ${JSON.stringify(err)}`)
            }
        }

        // got here without success
        return createTransactionContext({
            status: TransactionStatus.Failed,
            transaction,
            receipt,
            error,
        })
    }
}
