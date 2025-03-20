import { BigNumber, ethers } from 'ethers'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import {
    Client as CasablancaClient,
    RiverDbManager,
    StreamRpcClient,
    UnauthenticatedClient,
    isGDMChannelStreamId,
    makeStreamRpcClient,
    userIdFromAddress,
    makeRiverRpcClient,
    ChannelMessageEvent,
    transformAttachments,
    ContractReceipt,
    SolanaTransactionReceipt,
} from '@towns-protocol/sdk'
import { EntitlementsDelegate } from '@towns-protocol/encryption'
import { IRuleEntitlementV2Base, ISpaceDapp, SpaceDapp } from '@towns-protocol/web3'
import {
    AddEventResponse_Error,
    ChunkedMedia,
    FullyReadMarker,
    UserBio,
    CreationCookie,
    BlockchainTransaction_TokenTransfer,
    PlainMessage,
    ChannelMessage_Post_MentionSchema,
} from '@towns-protocol/proto'
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
    logTxnResult,
    BanUnbanWalletTransactionContext,
    PrepayMembershipTransactionContext,
    JoinFlowStatus,
    CreateSpaceFlowStatus,
    TransferAssetTransactionContext,
    TipTransactionContext,
    ReviewTransactionContext,
    TownsReviewParams,
} from './TownsClientTypes'
import {
    CreateChannelInfo,
    CreateSpaceInfo,
    TownsStreamMember,
    SendMessageOptions,
    SendTextMessageOptions,
    StreamView,
    TipParams,
    UpdateChannelInfo,
} from '../types/towns-types'
import { toMembership, Membership, SignerContext, MessageType } from '@towns-protocol/sdk'
import { addCategoryToError, SignerUndefinedError } from '../types/error-types'
import { makeSpaceStreamId, makeDefaultChannelStreamId } from '@towns-protocol/sdk'
import { retryOperation, staticAssertNever } from '../utils/towns-utils'
import { toStreamView } from './casablanca/CasablancaUtils'
import { RoleIdentifier, BlockchainTransactionType, Address, TSigner } from '../types/web3-types'
import { MembershipStruct, Permission, SpaceInfo } from '@towns-protocol/web3'
import { TimeTrackerEvents, getTimeTracker } from '../SequenceTimeTracker'
import { TownsAnalytics } from '../types/TownsAnalytics'
import { BaseTransactor } from './BaseTransactor'
import { UserOps } from '@towns/userops'
import { getSpaceReviewEventData } from '@towns-protocol/web3'
import { create } from '@bufbuild/protobuf'

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
    onWalletUnlinked: (userId: string, walletAddress: string) => void
}

export class TownsClient
    extends (EventEmitter as new () => TypedEmitter<TownsClientEvents>)
    implements EntitlementsDelegate
{
    public readonly opts: TownsOpts
    public readonly name: string
    public spaceDapp: ISpaceDapp
    protected casablancaClient?: CasablancaClient
    private _signerContext?: SignerContext
    protected _eventHandlers?: TownsClientEventHandlers
    private supportedXChainIds: number[] | undefined
    private analytics: TownsAnalytics | undefined
    public readonly createLegacySpaces: boolean | undefined
    public readonly baseTransactor: BaseTransactor

    constructor(opts: TownsOpts, spaceDapp: ISpaceDapp, name?: string) {
        super()
        this.opts = opts
        this.createLegacySpaces = opts.createLegacySpaces === true
        this.analytics = opts.analytics
        this.name = name || Math.random().toString(36).substring(7)

        // Don't log the analytics object, it's large and not useful
        const { analytics: _, ...rest } = this.opts
        console.log('~~~ new TownsClient ~~~', this.name, rest)
        this.spaceDapp = spaceDapp

        // this.blockchainTransactionStore = new BlockchainTransactionStore(this.spaceDapp)
        this._eventHandlers = opts.eventHandlers

        this.baseTransactor = new BaseTransactor({
            accountAbstractionConfig: opts.accountAbstractionConfig,
            baseProvider: opts.baseProvider,
            baseConfig: opts.baseConfig,
            spaceDapp: this.spaceDapp as SpaceDapp,
            analytics: this.analytics,
            createLegacySpaces: this.createLegacySpaces,
            xchainConfig: this.opts.xchainConfig,
        })
    }

    public get signerContext(): SignerContext | undefined {
        return this._signerContext
    }

    public isAccountAbstractionEnabled() {
        return !!this.opts.accountAbstractionConfig?.aaRpcUrl
    }

    public getAbstractAccountAddress({ rootKeyAddress }: { rootKeyAddress: Address }) {
        try {
            return this.baseTransactor.userOps?.getAbstractAccountAddress({ rootKeyAddress })
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
        await this.baseTransactor.blockchainTransactionStore.stop()
        await this.baseTransactor.userOps?.reset()
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
     * localStartCasablancaClientWithRetries
     * for use in joining or creating a space for a new user
     * a few things can happen:
     * - the network is down
     * - the isEntitled call can race during space creation and fail even though the space was created (alchemy isn't up to date on the node)
     *************************************************/
    private async localStartCasablancaClientWithRetries(
        context: SignerContext,
        metadata: { spaceId: string },
        sequenceName: TimeTrackerEvents,
    ): Promise<CasablancaClient> {
        const maxRetries = 3
        let retryCount = 0
        const getRetryDelay = (retryCount: number) => {
            return Math.min(1000 * 2 ** retryCount, 20000) // 2, 4, 8 seconds if max retries is 3
        }
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                return await this.startCasablancaClient(context, metadata, sequenceName)
            } catch (e) {
                retryCount++
                console.error(
                    '[localStartCasablancaClientWithRetries] error starting casablanca client',
                    { error: e, retryCount },
                )
                await this.logoutFromCasablanca()
                if (retryCount > maxRetries) {
                    throw e
                }
                const retryDelay = getRetryDelay(retryCount)
                console.log('[localStartCasablancaClientWithRetries] retrying', {
                    retryDelay,
                    retryCount,
                })
                await new Promise((resolve) => setTimeout(resolve, retryDelay))
            }
        }
    }

    /************************************************
     * startCasablancaClient
     *************************************************/
    public async startCasablancaClient(
        context: SignerContext,
        metadata?: { spaceId: string },
        sequenceName?: TimeTrackerEvents,
    ): Promise<CasablancaClient> {
        this.log('startCasablancaClient', context)
        if (this.casablancaClient) {
            throw new Error('already started casablancaClient')
        }
        if (!this.opts.riverProvider) {
            throw new Error('riverChainProvider is required')
        }
        this._signerContext = context
        let rpcClient: StreamRpcClient

        let endMakeRiverRpc: (() => void) | undefined
        if (sequenceName) {
            endMakeRiverRpc = getTimeTracker().startMeasurement(
                sequenceName,
                'river_make_rpc_client',
            )
        }
        // to force a specific rpc url, open the console and type `localStorage.RIVER_RPC_URL = 'https://river1.nodes.gamma.towns.com'`
        if (localStorage.getItem('RIVER_RPC_URL')) {
            rpcClient = makeStreamRpcClient(localStorage.getItem('RIVER_RPC_URL') as string)
        } else {
            rpcClient = await makeRiverRpcClient(this.opts.riverProvider, this.opts.riverConfig)
        }
        if (endMakeRiverRpc) {
            endMakeRiverRpc()
        }

        const userId = userIdFromAddress(context.creatorAddress)
        const cryptoDbName = this.cryptoDbName(context)
        const persistenceDbName = this.persistenceDbName(context)
        const cryptoStore = RiverDbManager.getCryptoDb(userId, cryptoDbName)
        this.casablancaClient = new CasablancaClient(context, rpcClient, cryptoStore, this, {
            persistenceStoreName: persistenceDbName,
            logNamespaceFilter: this.opts.logNamespaceFilter,
            highPriorityStreamIds: this.opts.highPriorityStreamIds,
            unpackEnvelopeOpts: this.opts.unpackEnvelopeOpts,
            streamOpts: { useModifySync: this.opts.useModifySync },
        })
        this.casablancaClient.setMaxListeners(100)

        let endIntializeUser: (() => void) | undefined
        if (sequenceName) {
            endIntializeUser = getTimeTracker().startMeasurement(
                sequenceName,
                'river_initialize_user',
            )
        }

        const initTimes = await this.casablancaClient.initializeUser(metadata)

        if (sequenceName) {
            Object.entries(initTimes).forEach(([key, ms]) => {
                // init_crypto_time,
                // init_mls_time,
                // init_user_stream_time,
                // init_user_inbox_stream_time,
                // init_user_metadata_stream_time,
                // init_user_metadata_stream_init_from_persistence_time,
                // init_user_metadata_stream_get_user_stream_time,
                // init_user_metadata_stream_create_user_metadata_stream_time,
                // init_user_metadata_stream_init_from_response_time,
                // init_user_settings_stream_time,
                const snakeCaseKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
                getTimeTracker().addMeasurement(sequenceName, `river_${snakeCaseKey}`, ms)
            })
        }

        if (endIntializeUser) {
            endIntializeUser()
        }

        this._eventHandlers?.onRegister?.({
            userId: this.casablancaClient.userId,
        })

        this.log('xChainRpcUrls', this.opts.xchainConfig.supportedRpcUrls)

        this.casablancaClient.startSync()
        this.emit('onCasablancaClientCreated', this.casablancaClient)
        return this.casablancaClient
    }

    public persistenceDbName(signerContext: SignerContext): string {
        const userId = userIdFromAddress(signerContext.creatorAddress)
        const envSuffix = this.opts.environmentId === 'gamma' ? '' : `-${this.opts.environmentId}`
        const persistenceDbName = `persistence-${userId}${envSuffix}`
        return persistenceDbName
    }

    public cryptoDbName(signerContext: SignerContext): string {
        const userId = userIdFromAddress(signerContext.creatorAddress)
        const envSuffix = this.opts.environmentId === 'gamma' ? '' : `-${this.opts.environmentId}`
        const cryptoDbName = `database-${userId}${envSuffix}`
        return cryptoDbName
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

    public async createSpaceTransaction(
        createSpaceInfo: CreateSpaceInfo,
        membership: MembershipStruct,
        signer: ethers.Signer | undefined,
        onSpaceCreateFlowStatus?: (update: CreateSpaceFlowStatus) => void,
    ): Promise<CreateSpaceTransactionContext> {
        return this.baseTransactor.createSpaceTransaction(
            createSpaceInfo,
            membership,
            signer,
            onSpaceCreateFlowStatus,
        )
    }

    public async waitForCreateSpaceTransaction(
        context: CreateSpaceTransactionContext | undefined,
        signerContext: SignerContext | undefined,
        defaultUsernames: string[] = [],
        onCreateFlowStatus?: (update: CreateSpaceFlowStatus) => void,
    ): Promise<CreateSpaceTransactionContext> {
        const txContext = await this.baseTransactor.waitForBlockchainTransaction(
            context,
            TimeTrackerEvents.CREATE_SPACE,
        )
        if (txContext.status === TransactionStatus.Success && txContext.data) {
            this.log('[waitForCreateSpaceTransaction] space created on chain', txContext.data)
            try {
                onCreateFlowStatus?.(CreateSpaceFlowStatus.CreatingSpace)
                const spaceAddress = this.spaceDapp.getSpaceAddress(
                    txContext.receipt,
                    txContext.data.senderAddress,
                )
                if (!spaceAddress) {
                    throw new Error('Space address not found')
                }
                const spaceId = makeSpaceStreamId(spaceAddress)
                const channelId = makeDefaultChannelStreamId(spaceAddress)
                txContext.data.spaceId = spaceId
                txContext.data.channelId = channelId

                const timeTracker = getTimeTracker()
                // wait until the space and channel are minted on-chain
                // before creating the streams
                if (!this.casablancaClient && signerContext) {
                    await this.localStartCasablancaClientWithRetries(
                        signerContext,
                        { spaceId },
                        TimeTrackerEvents.CREATE_SPACE,
                    )
                }

                if (!this.casablancaClient) {
                    throw new Error('casablancaClient not started')
                }
                const endCsbCreateSpace = timeTracker.startMeasurement(
                    TimeTrackerEvents.CREATE_SPACE,
                    'river_create_space',
                )
                const result = await this.casablancaClient.createSpace(spaceId)

                endCsbCreateSpace?.()

                const endCsbWaitForStream = timeTracker.startMeasurement(
                    TimeTrackerEvents.CREATE_SPACE,
                    'river_wait_for_stream',
                )

                onCreateFlowStatus?.(CreateSpaceFlowStatus.CreatingChannel)
                await this.casablancaClient.waitForStream(spaceId)
                this.log('[waitForCreateSpaceTransaction] Space stream created', {
                    result: result,
                    spaceId,
                })

                endCsbWaitForStream?.()

                if (defaultUsernames.length > 0) {
                    const endCsbSetUsername = timeTracker.startMeasurement(
                        TimeTrackerEvents.CREATE_SPACE,
                        'river_set_username',
                    )
                    onCreateFlowStatus?.(CreateSpaceFlowStatus.CreatingUser)
                    // new space, no member, we can just set first username as default
                    await this.casablancaClient.setUsername(spaceId, defaultUsernames[0])
                    endCsbSetUsername?.()
                    this.log('[waitForCreateSpaceTransaction] Set default username', {
                        defaultUsername: defaultUsernames[0],
                        spaceId,
                    })
                }

                const endCsbCreateDefaultChannel = timeTracker.startMeasurement(
                    TimeTrackerEvents.CREATE_SPACE,
                    'river_create_default_channel',
                )
                await this.createSpaceDefaultChannelRoom(spaceId, 'general', channelId)

                endCsbCreateDefaultChannel?.()

                this.log(
                    '[waitForCreateSpaceTransaction] default channel stream created',
                    channelId,
                )
                // emiting the event here, because the web app calls different
                // functions to create a space, and this is the only place
                // that all different functions go through
                this._eventHandlers?.onCreateSpace?.(spaceId)
            } catch (error) {
                addCategoryToError(error, 'river')
                throw error
            }
        }

        logTxnResult('waitForCreateSpaceTransaction', txContext)

        return txContext
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
            createInfo.channelSettings,
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
            roles: [],
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
        return this.baseTransactor.createChannelTransaction(createChannelInfo, signer)
    }

    public async waitForCreateChannelTransaction(
        createChannelInfo: CreateChannelInfo,
        context: ChannelTransactionContext | undefined,
    ): Promise<ChannelTransactionContext> {
        const txnContext = await this.baseTransactor.waitForBlockchainTransaction(context)

        let riverError: Error | undefined = undefined
        if (txnContext.status === TransactionStatus.Success) {
            if (txnContext?.data) {
                const roomId = txnContext.data
                // wait until the channel is minted on-chain
                // before creating the stream
                try {
                    await this.createChannelRoom(createChannelInfo, roomId)
                } catch (error) {
                    console.error('[waitForCreateChannelTransaction] river error', error)
                    riverError = error as Error
                }
                this.log('[waitForCreateChannelTransaction] Channel stream created', roomId)
            }
        }

        if (riverError) {
            txnContext.error = riverError
            txnContext.status = TransactionStatus.Failed
        }

        logTxnResult('waitForCreateChannelTransaction', txnContext)
        return txnContext
    }

    public async updateChannelTransaction(
        updateChannelInfo: UpdateChannelInfo,
        signer: ethers.Signer | undefined,
        transactionType:
            | BlockchainTransactionType.DeleteChannel
            | BlockchainTransactionType.EditChannel = BlockchainTransactionType.EditChannel,
    ): Promise<ChannelUpdateTransactionContext> {
        return this.baseTransactor.updateChannelTransaction(
            updateChannelInfo,
            signer,
            transactionType,
        )
    }

    public async waitForUpdateChannelTransaction(
        context: ChannelUpdateTransactionContext | undefined,
    ): Promise<ChannelUpdateTransactionContext> {
        const txContext = await this.baseTransactor.waitForBlockchainTransaction(context)

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
        // update to updated info if it's defined, otherwise update to the current info
        await this.casablancaClient.updateChannel(
            updateChannelInfo.parentSpaceId,
            updateChannelInfo.channelId,
            '',
            '',
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
        channelId: string | Uint8Array | undefined,
        spaceId: string | Uint8Array | undefined,
        userId: string | undefined,
        chunkCount: number,
        firstChunk?: Uint8Array | undefined,
        firstChunkIv?: Uint8Array | undefined,
        perChunkEncryption?: boolean | undefined,
    ): Promise<{ creationCookie: CreationCookie }> {
        if (!this.casablancaClient) {
            throw new Error("Casablanca client doesn't exist")
        }
        return await this.casablancaClient.createMediaStream(
            channelId,
            spaceId,
            userId,
            chunkCount,
            firstChunk,
            firstChunkIv,
            undefined,
            perChunkEncryption,
        )
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
                const wallets = await this.getLinkedWalletsWithDelegations(user)
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
        let isEntitled = false
        if (channelId && spaceId) {
            isEntitled = await this.spaceDapp.isEntitledToChannel(
                spaceId,
                channelId,
                user,
                permission,
                this.opts.xchainConfig,
            )
        } else if (spaceId) {
            if (permission === Permission.JoinSpace) {
                return await this.isEntitledToJoinSpace(spaceId, user)
            }
            isEntitled = await this.spaceDapp.isEntitledToSpace(spaceId, user, permission)
        } else {
            // TODO: Implement entitlement checks for DMs (channels without a space)
            // https://linear.app/hnt-labs/issue/HNT-3112/implement-entitlement-checks
            isEntitled = true
        }
        // this.debug(
        //     `[isEntitled] is user entitled for channel and space for permission`,
        //     isEntitled,
        //     {
        //         user,
        //         spaceId: spaceId,
        //         channelId: channelId,
        //         permission: permission,
        //     },
        // )
        return isEntitled
    }

    private async isEntitledToJoinSpace(spaceId: string | undefined, rootKey: string) {
        if (!spaceId) {
            throw new Error('spaceId is required for permission JoinSpace')
        }

        const entitledWallet = await this.spaceDapp.getEntitledWalletForJoiningSpace(
            spaceId,
            rootKey,
            this.opts.xchainConfig,
        )

        this.log(`[isEntitledToJoinSpace] is user entitlted for Permission.JoinSpace`, {
            entitledWallet,
            isEntitled: !!entitledWallet,
            spaceId: spaceId,
        })
        return !!entitledWallet
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
        ruleData: IRuleEntitlementV2Base.RuleDataV2Struct,
        signer: ethers.Signer | undefined,
    ): Promise<RoleTransactionContext> {
        return this.baseTransactor.createRoleTransaction(
            spaceNetworkId,
            roleName,
            permissions,
            users,
            ruleData,
            signer,
        )
    }

    public async waitForCreateRoleTransaction(
        context: RoleTransactionContext | undefined,
    ): Promise<RoleTransactionContext> {
        const txResult = await this.baseTransactor.waitForBlockchainTransaction(context)

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
        return this.baseTransactor.addRoleToChannelTransaction(
            spaceNetworkId,
            channelNetworkId,
            roleId,
            signer,
        )
    }

    public async updateSpaceInfoTransaction(
        spaceNetworkId: string,
        name: string,
        uri: string,
        shortDescription: string,
        longDescription: string,
        signer: ethers.Signer | undefined,
    ): Promise<TransactionContext<void>> {
        return this.baseTransactor.updateSpaceInfoTransaction(
            spaceNetworkId,
            name,
            uri,
            shortDescription,
            longDescription,
            signer,
        )
    }

    public async refreshMetadataTransaction(
        spaceNetworkId: string,
        signer: ethers.Signer | undefined,
    ): Promise<TransactionContext<void>> {
        return this.baseTransactor.refreshMetadataTransaction(spaceNetworkId, signer)
    }

    public async editSpaceMembershipTransaction(
        args: Parameters<UserOps['sendEditMembershipSettingsOp']>['0'],
    ): Promise<TransactionContext<void>> {
        return this.baseTransactor.editSpaceMembershipTransaction(args)
    }

    public async waitForEditSpaceMembershipTransaction(
        context: TransactionContext<void> | undefined,
    ): Promise<TransactionContext<void>> {
        const txnContext = await this.baseTransactor.waitForBlockchainTransaction(context)
        logTxnResult('waitForEditSpaceMembershipTransaction', txnContext)
        return txnContext
    }

    public async updateRoleTransaction(
        spaceNetworkId: string,
        roleId: number,
        roleName: string,
        permissions: Permission[],
        users: string[],
        ruleData: IRuleEntitlementV2Base.RuleDataV2Struct,
        signer: ethers.Signer | undefined,
    ): Promise<TransactionContext<void>> {
        return this.baseTransactor.updateRoleTransaction(
            spaceNetworkId,
            roleId,
            roleName,
            permissions,
            users,
            ruleData,
            signer,
        )
    }

    public async setChannelPermissionOverridesTransaction(
        spaceNetworkId: string,
        channelId: string,
        roleId: number,
        permissions: Permission[],
        signer: ethers.Signer | undefined,
    ): Promise<TransactionContext<void>> {
        return this.baseTransactor.setChannelPermissionOverridesTransaction(
            spaceNetworkId,
            channelId,
            roleId,
            permissions,
            signer,
        )
    }

    public async clearChannelPermissionOverridesTransaction(
        spaceNetworkId: string,
        channelId: string,
        roleId: number,
        signer: ethers.Signer | undefined,
    ): Promise<TransactionContext<void>> {
        return this.baseTransactor.clearChannelPermissionOverridesTransaction(
            spaceNetworkId,
            channelId,
            roleId,
            signer,
        )
    }

    public async waitForAddRoleToChannelTransaction(
        context: TransactionContext<void> | undefined,
    ): Promise<TransactionContext<void>> {
        const txnContext = await this.baseTransactor.waitForBlockchainTransaction(context)
        logTxnResult('waitForAddRoleToChannelTransaction', txnContext)
        return txnContext
    }

    public async waitForUpdateSpaceInfoTransaction(
        context: TransactionContext<void> | undefined,
    ): Promise<TransactionContext<void>> {
        const txnContext = await this.baseTransactor.waitForBlockchainTransaction(context)
        logTxnResult('waitForUpdateSpaceInfoTransaction', txnContext)
        return txnContext
    }

    public async waitForUpdateRoleTransaction(
        context: TransactionContext<void> | undefined,
    ): Promise<TransactionContext<void>> {
        const txnContext = await this.baseTransactor.waitForBlockchainTransaction(context)
        logTxnResult('waitForUpdateRoleTransaction', txnContext)
        return txnContext
    }

    public async waitForSetChannelPermissionOverridesTransaction(
        context: TransactionContext<void> | undefined,
    ): Promise<TransactionContext<void>> {
        const txnContext = await this.baseTransactor.waitForBlockchainTransaction(context)
        logTxnResult('waitForSetChannelPermissionOverridesTransaction', txnContext)
        return txnContext
    }

    public async waitForRefreshMetadataTransaction(
        context: TransactionContext<void> | undefined,
    ): Promise<TransactionContext<void>> {
        const txnContext = await this.baseTransactor.waitForBlockchainTransaction(context)
        logTxnResult('waitForRefreshMetadataTransaction', txnContext)
        return txnContext
    }

    public async banTransaction(
        spaceId: string,
        walletAddress: string,
        signer: ethers.Signer,
    ): Promise<BanUnbanWalletTransactionContext> {
        return this.baseTransactor.banTransaction(spaceId, walletAddress, signer)
    }

    public async unbanTransaction(
        spaceId: string,
        walletAddress: string,
        signer: ethers.Signer,
    ): Promise<BanUnbanWalletTransactionContext> {
        return this.baseTransactor.unbanTransaction(spaceId, walletAddress, signer)
    }

    public async waitForBanUnbanTransaction(transactionContext: BanUnbanWalletTransactionContext) {
        const txnContext = await this.baseTransactor.waitForBlockchainTransaction(
            transactionContext,
        )

        if (txnContext.status === TransactionStatus.Success && transactionContext.data?.isBan) {
            try {
                // Remove user from space if ban was successful
                await this.removeUser(
                    transactionContext.data.spaceId,
                    transactionContext.data.userId,
                )
            } catch (error) {
                console.warn(
                    '[waitForBanTransaction] failed to remove user from River streams',
                    error,
                )
            }
        }

        logTxnResult('waitForBanTransaction', txnContext)
        return txnContext
    }

    public async walletAddressIsBanned(spaceId: string, walletAddress: string): Promise<boolean> {
        const wallets = (await this.getLinkedWalletsWithDelegations(walletAddress)).concat(
            walletAddress,
        )
        const promises = wallets.map((walletAddress) => {
            return this.spaceDapp
                .walletAddressIsBanned(spaceId, walletAddress)
                .then((result) => (result === true ? Promise.resolve(true) : Promise.reject(false)))
        })
        try {
            await Promise.any(promises)
            return true
        } catch {
            return false
        }
    }

    public async deleteRoleTransaction(
        spaceNetworkId: string,
        roleId: number,
        signer: ethers.Signer | undefined,
    ): Promise<TransactionContext<void>> {
        return this.baseTransactor.deleteRoleTransaction(spaceNetworkId, roleId, signer)
    }

    public async waitForDeleteRoleTransaction(
        context: TransactionContext<void> | undefined,
    ): Promise<TransactionContext<void>> {
        const txnContext = await this.baseTransactor.waitForBlockchainTransaction(context)
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
        return this.baseTransactor.setSpaceAccess(spaceNetworkId, disabled, signer)
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

    public async joinRiverSpaceAndDefaultChannels(
        spaceId: string,
        signerContext?: SignerContext,
        onJoinFlowStatus?: (update: JoinFlowStatus) => void,
        defaultUsername?: string,
    ) {
        if (!this.casablancaClient && signerContext) {
            await this.localStartCasablancaClientWithRetries(
                signerContext,
                { spaceId },
                TimeTrackerEvents.JOIN_SPACE,
            )
        }
        onJoinFlowStatus?.(JoinFlowStatus.JoiningRoom)
        const endJoinSpace = getTimeTracker().startMeasurement(
            TimeTrackerEvents.JOIN_SPACE,
            'river_joinroom_space',
        )
        const room = await this.joinRoom(spaceId, undefined, {
            skipWaitForMiniblockConfirmation: true,
            skipWaitForUserStreamUpdate: true,
        })
        endJoinSpace?.()
        this.log('[joinTown] room', room)
        // join the default channels
        const spaceContent = this.casablancaClient?.streams.get(spaceId)?.view.spaceContent
        if (spaceContent) {
            // if a default username is provided we can try applying it
            const defaultUsernamePromise = (async () => {
                if (!defaultUsername) {
                    this.log('[joinTown] no default username provided')
                    return
                }
                const isAvailable = await this.getIsUsernameAvailable(spaceId, defaultUsername)
                if (!isAvailable) {
                    this.log('[joinTown] default usename already taken')
                    return
                }
                try {
                    this.log('[joinTown] setting default username')
                    await this.casablancaClient?.setUsername(spaceId, defaultUsername)
                    this.log('[joinTown] default usename set')
                } catch (e) {
                    console.error('[joinTown] fail to set default username', e)
                }
            })()

            await Promise.all([
                defaultUsernamePromise,
                ...Array.from(spaceContent.spaceChannelsMetadata.entries())
                    .filter(([_, value]) => value.isDefault || value.isAutojoin)
                    .map(async ([key]) => {
                        onJoinFlowStatus?.(JoinFlowStatus.JoiningAutojoinChannels)
                        const endJoinChannel = getTimeTracker().startMeasurement(
                            TimeTrackerEvents.JOIN_SPACE,
                            'river_joinroom_channel',
                        )
                        try {
                            await this.joinRoom(key, undefined, {
                                skipWaitForMiniblockConfirmation: true,
                                skipWaitForUserStreamUpdate: true,
                            })
                        } catch (e) {
                            console.error('[joinTown] Failed auto-joining channel', e)
                        }
                        endJoinChannel?.()
                    }),
            ])
        } else {
            this.log('[joinTown] Error no space content found')
        }
        return room
    }

    /************************************************
     * joinTown
     * - mints membership if needed
     * - joins the space
     *************************************************/
    public async joinTown(
        spaceId: string,
        signer: ethers.Signer,
        signerContext?: SignerContext,
        onJoinFlowStatus?: (update: JoinFlowStatus) => void,
        defaultUsername?: string,
    ) {
        if (!this.casablancaClient && !signerContext) {
            throw new Error('Casablanca client not initialized, pass signer context')
        }
        const userId = await signer.getAddress()
        const linkedWallets = await this.getLinkedWalletsWithDelegations(userId)

        // check membership nft first to avoid uncessary mint attempts on rejoins
        try {
            const allPromises = linkedWallets
                .map((wallet) => this.spaceDapp.hasSpaceMembership(spaceId, wallet))
                .concat(this.spaceDapp.hasSpaceMembership(spaceId, userId))
            const results = await Promise.all(allPromises)
            if (results.some((result) => result)) {
                onJoinFlowStatus?.(JoinFlowStatus.AlreadyMember)
                this.log('[joinTown] already have member nft')

                const room = await this.joinRiverSpaceAndDefaultChannels(
                    spaceId,
                    signerContext,
                    onJoinFlowStatus,
                    defaultUsername,
                )
                return room
            }
        } catch (error) {
            // skip if no membership nft found
            if (error instanceof AggregateError) {
                this.log('[joinTown] no membership nft found, proceeding with mint', error)
            }
            // otherwise some other error occurred
            else {
                addCategoryToError(error, 'river')
                throw error
            }
        }

        try {
            this.log('[joinTown] minting membership')
            onJoinFlowStatus?.(JoinFlowStatus.MintingMembership)
            await this.baseTransactor.mintMembershipTransaction({
                spaceId,
                signer,
                xchainConfig: this.opts.xchainConfig,
            })
            this.log('[joinTown] minted membership')
            onJoinFlowStatus?.(JoinFlowStatus.MembershipMinted)
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
                addCategoryToError(error, 'userop')
                throw error
            }
        }

        try {
            const room = await this.joinRiverSpaceAndDefaultChannels(
                spaceId,
                signerContext,
                onJoinFlowStatus,
                defaultUsername,
            )
            return room
        } catch (error) {
            addCategoryToError(error, 'river')
            throw error
        }
    }

    /************************************************
     * pinMessage
     *************************************************/
    public async pinMessage(roomId: string, eventId: string): Promise<void> {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }

        await this.casablancaClient.pin(roomId, eventId)
        this.log('sendUnpin')
    }

    public async unpinMessage(roomId: string, eventId: string): Promise<void> {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }

        await this.casablancaClient.unpin(roomId, eventId)
        this.log('sendPin')
    }

    public async prepayMembershipTransaction(
        spaceId: string,
        supply: number,
        signer: TSigner,
    ): Promise<PrepayMembershipTransactionContext> {
        return this.baseTransactor.prepayMembershipTransaction(spaceId, supply, signer)
    }

    public async waitForPrepayMembershipTransaction(
        context: PrepayMembershipTransactionContext | undefined,
    ): Promise<PrepayMembershipTransactionContext> {
        const txnContext = await this.baseTransactor.waitForBlockchainTransaction(context)
        logTxnResult('waitForPrepayMembershipTransaction', txnContext)
        return txnContext
    }

    /************************************************
     * sendMessage
     *************************************************/
    public async sendMessage(roomId: string, message: string, options?: SendMessageOptions) {
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
                                return create(ChannelMessage_Post_MentionSchema, {
                                    mentionBehavior: {
                                        case: 'atChannel',
                                        value: {},
                                    },
                                })
                            } else {
                                return create(ChannelMessage_Post_MentionSchema, x)
                            }
                        }) ?? []
                    await this.casablancaClient.sendChannelMessage_Text(
                        roomId,
                        {
                            threadId: options?.threadId,
                            threadPreview: options?.threadPreview,
                            replyId: options?.replyId,
                            replyPreview: options?.replyPreview,
                            content: {
                                body: message,
                                mentions,
                                attachments: transformAttachments(options?.attachments),
                            },
                        },
                        {
                            beforeSendEventHook: options?.beforeSendEventHook,
                            onLocalEventAppended: options?.onLocalEventAppended,
                        },
                    )
                }
                break
            case MessageType.Image:
                await this.casablancaClient.sendChannelMessage_Image(
                    roomId,
                    {
                        threadId: options?.threadId,
                        threadPreview: options?.threadPreview,
                        replyId: options?.replyId,
                        replyPreview: options?.replyPreview,
                        content: {
                            title: message,
                            info: options?.info,
                            thumbnail: options?.thumbnail,
                        },
                    },
                    { beforeSendEventHook: options?.beforeSendEventHook },
                )
                break
            case MessageType.GM:
                await this.casablancaClient.sendChannelMessage_GM(
                    roomId,
                    {
                        threadId: options?.threadId,
                        threadPreview: options?.threadPreview,
                        replyId: options?.replyId,
                        replyPreview: options?.replyPreview,
                        content: {
                            typeUrl: message,
                        },
                    },
                    { beforeSendEventHook: options?.beforeSendEventHook },
                )
                break
            default:
                staticAssertNever(options)
        }
        this._eventHandlers?.onSendMessage?.(roomId, message, options)
    }

    public async sendMediaPayload(
        creationCookie: CreationCookie,
        last: boolean,
        data: Uint8Array,
        chunkIndex: number,
        iv?: Uint8Array,
    ): Promise<{ creationCookie: CreationCookie }> {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }
        return await this.casablancaClient.sendMediaPayload(
            creationCookie,
            last,
            data,
            chunkIndex,
            iv,
        )
    }

    /************************************************
     * sendReaction
     *************************************************/
    public async sendReaction(
        roomId: string,
        eventId: string,
        reaction: string,
        _threadId?: string, // todo: aellis we need to send this to be able to deep link to a reaction in a thread
    ): Promise<void> {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }

        const beforeSendEventHooks: Promise<void>[] = []

        const beforeSendEventHook = beforeSendEventHooks.length
            ? Promise.all(beforeSendEventHooks).then(() => undefined)
            : undefined

        await this.casablancaClient.sendChannelMessage_Reaction(
            roomId,
            {
                reaction,
                refEventId: eventId,
            },
            {
                beforeSendEventHook,
            },
        )
        this.log('sendReaction')
    }

    public async sendTokenTransfer(
        chainId: number,
        receipt: ContractReceipt | SolanaTransactionReceipt,
        event: PlainMessage<BlockchainTransaction_TokenTransfer>,
    ): Promise<void> {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }
        await this.casablancaClient.addTransaction_Transfer(chainId, receipt, event)
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
        originalEventContent: ChannelMessageEvent,
        message: string,
        options: SendTextMessageOptions | undefined,
    ) {
        if (!this.casablancaClient) {
            throw new Error('casablanca client is undefined')
        }
        const event = this.casablancaClient.stream(roomId)?.view.events.get(eventId)
        if (!event) {
            throw new Error(`ref event not found: ${eventId}`)
        }
        if (event.remoteEvent?.creatorUserId !== this.casablancaClient.userId) {
            throw new Error(
                `you can only send channelMessageEdit for your own messages: ${eventId} userId: ${this.casablancaClient.userId}`,
            )
        }
        await this.casablancaClient.sendChannelMessage_Edit_Text(roomId, eventId, {
            threadId: originalEventContent.threadId,
            threadPreview: originalEventContent.threadPreview,
            replyId: originalEventContent.replyId,
            replyPreview: originalEventContent.replyPreview,
            content: {
                body: message,
                mentions:
                    options?.mentions?.map((x) => create(ChannelMessage_Post_MentionSchema, x)) ??
                    [],
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
        const event = this.casablancaClient.stream(roomId)?.view.events.get(eventId)
        if (!event) {
            throw new Error(`ref event not found: ${eventId}`)
        }
        if (event.remoteEvent?.creatorUserId !== this.casablancaClient.userId) {
            throw new Error(
                `you can only send channelMessageRedaction for your own messages: ${eventId} userId: ${this.casablancaClient.userId}`,
            )
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
     * getStreamMember
     * - This function is primarily intended for testing purposes
     * **********************************************/
    public getStreamMember(roomId: string, userId: string): TownsStreamMember | undefined {
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

    public async setSpaceImage(
        spaceStreamId: string,
        chunkedMedia: PlainMessage<ChunkedMedia>,
    ): Promise<{
        eventId: string
        error?: AddEventResponse_Error | undefined
    }> {
        if (!this.casablancaClient) {
            throw new Error('No casablanca client')
        }
        const response = await this.casablancaClient.setSpaceImage(spaceStreamId, chunkedMedia)
        return response
    }

    public async setUserProfileImage(chunkedMedia: PlainMessage<ChunkedMedia>): Promise<void> {
        if (!this.casablancaClient) {
            throw new Error('No casablanca client')
        }
        await this.casablancaClient.setUserProfileImage(chunkedMedia)
    }

    public async getUserProfileImage(userId: string): Promise<ChunkedMedia | undefined> {
        if (!this.casablancaClient) {
            throw new Error('No casablanca client')
        }
        return this.casablancaClient.getUserProfileImage(userId)
    }

    public async setUserBio(bio: PlainMessage<UserBio>): Promise<void> {
        if (!this.casablancaClient) {
            throw new Error('No casablanca client')
        }
        await this.casablancaClient.setUserBio(bio)
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

    public async setChannelAutojoin(parentSpaceId: string, roomId: string, autojoin: boolean) {
        if (!this.casablancaClient) {
            throw new Error('casablanca client is undefined')
        }
        await this.casablancaClient.updateChannelAutojoin(parentSpaceId, roomId, autojoin)
    }

    public async setChannelHideUserJoinLeaveEvents(
        parentSpaceId: string,
        roomId: string,
        hideUserJoinLeaveEvents: boolean,
    ) {
        if (!this.casablancaClient) {
            throw new Error('casablanca client is undefined')
        }
        await this.casablancaClient.updateChannelHideUserJoinLeaveEvents(
            parentSpaceId,
            roomId,
            hideUserJoinLeaveEvents,
        )
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

    public async linkEOAToRootKey(
        rootKey: ethers.Signer,
        wallet: ethers.Signer,
    ): Promise<WalletLinkTransactionContext> {
        return this.baseTransactor.linkEOAToRootKey(rootKey, wallet)
    }

    /**
     * Link the caller of the tx to the root key (link smart account)
     */
    public async linkCallerToRootKey(
        rootKey: ethers.Signer,
        wallet?: ethers.Signer,
    ): Promise<WalletLinkTransactionContext> {
        return this.baseTransactor.linkCallerToRootKey(rootKey, wallet)
    }

    public async unlinkViaRootKey(
        rootKey: ethers.Signer,
        walletAddress: string,
    ): Promise<WalletLinkTransactionContext> {
        const result = await this.baseTransactor.unlinkViaRootKey(rootKey, walletAddress)
        this.emit('onWalletUnlinked', await rootKey.getAddress(), walletAddress)
        return result
    }

    public async unlinkViaCaller(caller: ethers.Signer): Promise<WalletLinkTransactionContext> {
        return this.baseTransactor.unlinkViaCaller(caller)
    }

    public async transferAsset(
        transferData: NonNullable<TransferAssetTransactionContext['data']>,
        signer: TSigner,
    ): Promise<TransferAssetTransactionContext | undefined> {
        return this.baseTransactor.transferAsset(transferData, signer)
    }

    public async waitForTransferAssetTransaction(
        transactionContext: TransferAssetTransactionContext,
    ) {
        const txnContext = await this.baseTransactor.waitForBlockchainTransaction(
            transactionContext,
        )
        logTxnResult('waitTransferAssetTransaction', txnContext)
        return txnContext
    }

    public tipTransaction(args: TipParams): Promise<TipTransactionContext | undefined> {
        return this.baseTransactor.tipTransaction(args)
    }

    public async waitForTipTransaction(
        transactionContext: TipTransactionContext,
    ): Promise<TipTransactionContext | undefined> {
        const txnContext = await this.baseTransactor.waitForBlockchainTransaction(
            transactionContext,
            undefined,
            // wait for at least 2 confirmations seems to be reliable enough for river verification
            2,
        )
        logTxnResult('waitTipTransaction', txnContext)
        const receipt = txnContext.receipt
        const chainId = this.spaceDapp?.config.chainId
        if (
            txnContext.status === TransactionStatus.Success &&
            receipt &&
            chainId &&
            txnContext.data
        ) {
            const tipEvent = this.spaceDapp?.getTipEvent(
                txnContext.data.spaceId,
                receipt,
                txnContext.data.senderAddress,
            )
            const toUserId = txnContext.data.receiverUserId

            if (tipEvent) {
                try {
                    await retryOperation(
                        async () => {
                            await this.casablancaClient?.addTransaction_Tip(
                                chainId,
                                receipt,
                                tipEvent,
                                toUserId,
                            )
                        },
                        {
                            onError: (error, retryCount) => {
                                this.log('[waitForTipTransaction::addTransaction_Tip] error', {
                                    error,
                                    retryCount,
                                })
                            },
                            onRetry: (retryCount) => {
                                this.log('[waitForTipTransaction::addTransaction_Tip] retrying', {
                                    retryCount,
                                })
                            },
                        },
                    )
                } catch (error) {
                    console.error('waitForTipTransaction:: Failed to add transaction_tip', error)
                }
            } else {
                console.error('waitForTipTransaction:: No tip event found')
            }
        }

        return txnContext
    }

    public async checkInTransaction(
        signer: TSigner,
    ): Promise<TransactionContext<void> | undefined> {
        return this.baseTransactor.checkInTransaction(signer)
    }

    public async waitForCheckInTransaction(
        transactionContext: TransactionContext<void>,
    ): Promise<TransactionContext<void> | undefined> {
        return this.baseTransactor.waitForBlockchainTransaction(transactionContext)
    }

    public async getLinkedWallets(walletAddress: string): Promise<string[]> {
        return this.baseTransactor.getLinkedWallets(walletAddress)
    }

    public async getLinkedWalletsWithDelegations(walletAddress: string): Promise<string[]> {
        return this.baseTransactor.getLinkedWalletsWithDelegations(walletAddress)
    }

    public async waitWalletLinkTransaction(transactionContext: WalletLinkTransactionContext) {
        const txnContext = await this.baseTransactor.waitForBlockchainTransaction(
            transactionContext,
        )
        logTxnResult('waitWalletLinkTransaction', txnContext)
        return txnContext
    }

    public async getRootKeyFromLinkedWallet(walletAddress: string): Promise<string> {
        return this.baseTransactor.getRootKeyFromLinkedWallet(walletAddress)
    }

    public async sendTokenTransferOperationWithCallData(
        args: {
            value: bigint
            signer: TSigner
        } & ({ callData: string; toAddress: string } | { callData: string[]; toAddress: string[] }),
    ): Promise<TransactionContext<void> | undefined> {
        return this.baseTransactor.sendTokenTransferOperationWithCallData(args)
    }

    public async waitForUserOperationWithCallDataTransaction(
        transactionContext: TransactionContext<void>,
    ): Promise<TransactionContext<void> | undefined> {
        return this.baseTransactor.waitForBlockchainTransaction(transactionContext, undefined, 2)
    }

    public async reviewTransaction(
        args: [TownsReviewParams, TSigner],
    ): Promise<ReviewTransactionContext> {
        return this.baseTransactor.reviewTransaction(args)
    }

    public async waitForReviewTransaction(
        context: ReviewTransactionContext | undefined,
    ): Promise<ReviewTransactionContext> {
        const txnContext = (await this.baseTransactor.waitForBlockchainTransaction(
            context,
            undefined,
            // wait for at least 2 confirmations like in tip transaction
            2,
        )) as ReviewTransactionContext
        logTxnResult('waitForReviewTransaction', txnContext)

        const receipt = txnContext.receipt
        const chainId = this.spaceDapp?.config.chainId

        console.log('waitForReviewTransaction receipt:', receipt)

        if (
            txnContext.status === TransactionStatus.Success &&
            receipt &&
            chainId &&
            txnContext.data?.spaceId
        ) {
            console.log('waitForReviewTransaction::success', {
                status: txnContext.status,
                spaceId: txnContext.data.spaceId,
                receipt: receipt,
            })

            try {
                const reviewEvent = getSpaceReviewEventData(
                    receipt.logs,
                    txnContext.data.senderAddress,
                )
                console.log('waitForReviewTransaction::reviewEvent', reviewEvent)

                if (reviewEvent) {
                    console.log('waitForReviewTransaction::success::reviewEvent', {
                        reviewEvent,
                        spaceId: txnContext.data.spaceId,
                    })

                    await retryOperation(
                        async () => {
                            const client = this.casablancaClient as CasablancaClient
                            await client?.addTransaction_SpaceReview(
                                chainId,
                                receipt,
                                reviewEvent,
                                txnContext.data!.spaceId,
                            )
                        },
                        {
                            maxRetries: 3,
                            onError: (error: unknown, retryCount: number) => {
                                console.error('Error in addTransaction_SpaceReview:', error)
                                this.log('Retrying addTransaction_SpaceReview', { retryCount })
                            },
                            getRetryDelay: () => 1000,
                        },
                    )
                } else {
                    console.error(
                        'waitForReviewTransaction::error: No review event found in receipt',
                    )
                }
            } catch (error) {
                console.error('waitForReviewTransaction::error processing review event:', error)
            }
        } else {
            console.error('waitForReviewTransaction::error: Invalid transaction context', {
                status: txnContext.status,
                hasReceipt: !!receipt,
                hasChainId: !!chainId,
                hasSpaceId: !!txnContext.data?.spaceId,
            })
        }

        return txnContext
    }

    protected log(message: string, ...optionalParams: unknown[]) {
        console.log(message, ...optionalParams)
    }
    protected debug(message: string, ...optionalParams: unknown[]) {
        console.debug(message, ...optionalParams)
    }

    public setEventHandlers(eventHandlers: TownsClientEventHandlers | undefined) {
        this._eventHandlers = eventHandlers
    }

    public onLogin({ userId }: { userId: string }) {
        this._eventHandlers?.onLogin?.({ userId: userId })
    }
}
