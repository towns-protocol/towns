import { BigNumber, ContractReceipt, ContractTransaction, Wallet, ethers } from 'ethers'
import {
    BlockchainTransactionEvent,
    FullyReadMarker,
    RoomMessageEvent,
    ZTEvent,
} from '../types/timeline-types'
import {
    Client as CasablancaClient,
    RiverDbManager,
    bin_fromHexString,
    makeOldTownsDelegateSig,
    makeStreamRpcClient,
    takeKeccakFingerprintInHex,
    userIdFromAddress,
} from '@towns/sdk'
import {
    ChannelTransactionContext,
    ChannelUpdateTransactionContext,
    IZionServerVersions,
    MatrixAuth,
    RoleTransactionContext,
    SpaceProtocol,
    TransactionContext,
    TransactionStatus,
    ZionAccountDataType,
    ZionClientEventHandlers,
    ZionOpts,
    createChannelTransactionContext,
    createChannelUpdateTransactionContext,
    createRoleTransactionContext,
    createTransactionContext,
} from './ZionClientTypes'
import {
    ClientEvent,
    EventType,
    ISendEventResponse,
    MatrixClient,
    MatrixError,
    PendingEventOrdering,
    RelationType,
    Store,
    UserEvent,
    createClient,
} from 'matrix-js-sdk'
import {
    CreateChannelInfo,
    CreateSpaceInfo,
    Membership,
    MessageType,
    PowerLevel,
    PowerLevels,
    Room,
    RoomMember,
    RoomVisibility,
    SendMessageOptions,
    SendTextMessageOptions,
    ThreadIdOptions,
    UpdateChannelInfo,
    User,
} from '../types/zion-types'
import {
    MatrixDecryptionExtension,
    MatrixDecryptionExtensionDelegate,
} from './matrix/MatrixDecryptionExtensions'
import {
    RoomIdentifier,
    makeCasablancaStreamIdentifier,
    makeMatrixRoomIdentifier,
} from '../types/room-identifier'
import { SignerContext } from '@towns/sdk'
import { sendMatrixMessage, sendMatrixNotice } from './matrix/SendMessage'
import { toZionRoom, toZionUser } from '../store/use-matrix-store'

import { CryptoStore } from 'matrix-js-sdk/lib/crypto/store/base'
import { ISpaceDapp } from './web3/ISpaceDapp'
import { MatrixDbManager } from './matrix/MatrixDbManager'
import { Permission } from './web3/ContractTypes'
import { PioneerNFT } from './web3/PioneerNFT'
import { PushNotificationClient } from './PushNotificationClient'
import { RoleIdentifier } from '../types/web3-types'
import { SignerUndefinedError } from '../types/error-types'
import { SpaceDapp } from './web3/SpaceDapp'
import { SpaceFactoryDataTypes } from './web3/shims/SpaceFactoryShim'
import { SpaceInfo } from './web3/SpaceInfo'
import { SyncState } from 'matrix-js-sdk/lib/sync'
import { createCasablancaChannel } from './casablanca/CreateChannel'
import { createCasablancaSpace } from './casablanca/CreateSpace'
import { createMatrixChannel } from './matrix/CreateChannel'
import { createMatrixSpace } from './matrix/CreateSpace'
import { editZionMessage } from './matrix/EditMessage'
import { enrichPowerLevels } from './matrix/PowerLevels'
import { inviteMatrixUser } from './matrix/InviteUser'
import { joinMatrixRoom } from './matrix/Join'
import { loadOlm } from './loadOlm'
import { makeUniqueChannelStreamId } from '@towns/sdk'
import { makeUniqueSpaceStreamId } from '@towns/sdk'
import { setMatrixPowerLevel } from './matrix/SetPowerLevels'
import { staticAssertNever } from '../utils/zion-utils'
import { syncMatrixSpace } from './matrix/SyncSpace'
import { toUtf8String } from 'ethers/lib/utils.js'
import { toZionRoomFromStream } from './casablanca/CasablancaUtils'

/***
 * Zion Client
 * for calls that originate from a roomIdentifier, or for createing new rooms
 * handle toggling between matrix and casablanca
 * the zion client will:
 * - always encrypt
 * - enforce space / channel relationships
 * - get user wallet info
 * - go to the blockchain when creating a space
 * - go to the blockchain when updating power levels
 * - etc
 * the zion client will wrap the underlying matrix and casablanca clients and
 * ensure correct zion protocol business logic
 */

const DEFAULT_INITIAL_SYNC_LIMIT = 20
const DEFAULT_POLL_TIMEOUT = 30 * 1000

export class ZionClient implements MatrixDecryptionExtensionDelegate {
    public readonly opts: ZionOpts
    public readonly name: string
    public spaceDapp: ISpaceDapp
    public pioneerNFT: PioneerNFT
    protected matrixClient?: MatrixClient
    public matrixDecryptionExtension?: MatrixDecryptionExtension
    protected casablancaClient?: CasablancaClient
    private dbManager: MatrixDbManager
    private riverDbManager: RiverDbManager
    private _auth?: MatrixAuth
    private _signerContext?: SignerContext
    protected _eventHandlers?: ZionClientEventHandlers
    private pushNotificationClient?: PushNotificationClient

    constructor(opts: ZionOpts, name?: string) {
        this.opts = opts
        this.name = name || ''
        console.log('~~~ new ZionClient ~~~', this.name, this.opts)
        this.dbManager = new MatrixDbManager()
        this.riverDbManager = new RiverDbManager()
        this.spaceDapp = new SpaceDapp(opts.chainId, opts.web3Provider)
        this.pioneerNFT = new PioneerNFT(opts.chainId, opts.web3Provider)
        this._eventHandlers = opts.eventHandlers
        if (opts.pushNotificationWorkerUrl && opts.pushNotificationAuthToken) {
            this.pushNotificationClient = new PushNotificationClient({
                url: opts.pushNotificationWorkerUrl,
                authToken: opts.pushNotificationAuthToken,
            })
        }
    }

    public get auth(): MatrixAuth | undefined {
        return this._auth
    }

    public get signerContext(): SignerContext | undefined {
        return this._signerContext
    }

    public get chainId(): number {
        return this.opts.chainId
    }

    /************************************************
     * getServerVersions
     *************************************************/
    public async getServerVersions() {
        const matrixClient = ZionClient.createMatrixClient(this.opts)
        const version = await matrixClient.getVersions()
        // TODO casablanca, return server versions
        return version as IZionServerVersions
    }

    /************************************************
     * logout
     *************************************************/
    public async logout(): Promise<void> {
        this.log('logout')
        await this.logoutFromMatrix()
        await this.logoutFromCasablanca()
    }

    /************************************************
     * logoutFromMatrix
     *************************************************/
    public async logoutFromMatrix(): Promise<void> {
        if (!this.auth) {
            return
        }
        this.log('logoutFromMatrix')
        const matrixClient = this.matrixClient
        await this.stopMatrixClient()
        if (matrixClient) {
            try {
                await matrixClient.logout()
            } catch (error) {
                this.log("caught error while trying to logout, but we're going to ignore it", error)
            }
        }

        this._eventHandlers?.onLogout?.({
            userId: this._auth?.userId as string,
        })

        this._auth = undefined
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
    /************************************************
     * signCasablancaDelegate
     * sign the public key of a local wallet
     * that you will use to sign messages to casablanca
     * TODO(HNT-1380): this is not final implementation
     *************************************************/
    public async signCasablancaDelegate(
        delegateWallet: Wallet,
        signer: ethers.Signer | undefined,
    ): Promise<SignerContext> {
        if (!signer) {
            throw new SignerUndefinedError("can't sign without a web3 signer")
        }
        const creatorAddress = bin_fromHexString(await signer.getAddress())
        // TODO: for now let's take 16 bytes of the keccak256 hash of creatorAddress as our device_id,
        // but in the future let's ensure device_id is stable across addresses of the same "device".
        const deviceId = takeKeccakFingerprintInHex(creatorAddress, 16)
        const delegateSig = await makeOldTownsDelegateSig(signer, delegateWallet.publicKey)
        const pk = delegateWallet.privateKey.slice(2)
        const context: SignerContext = {
            signerPrivateKey: () => pk,
            creatorAddress,
            delegateSig,
            deviceId,
        }
        return context
    }

    /************************************************
     * startMatrixClient
     * start the matrix matrixClient, add listeners
     *************************************************/
    public async startMatrixClient(auth: MatrixAuth): Promise<MatrixClient> {
        if (this.auth) {
            throw new Error('already authenticated')
        }
        if (this.matrixClient) {
            throw new Error('matrixClient already running')
        }
        if (!this.opts.web3Provider) {
            throw new Error('web3Provider and web3Signer are required')
        }
        // log startOpts
        this.log('Starting matrixClient')
        // set auth
        this._auth = auth
        // get storage
        const store = await this.dbManager.getDb(auth.userId, auth.deviceId)
        const cryptoStore = this.dbManager.getCryptoDb(auth.userId)
        // new matrixClient
        this.matrixClient = ZionClient.createMatrixClient(this.opts, this._auth, store, cryptoStore)
        // start it up, this begins a sync command
        if (!this.matrixClient.crypto) {
            await loadOlm()
        }
        await this.matrixClient.initCrypto()
        this.matrixDecryptionExtension = new MatrixDecryptionExtension(this.matrixClient, this)
        // disable log...
        this.matrixClient.setGlobalErrorOnUnknownDevices(false)
        // start matrixClient
        await this.matrixClient.startClient({
            pendingEventOrdering: PendingEventOrdering.Chronological,
            initialSyncLimit: this.opts.initialSyncLimit ?? DEFAULT_INITIAL_SYNC_LIMIT,
            pollTimeout: this.opts.pollTimeoutMs ?? DEFAULT_POLL_TIMEOUT,
        })

        // wait for the sync to complete
        const initialSync = new Promise<string>((resolve, reject) => {
            if (!this.matrixClient) {
                throw new Error('matrix client is undefined')
            }
            this.matrixClient.once(
                ClientEvent.Sync,
                (state: SyncState, prevState: unknown, res: unknown) => {
                    if (state === SyncState.Prepared) {
                        resolve(state)
                    } else {
                        this.log('Unhandled sync event:', state, prevState, res)
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
                        reject((res as any).error as MatrixError)
                    }
                },
            )
        })
        await initialSync

        return this.matrixClient
    }

    /************************************************
     * startCasablancaClient
     *************************************************/
    public async startCasablancaClient(context: SignerContext): Promise<CasablancaClient> {
        if (this.casablancaClient) {
            throw new Error('already started casablancaClient')
        }
        if (!this.opts.casablancaServerUrl) {
            throw new Error('casablancaServerUrl is required')
        }
        this._signerContext = context
        const rpcClient = makeStreamRpcClient(this.opts.casablancaServerUrl)
        // get storage
        // todo jterzis 06/15/23: add client store here
        // crypto store
        const userId = userIdFromAddress(context.creatorAddress)
        const cryptoStore = this.riverDbManager.getCryptoDb(userId)
        this.casablancaClient = new CasablancaClient(
            context,
            rpcClient,
            this.opts.logNamespaceFilter,
            cryptoStore,
        )
        this.casablancaClient.setMaxListeners(100)
        // TODO - long-term the app should already know if user exists via cookie
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        try {
            await this.casablancaClient.loadExistingUser()
        } catch (e) {
            console.log('user does not exist, creating new user', (e as Error).message)
            await this.casablancaClient.createNewUser()
        }
        await this.casablancaClient.initCrypto()
        this._eventHandlers?.onRegister?.({
            userId: this.casablancaClient.userId,
        })

        await this.casablancaClient.startSync()

        return this.casablancaClient
    }

    /************************************************
     * stopMatrixClient
     *************************************************/
    public async stopMatrixClient() {
        this.matrixDecryptionExtension?.stop()
        this.matrixDecryptionExtension = undefined
        if (this.matrixClient) {
            await this.matrixClient.store.save(true)
            this.matrixClient.stopClient()
            this.matrixClient.removeAllListeners()
            this.matrixClient = undefined
            this.log('Stopped matrixClient')
        }
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
        await this.stopMatrixClient()
        await this.stopCasablancaClient()
    }

    public async createSpaceTransaction(
        createSpaceInfo: CreateSpaceInfo,
        memberEntitlements: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct,
        everyonePermissions: Permission[],
        signer: ethers.Signer | undefined,
    ): Promise<TransactionContext<RoomIdentifier>> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        if (!createSpaceInfo.spaceProtocol) {
            createSpaceInfo.spaceProtocol = this.opts.primaryProtocol
        }
        switch (createSpaceInfo.spaceProtocol) {
            case SpaceProtocol.Casablanca:
                return this.createCasablancaSpaceTransaction(
                    createSpaceInfo,
                    memberEntitlements,
                    everyonePermissions,
                    signer,
                )
            case SpaceProtocol.Matrix:
                return this.createMatrixSpaceTransaction(
                    createSpaceInfo,
                    memberEntitlements,
                    everyonePermissions,
                    signer,
                )
            default:
                staticAssertNever(createSpaceInfo.spaceProtocol)
        }
    }

    public async waitForCreateSpaceTransaction(
        context: TransactionContext<RoomIdentifier> | undefined,
    ): Promise<TransactionContext<RoomIdentifier>> {
        if (!context?.transaction) {
            console.error('[waitForCreateRoleTransaction] transaction is undefined')
            return createTransactionContext({
                status: TransactionStatus.Failed,
                error: new Error('transaction is undefined'),
            })
        }

        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let roomId: RoomIdentifier | undefined = undefined
        let error: Error | undefined = undefined
        try {
            transaction = context.transaction
            roomId = context.data
            receipt = await context.transaction.wait()
        } catch (err) {
            console.error('[waitForCreateSpaceTransaction] error', err)
            error = await this.onErrorLeaveSpaceRoomAndDecodeError(roomId, err)
        }

        if (receipt?.status === 1) {
            console.log('[waitForCreateSpaceTransaction] success', roomId)
            if (roomId) {
                // emiting the event here, because the web app calls different
                // functions to create a space, and this is the only place
                // that all different functions go through
                this._eventHandlers?.onCreateSpace?.(roomId)
            }
            return createTransactionContext<RoomIdentifier>({
                status: TransactionStatus.Success,
                data: roomId,
                transaction,
                receipt,
            })
        }

        // got here without success
        if (!error) {
            error = await this.onErrorLeaveSpaceRoomAndDecodeError(
                roomId,
                new Error('Failed to create space'),
            )
        }
        console.error('[waitForCreateSpaceTransaction] failed', error)
        return createTransactionContext<RoomIdentifier>({
            status: TransactionStatus.Failed,
            transaction,
            receipt,
            error,
        })
    }

    /************************************************
     * createSpace
     *************************************************/
    public async createSpaceRoom(
        createSpaceInfo: CreateSpaceInfo,
        networkId?: string,
    ): Promise<RoomIdentifier> {
        if (!createSpaceInfo.spaceProtocol) {
            createSpaceInfo.spaceProtocol = this.opts.primaryProtocol
        }
        switch (createSpaceInfo.spaceProtocol) {
            case SpaceProtocol.Matrix:
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                return createMatrixSpace(this.matrixClient, createSpaceInfo)
            case SpaceProtocol.Casablanca:
                if (!this.casablancaClient) {
                    throw new Error("Casablanca client doesn't exist")
                }
                return createCasablancaSpace(this.casablancaClient, createSpaceInfo, networkId)
            default:
                staticAssertNever(createSpaceInfo.spaceProtocol)
        }
    }

    private async createCasablancaSpaceTransaction(
        createSpaceInfo: CreateSpaceInfo,
        memberEntitlements: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct,
        everyonePermissions: Permission[],
        signer: ethers.Signer,
    ): Promise<TransactionContext<RoomIdentifier>> {
        const spaceId: RoomIdentifier = makeCasablancaStreamIdentifier(makeUniqueSpaceStreamId())
        const channelId: RoomIdentifier = makeCasablancaStreamIdentifier(
            makeUniqueChannelStreamId(),
        )

        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined

        try {
            transaction = await this.spaceDapp.createSpace(
                {
                    spaceId: spaceId.networkId,
                    spaceName: createSpaceInfo.name,
                    spaceMetadata: '', // unused
                    channelId: channelId.networkId,
                    channelName: createSpaceInfo.defaultChannelName ?? 'general', // default channel name
                    memberEntitlements,
                    everyonePermissions,
                },
                signer,
            )

            console.log(`[createCasablancaSpaceTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            console.error('[createCasablancaSpaceTransaction] error', err)
            error = await this.onErrorLeaveSpaceRoomAndDecodeError(spaceId, err)
        }

        await this.createSpaceRoom(createSpaceInfo, spaceId.networkId)
        console.log('[createCasablancaSpaceTransaction] Space created', spaceId)

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: transaction ? spaceId : undefined,
            error,
        }
    }

    private async createMatrixSpaceTransaction(
        createSpaceInfo: CreateSpaceInfo,
        memberEntitlements: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct,
        everyonePermissions: Permission[],
        signer: ethers.Signer,
    ): Promise<TransactionContext<RoomIdentifier>> {
        let transaction: ContractTransaction | undefined
        let error: Error | undefined
        let spaceId: RoomIdentifier | undefined = undefined
        let channelId: RoomIdentifier | undefined = undefined

        // create matrix space
        spaceId = await this.createSpaceRoom(createSpaceInfo)
        if (!spaceId) {
            console.error('[createMatrixSpaceTransaction] Space creation failed')
            return {
                transaction: undefined,
                receipt: undefined,
                status: TransactionStatus.Failed,
                data: undefined,
                error: new Error('Matrix Space creation failed'),
            }
        }
        console.log('[createMatrixSpaceTransaction] Space created', spaceId)

        try {
            channelId = await this.createSpaceDefaultChannelRoom(spaceId)
            console.log('[createMatrixSpaceTransaction] default channel created', channelId)
        } catch (error) {
            console.error('[createMatrixSpaceTransaction] default channel creation failed', error)
            // leave the parent space if the channel creation failed
            await this.leave(spaceId)
        }

        if (!channelId) {
            return {
                transaction: undefined,
                receipt: undefined,
                status: TransactionStatus.Failed,
                data: undefined,
                error: new Error('Matrix default channel creation failed'),
            }
        }

        // create space transaction
        try {
            transaction = await this.spaceDapp.createSpace(
                {
                    spaceId: spaceId.networkId,
                    spaceName: createSpaceInfo.name,
                    spaceMetadata: '', // unused
                    channelId: channelId.networkId,
                    channelName: createSpaceInfo.defaultChannelName ?? 'general', // default channel name
                    memberEntitlements,
                    everyonePermissions,
                },
                signer,
            )
            console.log(`[createMatrixSpaceTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            console.error('[createMatrixSpaceTransaction] error', err)
            error = await this.onErrorLeaveSpaceRoomAndDecodeError(spaceId, err)
        }

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: transaction ? spaceId : undefined,
            error,
        }
    }

    /************************************************
     * createChannelRoom
     *************************************************/
    public async createChannelRoom(
        createInfo: CreateChannelInfo,
        networkId?: string,
    ): Promise<RoomIdentifier> {
        switch (createInfo.parentSpaceId.protocol) {
            case SpaceProtocol.Matrix: {
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                const roomId = await createMatrixChannel(this.matrixClient, createInfo)
                // a channel creator always joins the channel, so we set the membership status
                await this.setChannelMembershipDataOnSpace({
                    spaceId: createInfo.parentSpaceId,
                    channelNetworkId: roomId.networkId,
                    membershipStatus: Membership.Join,
                })
                return roomId
            }
            case SpaceProtocol.Casablanca:
                if (!this.casablancaClient) {
                    throw new Error("createChannel: Casablanca client doesn't exist")
                }
                if (networkId === undefined) {
                    throw new Error('createChannel: networkId is undefined')
                }
                return createCasablancaChannel(
                    this.casablancaClient,
                    createInfo.parentSpaceId,
                    createInfo.name,
                    createInfo.topic ? createInfo.topic : '',
                    networkId,
                )
            default:
                staticAssertNever(createInfo.parentSpaceId)
        }
    }

    private async createSpaceDefaultChannelRoom(
        parentSpaceId: RoomIdentifier,
        channelName?: string,
    ): Promise<RoomIdentifier> {
        const channelInfo: CreateChannelInfo = {
            name: channelName ?? 'general',
            visibility: RoomVisibility.Public,
            parentSpaceId,
            roleIds: [],
        }
        return await this.createChannelRoom(channelInfo)
    }

    private async createCasablancaChannelTransaction(
        createChannelInfo: CreateChannelInfo,
        signer: ethers.Signer,
    ): Promise<ChannelTransactionContext> {
        let roomId: RoomIdentifier = makeCasablancaStreamIdentifier(makeUniqueChannelStreamId())

        console.log('[createChannelTransaction] Channel created', roomId)

        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined

        try {
            transaction = await this.spaceDapp.createChannel(
                createChannelInfo.parentSpaceId.networkId,
                createChannelInfo.name,
                roomId.networkId,
                createChannelInfo.roleIds,
                signer,
            )
            console.log(`[createChannelTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            console.error('[createChannelTransaction] error', err)
            error = await this.onErrorLeaveChannelRoomAndDecodeError(
                createChannelInfo.parentSpaceId.networkId,
                undefined,
                err,
            )
        }

        try {
            roomId = await this.createChannelRoom(createChannelInfo, roomId.networkId)
        } catch (error) {
            const _error = new Error('createChannel failed')
            _error.name = (error as Error).name ?? 'Error'
            console.error(_error)
            return {
                transaction: undefined,
                receipt: undefined,
                status: TransactionStatus.Failed,
                data: undefined,
                parentSpaceId: undefined,
                error: _error,
            }
        }

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            parentSpaceId: createChannelInfo.parentSpaceId.networkId,
            data: transaction ? roomId : undefined,
            error,
        }
    }

    private async createMatrixChannelTransaction(
        createChannelInfo: CreateChannelInfo,
        signer: ethers.Signer,
    ): Promise<ChannelTransactionContext> {
        let roomId: RoomIdentifier | undefined
        try {
            roomId = await this.createChannelRoom(createChannelInfo, undefined)
        } catch (error) {
            const _error = new Error('createChannel failed')
            _error.name = (error as Error).name ?? 'Error'
            console.error(_error)
            return {
                transaction: undefined,
                receipt: undefined,
                status: TransactionStatus.Failed,
                data: undefined,
                parentSpaceId: undefined,
                error: _error,
            }
        }

        console.log('[createMatrixChannelTransaction] Channel created', roomId)

        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined

        try {
            transaction = await this.spaceDapp.createChannel(
                createChannelInfo.parentSpaceId.networkId,
                createChannelInfo.name,
                roomId.networkId,
                createChannelInfo.roleIds,
                signer,
            )
            console.log(`[createMatrixChannelTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            console.error('[createMatrixChannelTransaction] error', err)
            error = await this.onErrorLeaveChannelRoomAndDecodeError(
                createChannelInfo.parentSpaceId.networkId,
                roomId,
                err,
            )
        }

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            parentSpaceId: createChannelInfo.parentSpaceId.networkId,
            data: transaction ? roomId : undefined,
            error,
        }
    }

    /************************************************
     * createChannel
     *************************************************/
    public async createChannel(
        createChannelInfo: CreateChannelInfo,
        signer: ethers.Signer | undefined,
    ): Promise<RoomIdentifier | undefined> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        const txContext = await this.createChannelTransaction(createChannelInfo, signer)
        if (txContext.error) {
            throw txContext.error
        }
        if (txContext.status === TransactionStatus.Pending) {
            const rxContext = await this.waitForCreateChannelTransaction(txContext)
            return rxContext?.data
        }
        // Something went wrong. Don't return a room identifier.
        return undefined
    }

    public async createChannelTransaction(
        createChannelInfo: CreateChannelInfo,
        signer: ethers.Signer | undefined,
    ): Promise<ChannelTransactionContext> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        switch (createChannelInfo.parentSpaceId.protocol) {
            case SpaceProtocol.Matrix:
                return this.createMatrixChannelTransaction(createChannelInfo, signer)
            case SpaceProtocol.Casablanca:
                return this.createCasablancaChannelTransaction(createChannelInfo, signer)
            default:
                staticAssertNever(createChannelInfo.parentSpaceId)
        }
    }

    public async waitForCreateChannelTransaction(
        context: ChannelTransactionContext | undefined,
    ): Promise<ChannelTransactionContext> {
        if (!context?.transaction) {
            console.error('[waitForCreateRoleTransaction] transaction is undefined')
            return createChannelTransactionContext({
                status: TransactionStatus.Failed,
                error: new Error('[waitForCreateChannelTransaction] transaction is undefined'),
            })
        }

        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let roomId: RoomIdentifier | undefined = undefined
        let error: Error | undefined = undefined
        try {
            transaction = context.transaction
            roomId = context.data
            // provider.waitForTransaction resolves more quickly than transaction.wait(), why?
            receipt = await this.opts.web3Provider?.waitForTransaction(transaction.hash)
            if (receipt?.status === 1) {
                console.log('[waitForCreateChannelTransaction] success', roomId)
                return createChannelTransactionContext({
                    status: TransactionStatus.Success,
                    data: roomId,
                    transaction,
                    receipt,
                })
            } else if (receipt?.status === 0) {
                await this.throwTransactionError(receipt)
            } else {
                throw new Error('Failed to create channel')
            }
        } catch (err) {
            console.error('[waitForCreateChannelTransaction]', err)
            error = await this.onErrorLeaveChannelRoomAndDecodeError(
                context?.parentSpaceId,
                roomId,
                err,
            )
        }
        return createChannelTransactionContext({
            status: TransactionStatus.Failed,
            transaction,
            receipt,
            error,
        })
    }

    public async updateChannelTransaction(
        updateChannelInfo: UpdateChannelInfo,
        signer: ethers.Signer | undefined,
    ): Promise<ChannelUpdateTransactionContext> {
        const hasOffChainUpdate = !updateChannelInfo.updatedChannelTopic
        if (!signer) {
            const _error = new Error('signer is undefined')
            console.error('[updateChannelTransaction]', _error)
            return createChannelUpdateTransactionContext({
                status: TransactionStatus.Failed,
                hasOffChainUpdate: hasOffChainUpdate,
                error: _error,
            })
        }

        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined
        try {
            if (updateChannelInfo.updatedChannelName && updateChannelInfo.updatedRoleIds) {
                transaction = await this.spaceDapp.updateChannel(
                    {
                        spaceId: updateChannelInfo.parentSpaceId.networkId,
                        channelId: updateChannelInfo.channelId.networkId,
                        channelName: updateChannelInfo.updatedChannelName,
                        roleIds: updateChannelInfo.updatedRoleIds,
                    },
                    signer,
                )
                console.log(`[updateChannelTransaction] transaction created` /*, transaction*/)
            } else {
                // this is a matrix/casablanca off chain state update
            }
        } catch (err) {
            console.error('[updateChannelTransaction]', err)
            error = await this.spaceDapp.parseSpaceError(
                updateChannelInfo.parentSpaceId.networkId,
                err,
            )
        }
        return createChannelUpdateTransactionContext({
            transaction,
            hasOffChainUpdate,
            status:
                // no error, AND either if it has a transaction, or an offchain update
                !error && (transaction || hasOffChainUpdate)
                    ? TransactionStatus.Pending
                    : TransactionStatus.Failed,
            data: updateChannelInfo,
            error,
        })
    }

    public async waitForUpdateChannelTransaction(
        context: ChannelUpdateTransactionContext | undefined,
    ): Promise<ChannelUpdateTransactionContext> {
        if (!context?.transaction) {
            console.error('[waitForUpdateChannelTransaction] transaction is undefined')
            return createChannelUpdateTransactionContext({
                status: TransactionStatus.Failed,
                hasOffChainUpdate: context?.hasOffChainUpdate ?? false,
                error: new Error('[waitForUpdateChannelTransaction] transaction is undefined'),
            })
        }

        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let error: Error | undefined = undefined
        try {
            transaction = context.transaction
            receipt = await this.opts.web3Provider?.waitForTransaction(transaction.hash)
            console.log(
                '[waitForUpdateChannelTransaction] transaction signed successfully',
                receipt,
            )
            if (receipt?.status === 1) {
                // transaction is successful
                // if there is an offchain room update, then update the room
                // if there is no offchain room update, then do nothing
                const doOffChainUpdate = receipt?.status === 1 || context?.hasOffChainUpdate
                if (doOffChainUpdate && context?.data) {
                    await this.updateChannelRoom(context.data)
                    console.log('[waitForUpdateChannelTransaction] success')
                }
                return createChannelUpdateTransactionContext({
                    status: TransactionStatus.Success,
                    data: context.data,
                    hasOffChainUpdate: context.hasOffChainUpdate,
                    transaction,
                    receipt,
                    error,
                })
            } else if (receipt?.status === 0) {
                // transaction failed
                await this.throwTransactionError(receipt)
            } else {
                // receipt.status is undefined
                throw new Error('Failed to update channel')
            }
        } catch (err) {
            console.error('[waitForUpdateChannelTransaction]', err)
            if (err instanceof Error) {
                error = err
            } else {
                error = new Error(`update channel failed: ${JSON.stringify(err)}`)
            }
        }
        // got here without success
        return createChannelUpdateTransactionContext({
            status: TransactionStatus.Failed,
            hasOffChainUpdate: context?.hasOffChainUpdate ?? false,
            transaction,
            receipt,
            error,
        })
    }

    public async updateChannelRoom(updateChannelInfo: UpdateChannelInfo): Promise<void> {
        switch (updateChannelInfo.channelId.protocol) {
            case SpaceProtocol.Matrix:
                {
                    const matrixUpdates: Promise<ISendEventResponse>[] = []
                    if (!this.matrixClient) {
                        throw new Error('matrix client is undefined')
                    }
                    // update the matrix room
                    if (updateChannelInfo.updatedChannelName) {
                        matrixUpdates.push(
                            this.matrixClient.setRoomName(
                                updateChannelInfo.channelId.networkId,
                                updateChannelInfo.updatedChannelName,
                            ),
                        )
                    }
                    // update the channel topic
                    if (updateChannelInfo.updatedChannelTopic) {
                        matrixUpdates.push(
                            this.matrixClient.setRoomTopic(
                                updateChannelInfo.channelId.networkId,
                                updateChannelInfo.updatedChannelTopic,
                            ),
                        )
                    }
                    // wait for any updates to complete
                    if (matrixUpdates.length > 0) {
                        await Promise.all(matrixUpdates)
                    }
                }
                break
            case SpaceProtocol.Casablanca:
                throw new Error('Casablanca not supported yet')
            default:
                staticAssertNever(updateChannelInfo.channelId)
        }
    }

    /************************************************
     * isEntitled
     *************************************************/
    public async isEntitled(
        spaceId: string,
        channelId: string | undefined,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        let isEntitled = false
        if (channelId) {
            isEntitled = await this.spaceDapp.isEntitledToChannel(
                spaceId,
                channelId,
                user,
                permission,
            )
        } else {
            isEntitled = await this.spaceDapp.isEntitledToSpace(spaceId, user, permission)
        }
        console.log(
            '[isEntitled] is user entitlted for channel and space for permission',
            isEntitled,
            {
                user: user,
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
        tokens: SpaceFactoryDataTypes.ExternalTokenStruct[],
        users: string[],
        signer: ethers.Signer | undefined,
    ): Promise<RoleTransactionContext> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined
        try {
            transaction = await this.spaceDapp.createRole(
                spaceNetworkId,
                roleName,
                permissions,
                tokens,
                users,
                signer,
            )
            console.log(`[createRoleTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            console.error('[createRoleTransaction] error', err)
            error = await this.spaceDapp.parseSpaceError(spaceNetworkId, err)
        }

        return {
            transaction,
            spaceNetworkId,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: undefined,
            error,
        }
    }

    public async waitForCreateRoleTransaction(
        context: RoleTransactionContext | undefined,
    ): Promise<RoleTransactionContext> {
        if (!context?.transaction) {
            console.error('[waitForCreateRoleTransaction] transaction is undefined')
            return createRoleTransactionContext({
                status: TransactionStatus.Failed,
                error: new Error('[waitForCreateRoleTransaction] transaction is undefined'),
            })
        }

        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let error: Error | undefined = undefined
        try {
            transaction = context.transaction
            receipt = await this.opts.web3Provider?.waitForTransaction(transaction.hash)
            if (receipt?.status === 1 && context?.spaceNetworkId) {
                // Successfully created the role on-chain.
                console.log('[waitForCreateRoleTransaction] success', receipt.logs[0].topics[2])
                const roleId = BigNumber.from(receipt.logs[0].topics[2]).toNumber()
                // John: how can we best decode this 32 byte hex string to a human readable string ?
                const roleName = receipt?.logs[0].topics[1]
                const roleIdentifier: RoleIdentifier = {
                    roleId,
                    name: roleName,
                    spaceNetworkId: context.spaceNetworkId,
                }
                return createRoleTransactionContext({
                    status: TransactionStatus.Success,
                    data: roleIdentifier,
                    transaction,
                    receipt,
                })
            } else if (receipt?.status === 0) {
                await this.throwTransactionError(receipt)
            } else {
                // receipt.status is undefined
                throw new Error('Failed to create role')
            }
        } catch (err) {
            console.error('[waitForCreateRoleTransaction] error', err)
            if (err instanceof Error) {
                error = err
            } else {
                error = new Error(`create role failed: ${JSON.stringify(err)}`)
            }
        }
        // got here without success
        return createRoleTransactionContext({
            status: TransactionStatus.Failed,
            transaction,
            receipt,
            error,
        })
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
        // check that entitlement address exists
        const space = await this.spaceDapp.getSpace(spaceNetworkId)
        if (!space?.read || !space?.write) {
            throw new Error(`Space with networkId "${spaceNetworkId}" is not found.`)
        }
        console.log('[addRoleToChannelTransaction] space', {
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
            console.log(`[addRoleToChannelTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            console.error('[addRoleToChannelTransaction] error', err)
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

    public async updateRoleTransaction(
        spaceNetworkId: string,
        roleId: number,
        roleName: string,
        permissions: Permission[],
        tokens: SpaceFactoryDataTypes.ExternalTokenStruct[],
        users: string[],
        signer: ethers.Signer | undefined,
    ): Promise<TransactionContext<void>> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined
        try {
            transaction = await this.spaceDapp.updateRole(
                {
                    spaceNetworkId,
                    roleId,
                    roleName,
                    permissions,
                    tokens,
                    users,
                },
                signer,
            )
            console.log(`[updateRoleTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            console.error('[updateRoleTransaction] error', err)
            error = await this.spaceDapp.parseSpaceError(spaceNetworkId, err)
        }

        return createTransactionContext({
            transaction,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            error,
        })
    }

    public async waitForAddRoleToChannelTransaction(
        context: TransactionContext<void> | undefined,
    ): Promise<TransactionContext<void>> {
        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let error: Error | undefined = undefined

        try {
            if (!context?.transaction) {
                throw new Error('[waitForAddRoleToChannelTransaction] transaction is undefined')
            }
            transaction = context.transaction
            receipt = await this.opts.web3Provider?.waitForTransaction(transaction.hash)
            if (receipt?.status === 0) {
                await this.throwTransactionError(receipt)
            }
            console.log('[waitForAddRoleToChannelTransaction] transaction completed' /*, receipt */)
        } catch (err) {
            console.error('[waitForAddRoleToChannelTransaction] error', err)
            if (err instanceof Error) {
                error = err
            } else {
                error = new Error('add role to channel failed with an unknown error')
            }
        }

        if (receipt?.status === 1) {
            console.log('[waitForAddRoleToChannelTransaction] success')
            return {
                data: undefined,
                status: TransactionStatus.Success,
                transaction,
                receipt,
            }
        }

        return {
            data: undefined,
            status: TransactionStatus.Failed,
            transaction,
            receipt,
            error,
        }
    }

    public async waitForUpdateRoleTransaction(
        context: TransactionContext<void> | undefined,
    ): Promise<TransactionContext<void>> {
        if (!context?.transaction) {
            console.error('[waitForUpdateRoleTransaction] transaction is undefined')
            return createTransactionContext({
                status: TransactionStatus.Failed,
                error: new Error('[waitForUpdateRoleTransaction] transaction is undefined'),
            })
        }

        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let error: Error | undefined = undefined

        try {
            transaction = context.transaction
            receipt = await this.opts.web3Provider?.waitForTransaction(transaction.hash)
            if (receipt?.status === 1) {
                // Successfully updated the role on-chain.
                console.log('[waitForUpdateRoleTransaction] success')
                return createTransactionContext({
                    status: TransactionStatus.Success,
                    transaction,
                    receipt,
                })
            } else if (receipt?.status === 0) {
                await this.throwTransactionError(receipt)
            } else {
                // receipt.status is undefined
                throw new Error('Failed to update role')
            }
        } catch (err) {
            console.error('[waitForUpdateRoleTransaction] error', err)
            if (err instanceof Error) {
                error = err
            } else {
                error = new Error(`update role failed: ${JSON.stringify(err)}`)
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

    public async deleteRoleTransaction(
        spaceNetworkId: string,
        roleId: number,
        signer: ethers.Signer | undefined,
    ): Promise<TransactionContext<void>> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined
        try {
            transaction = await this.spaceDapp.deleteRole(spaceNetworkId, roleId, signer)
            console.log(`[deleteRoleTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            console.error('[deleteRoleTransaction] error', err)
            error = await this.spaceDapp.parseSpaceError(spaceNetworkId, err)
        }

        return createTransactionContext({
            transaction,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            error,
        })
    }

    public async waitForDeleteRoleTransaction(
        context: TransactionContext<void> | undefined,
    ): Promise<TransactionContext<void>> {
        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let error: Error | undefined = undefined

        try {
            if (!context?.transaction) {
                throw new Error('[waitForDeleteRoleTransaction] transaction is undefined')
            }
            transaction = context.transaction
            receipt = await this.opts.web3Provider?.waitForTransaction(transaction.hash)
            if (receipt?.status === 0) {
                await this.throwTransactionError(receipt)
            }
            console.log(
                '[waitForDeleteRoleTransaction] deleteRole transaction completed' /*, receipt */,
            )
        } catch (err) {
            console.error('[waitForDeleteRoleTransaction] error', err)
            if (err instanceof Error) {
                error = err
            } else {
                error = new Error(`delete role failed: ${JSON.stringify(err)}`)
            }
            console.error('[waitForDeleteRoleTransaction] failed', error)
        }

        if (receipt?.status === 1) {
            // Successfully updated the role on-chain.
            console.log('[waitForDeleteRoleTransaction] success')
            return {
                data: undefined,
                status: TransactionStatus.Success,
                transaction,
                receipt,
            }
        }

        // got here without success
        return {
            data: undefined,
            status: TransactionStatus.Failed,
            transaction,
            receipt,
            error,
        }
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
                console.log('[setSpaceAccess] successful')
                success = true
            } else {
                console.error('[setSpaceAccess] failed')
            }
        }
        return success
    }

    /************************************************
     * inviteUser
     *************************************************/
    public async inviteUser(roomId: RoomIdentifier, userId: string) {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix:
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                await inviteMatrixUser({
                    matrixClient: this.matrixClient,
                    userId,
                    roomId,
                })
                return
            case SpaceProtocol.Casablanca:
                if (!this.casablancaClient) {
                    throw new Error('Casablanca client not initialized')
                }
                await this.casablancaClient.inviteUser(roomId.networkId, userId)
                return
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * leave
     * ************************************************/
    public async leave(roomId: RoomIdentifier, parentNetworkId?: string): Promise<void> {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix: {
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                await this.matrixClient.leave(roomId.networkId)

                const spaceId = parentNetworkId ? makeMatrixRoomIdentifier(parentNetworkId) : roomId
                const channelNetworkId = parentNetworkId ? roomId.networkId : undefined
                await this.setChannelMembershipDataOnSpace({
                    spaceId,
                    channelNetworkId,
                    membershipStatus: Membership.Leave,
                })
                break
            }
            case SpaceProtocol.Casablanca:
                if (!this.casablancaClient) {
                    throw new Error('Casablanca client not initialized')
                }
                await this.casablancaClient.leaveStream(roomId.networkId)
                break
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * joinRoom
     * at the time of writing, both spaces and channels are
     * identified by a room id, this function handls joining both
     *************************************************/
    public async joinRoom(roomId: RoomIdentifier, parentNetworkId?: string) {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix: {
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                const matrixRoom = await joinMatrixRoom({
                    matrixClient: this.matrixClient,
                    roomId,
                    parentNetworkId,
                })
                const zionRoom = toZionRoom(matrixRoom)

                if (!parentNetworkId && !matrixRoom.isSpaceRoom()) {
                    const parentEvents = matrixRoom.currentState.getStateEvents(
                        EventType.SpaceParent,
                    )
                    if (parentEvents.length > 0) {
                        parentNetworkId = parentEvents[0].getStateKey()
                    } else {
                        console.error('no parent event found')
                    }
                }
                const spaceId = parentNetworkId ? makeMatrixRoomIdentifier(parentNetworkId) : roomId
                const channelNetworkId = parentNetworkId ? roomId.networkId : undefined

                await this.setChannelMembershipDataOnSpace({
                    spaceId,
                    channelNetworkId,
                    membershipStatus: Membership.Join,
                })

                // hack to force immediate sync of room state for tests
                this._eventHandlers?.onJoinRoom?.(zionRoom.id, spaceId)
                return zionRoom
            }
            case SpaceProtocol.Casablanca: {
                // TODO: not doing event handlers here since Casablanca is not part of alpha
                if (!this.casablancaClient) {
                    throw new Error('Casablanca client not initialized')
                }
                await this.casablancaClient.joinStream(roomId.networkId)
                const stream = await this.casablancaClient.waitForStream(roomId.networkId)
                let parentId = roomId
                if (stream.view.parentSpaceId) {
                    parentId = makeCasablancaStreamIdentifier(stream.view.parentSpaceId)
                }
                this._eventHandlers?.onJoinRoom?.(roomId, parentId)
                return toZionRoomFromStream(stream, this.casablancaClient.userId)
            }
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * sendStateEvent
     *************************************************/
    public async sendStateEvent(
        spaceId: RoomIdentifier,
        eventType: ZTEvent,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: any,
        stateKey: string,
    ) {
        switch (spaceId.protocol) {
            case SpaceProtocol.Matrix:
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                // todo need to figure something out for casablanca
                await this.matrixClient.sendStateEvent(
                    spaceId.networkId,
                    eventType,
                    content,
                    stateKey, // need unique state_key
                )
                break
            case SpaceProtocol.Casablanca:
                console.error('sendStateEvent not implemented for Casablanca')
                break
        }
    }

    /************************************************
     * sendMessage
     *************************************************/
    public async sendMessage(
        roomId: RoomIdentifier,
        message: string,
        options?: SendMessageOptions,
    ) {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix:
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                await sendMatrixMessage(this.matrixClient, roomId, message, options)

                this._eventHandlers?.onSendMessage?.(roomId, message, options)
                break
            case SpaceProtocol.Casablanca:
                {
                    if (!this.casablancaClient) {
                        throw new Error('Casablanca client not initialized')
                    }
                    switch (options?.messageType) {
                        case undefined:
                        case MessageType.Text:
                            {
                                await this.casablancaClient.sendChannelMessage_Text(
                                    roomId.networkId,
                                    {
                                        threadId: options?.threadId,
                                        threadPreview: options?.threadPreview,
                                        content: {
                                            body: message,
                                            mentions: options?.mentions ?? [],
                                        },
                                    },
                                )
                            }
                            break
                        case MessageType.Image:
                            await this.casablancaClient.sendChannelMessage_Image(roomId.networkId, {
                                threadId: options?.threadId,
                                threadPreview: options?.threadPreview,
                                content: {
                                    title: message,
                                    info: options?.info,
                                    thumbnail: options?.thumbnail,
                                },
                            })
                            break
                        case MessageType.GM:
                            await this.casablancaClient.sendChannelMessage_GM(roomId.networkId, {
                                threadId: options?.threadId,
                                threadPreview: options?.threadPreview,
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
                break
            default:
                staticAssertNever(roomId)
        }
        if (this.pushNotificationClient) {
            await this.pushNotificationClient.sendMentionedNotifications(roomId.networkId, options)
        } else {
            //console.log('No notification sent because the pushNotificationClient is undefined')
        }
    }

    public async sendBlockTxn(
        roomId: RoomIdentifier,
        txn: BlockchainTransactionEvent,
        threadIdOptions?: ThreadIdOptions,
    ) {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix:
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                await sendMatrixNotice(this.matrixClient, roomId, txn)
                break
            case SpaceProtocol.Casablanca:
                if (!this.casablancaClient) {
                    throw new Error('Casablanca client not initialized')
                }

                await this.casablancaClient.sendChannelMessage_BlockTxn(roomId.networkId, {
                    ...threadIdOptions,
                    content: {
                        type: txn.content.type,
                        hash: txn.content.hash,
                    },
                })
                break
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * sendReaction
     *************************************************/
    public async sendReaction(
        roomId: RoomIdentifier,
        eventId: string,
        reaction: string,
    ): Promise<void> {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix:
                {
                    if (!this.matrixClient) {
                        throw new Error('matrix client is undefined')
                    }
                    const newEventId = await this.matrixClient.sendEvent(
                        roomId.networkId,
                        EventType.Reaction,
                        {
                            'm.relates_to': {
                                rel_type: RelationType.Annotation,
                                event_id: eventId,
                                key: reaction,
                            },
                        },
                    )
                    console.log('sendReaction', newEventId)
                }
                break
            case SpaceProtocol.Casablanca:
                if (!this.casablancaClient) {
                    throw new Error('Casablanca client not initialized')
                }
                await this.casablancaClient.sendChannelMessage_Reaction(roomId.networkId, {
                    reaction,
                    refEventId: eventId,
                })
                console.log('sendReaction')
                break
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * canSendToDevice
     *************************************************/
    public async canSendToDeviceMessage(userId: string): Promise<boolean> {
        switch (this.opts.primaryProtocol) {
            case SpaceProtocol.Casablanca: {
                if (!this.casablancaClient) {
                    throw new Error('Casablanca client not initialized')
                }
                const devices = await this.casablancaClient.getStoredDevicesForUser(userId)
                return devices.size > 0
            }
            case SpaceProtocol.Matrix: {
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }

                const devices = this.matrixClient.getStoredDevicesForUser(userId)
                return devices.length > 0
            }
            default:
                return false
        }
    }

    /************************************************
     * sendToDevice
     *************************************************/
    public async sendToDeviceMessage(userId: string, type: string, content: object) {
        switch (this.opts.primaryProtocol) {
            case SpaceProtocol.Casablanca: {
                // todo casablanca look for user in casablanca
                if (!this.casablancaClient) {
                    throw new Error('Casablanca client not initialized')
                }
                const canSend = await this.canSendToDeviceMessage(userId)
                if (!canSend) {
                    throw new Error('cannot send to device for user ' + userId)
                }
                await this.casablancaClient.sendToDevicesMessage(userId, { content }, type)
                return
            }
            case SpaceProtocol.Matrix: {
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }

                const devices = this.matrixClient.getStoredDevicesForUser(userId)
                const devicesInfo = devices.map((d) => ({ userId: userId, deviceInfo: d }))
                await this.matrixClient.encryptAndSendToDevices(devicesInfo, {
                    type,
                    content,
                })
                return
            }
            default:
                return
        }
    }
    /************************************************
     * editMessage
     *************************************************/
    public async editMessage(
        roomId: RoomIdentifier,
        eventId: string,
        originalEventContent: RoomMessageEvent,
        message: string,
        options: SendTextMessageOptions | undefined,
    ) {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix:
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                return await editZionMessage(
                    this.matrixClient,
                    roomId,
                    eventId,
                    originalEventContent,
                    message,
                    options,
                )
            case SpaceProtocol.Casablanca:
                if (!this.casablancaClient) {
                    throw new Error('casablanca client is undefined')
                }
                return await this.casablancaClient.sendChannelMessage_Edit_Text(
                    roomId.networkId,
                    eventId,
                    {
                        threadId: originalEventContent.inReplyTo,
                        threadPreview: originalEventContent.threadPreview,
                        content: {
                            body: message,
                            mentions: options?.mentions ?? [],
                        },
                    },
                )
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * redactEvent
     *************************************************/
    public async redactEvent(roomId: RoomIdentifier, eventId: string, reason?: string) {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix:
                {
                    if (!this.matrixClient) {
                        throw new Error('matrix client is undefined')
                    }
                    const resp = await this.matrixClient.redactEvent(
                        roomId.networkId,
                        eventId,
                        undefined,
                        {
                            reason,
                        },
                    )
                    console.log('event redacted', roomId.networkId, eventId, resp)
                }
                break
            case SpaceProtocol.Casablanca:
                if (!this.casablancaClient) {
                    throw new Error('casablanca client is undefined')
                }
                await this.casablancaClient.sendChannelMessage_Redaction(roomId.networkId, {
                    refEventId: eventId,
                    reason,
                })
                break
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * syncSpace
     *************************************************/
    public async syncSpace(spaceId: RoomIdentifier, walletAddress: string) {
        switch (spaceId.protocol) {
            case SpaceProtocol.Matrix:
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }

                return syncMatrixSpace(this.matrixClient, this.spaceDapp, spaceId, walletAddress)
            case SpaceProtocol.Casablanca:
                throw new Error('not implemented')
            default:
                staticAssertNever(spaceId)
        }
    }

    /************************************************
     * getPowerLevel
     ************************************************/
    public getPowerLevel(roomId: RoomIdentifier, key: string): PowerLevel | undefined {
        return this.getPowerLevels(roomId).levels.find((x) => x.definition.key === key)
    }
    /************************************************
     * getPowerLevels
     ************************************************/
    public getPowerLevels(roomId: RoomIdentifier): PowerLevels {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix: {
                const room = this.matrixClient?.getRoom(roomId.networkId)
                if (!room) {
                    throw new Error(`Room ${roomId.networkId} not found`)
                }
                const powerLevelsEvent = room.currentState.getStateEvents(
                    EventType.RoomPowerLevels,
                    '',
                )
                const powerLevels = powerLevelsEvent ? powerLevelsEvent.getContent() : {}
                return enrichPowerLevels(powerLevels)
            }
            case SpaceProtocol.Casablanca: {
                throw new Error('not implemented')
            }
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * setPowerLevel
     ************************************************/
    public async setPowerLevel(roomId: RoomIdentifier, key: string | PowerLevel, newValue: number) {
        const current = typeof key == 'string' ? this.getPowerLevel(roomId, key) : key
        if (!current) {
            throw new Error(`Power level ${key as string} not found`)
        }
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix:
                {
                    if (!this.matrixClient) {
                        throw new Error('matrix client is undefined')
                    }
                    const response = await setMatrixPowerLevel(
                        this.matrixClient,
                        roomId,
                        current,
                        newValue,
                    )
                    this.log(
                        `updted power level ${current.definition.key} for room[${roomId.networkId}] from ${current.value} to ${newValue}`,
                        response,
                    )
                }
                break
            case SpaceProtocol.Casablanca:
                throw new Error('not implemented')
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * isRoomEncrypted
     ************************************************/
    public isRoomEncrypted(roomId: RoomIdentifier): boolean | undefined {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix:
                if (!this.matrixClient) {
                    return undefined
                }
                return this.matrixClient.isRoomEncrypted(roomId.networkId)
            case SpaceProtocol.Casablanca:
                return true
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * setRoomFullyReadData
     ************************************************/
    public async setRoomFullyReadData(
        roomId: RoomIdentifier,
        content: Record<string, FullyReadMarker>,
    ) {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix:
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                return this.matrixClient.setRoomAccountData(
                    roomId.networkId,
                    ZionAccountDataType.FullyRead,
                    content,
                )
            case SpaceProtocol.Casablanca:
                throw new Error('not implemented for casablanca')
        }
    }

    private getAllChannelMembershipsFromSpace(roomId: RoomIdentifier): Record<string, Membership> {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix: {
                const room = this.matrixClient?.getRoom(roomId.networkId)
                const content: Record<string, Membership> | undefined = room
                    ?.getAccountData(ZionAccountDataType.Membership)
                    ?.getContent()
                if (content) {
                    return content
                }
                return {}
            }
            case SpaceProtocol.Casablanca: {
                const userStreamId = this.casablancaClient?.userStreamId
                if (!userStreamId) {
                    throw new Error('User stream is not defined')
                }

                const memberships: Record<string, Membership> = {}

                const userStreamRollup = this.casablancaClient?.streams.get(userStreamId)?.view

                if (userStreamRollup === undefined) {
                    return memberships
                }

                const spaceStream = this.casablancaClient?.streams.get(roomId.networkId)
                const spaceChannels = Array.from(
                    spaceStream?.view?.spaceChannelsMetadata.keys() || [],
                )

                //We go through all the channels in the space and check if the user is invited or joined
                spaceChannels?.forEach((channel) => {
                    if (userStreamRollup?.userInvitedStreams.has(channel)) {
                        memberships[channel] = Membership.Invite
                    }
                    if (userStreamRollup?.userJoinedStreams.has(channel)) {
                        memberships[channel] = Membership.Join
                    }
                })

                return memberships
            }
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * getAccountDataRoomMembership
     * gets membership status for room even if user is not current member of room
     * ************************************************/
    public getChannelMembershipFromSpace(
        spaceId: RoomIdentifier,
        channelNetworkId: string,
    ): Membership | undefined {
        return this.getAllChannelMembershipsFromSpace(spaceId)[channelNetworkId]
    }

    /************************************************
     * setRoomStatus
     * Set a membership status for room (space or channel) in space's account data
     ************************************************/
    private async setChannelMembershipDataOnSpace({
        spaceId,
        channelNetworkId: channelId,
        membershipStatus,
    }: {
        spaceId: RoomIdentifier
        channelNetworkId?: string
        membershipStatus: Membership
    }) {
        switch (spaceId.protocol) {
            case SpaceProtocol.Matrix: {
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                const room = this.matrixClient?.getRoom(spaceId.networkId)
                // safeguard against non space rooms or trying to set data before the room DAG is loaded, which can cause issues with tests - historyVisiblity.test.ts
                if (!room?.isSpaceRoom()) {
                    console.warn(
                        '[setChannelMembershipDataOnSpace] isSpaceRoom() check did not pass, not setting room data',
                        {
                            spaceId: spaceId.networkId,
                            channelId: channelId,
                            room,
                            membershipStatus,
                        },
                    )
                    return
                }

                const currentData = this.getAllChannelMembershipsFromSpace(spaceId)
                const newData = {
                    ...currentData,
                    [channelId ?? spaceId.networkId]: membershipStatus,
                }

                try {
                    return this.matrixClient.setRoomAccountData(
                        spaceId.networkId,
                        ZionAccountDataType.Membership,
                        newData,
                    )
                } catch (error) {
                    console.error(
                        '[setAccountDataRoomMembershipStatus] setting account data',
                        error,
                    )
                }
                return
            }
            case SpaceProtocol.Casablanca:
                throw new Error('not implemented')
            default:
                staticAssertNever(spaceId)
        }
    }

    /************************************************
     * getRoomData
     ************************************************/
    public getRoomData(roomId: RoomIdentifier): Room | undefined {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix: {
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                const matrixRoom = this.matrixClient.getRoom(roomId.networkId)
                return matrixRoom ? toZionRoom(matrixRoom) : undefined
            }
            case SpaceProtocol.Casablanca: {
                if (!this.casablancaClient) {
                    throw new Error('casablanca client is undefined')
                }
                const stream = this.casablancaClient.stream(roomId.networkId)
                return stream
                    ? toZionRoomFromStream(stream, this.casablancaClient.userId)
                    : undefined
            }
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * getRoomMember
     * **********************************************/
    public getRoomMember(roomId: RoomIdentifier, userId: string): RoomMember | undefined {
        const roomData = this.getRoomData(roomId)
        return roomData?.members.find((x) => x.userId === userId)
    }

    /************************************************
     * getUser
     ************************************************/
    public getUser(userId: string): User | undefined {
        switch (this.opts.primaryProtocol) {
            case SpaceProtocol.Matrix: {
                const matrixUser = this.matrixClient?.getUser(userId)
                return matrixUser ? toZionUser(matrixUser) : undefined
            }
            case SpaceProtocol.Casablanca:
                throw new Error('not implemented')
            default:
                throw new Error('Unexpected primary protocol')
        }
    }

    /************************************************
     * getProfileInfo
     ************************************************/
    public async getProfileInfo(
        userId: string,
    ): Promise<{ avatar_url?: string; displayname?: string }> {
        // todo casablanca look for user in casablanca
        if (!this.matrixClient) {
            throw new Error('matrix client is undefined')
        }
        const info = await this.matrixClient.getProfileInfo(userId)
        const user = this.matrixClient.getUser(userId)
        if (user) {
            if (info.displayname) {
                user.setDisplayName(info.displayname)
                user.emit(UserEvent.DisplayName, user.events.presence, user)
            }
            if (info.avatar_url) {
                user.setAvatarUrl(info.avatar_url)
                user.emit(UserEvent.AvatarUrl, user.events.presence, user)
            }
        }
        return info
    }

    /************************************************
     * getUserId
     ************************************************/
    public getUserId(): string | undefined {
        switch (this.opts.primaryProtocol) {
            case SpaceProtocol.Matrix:
                return this.auth?.userId
            case SpaceProtocol.Casablanca:
                return this.casablancaClient?.userId
            default:
                staticAssertNever(this.opts.primaryProtocol)
        }
    }

    /************************************************
     * setDisplayName
     ************************************************/
    public async setDisplayName(name: string): Promise<void> {
        // todo casablanca display name
        return this.matrixOnly(async (matrixClient) => {
            await matrixClient.setDisplayName(name)
        })
    }

    /************************************************
     * avatarUrl
     ************************************************/
    public async setAvatarUrl(url: string): Promise<void> {
        // todo casablanca avatar url
        return this.matrixOnly(async (matrixClient) => {
            await matrixClient.setAvatarUrl(url)
        })
    }

    /************************************************
     * setRoomTopic
     ************************************************/
    public async setRoomTopic(roomId: RoomIdentifier, name: string): Promise<void> {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix:
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                await this.matrixClient.setRoomTopic(roomId.networkId, name)
                break
            case SpaceProtocol.Casablanca:
                throw new Error('not implemented for casablanca')
        }
    }

    /************************************************
     * setRoomName
     ************************************************/
    public async setRoomName(roomId: RoomIdentifier, name: string): Promise<void> {
        // todo casablanca display name
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix:
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                await this.matrixClient?.setRoomName(roomId.networkId, name)
                break
            case SpaceProtocol.Casablanca:
                throw new Error('not implemented for casablanca')
        }
    }

    /************************************************
     * getRoomTopic
     ************************************************/
    public async getRoomTopic(roomId: RoomIdentifier): Promise<string> {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix: {
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const topic: Record<string, any> = await this.matrixClient.getStateEvent(
                    roomId.networkId,
                    'm.room.topic',
                    '',
                )
                return (topic?.topic as string) ?? ''
            }
            case SpaceProtocol.Casablanca:
                throw new Error('not implemented for casablanca')
        }
    }

    /************************************************
     * scrollback
     ************************************************/
    public async scrollback(roomId: RoomIdentifier, limit?: number): Promise<void> {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix:
                {
                    if (!this.matrixClient) {
                        throw new Error('matrix client is undefined')
                    }
                    const room = this.matrixClient.getRoom(roomId.networkId)
                    if (!room) {
                        throw new Error('room not found')
                    }
                    await this.matrixClient.scrollback(room, limit)
                }
                break
            case SpaceProtocol.Casablanca:
                throw new Error('not implemented for casablanca')
        }
    }

    /************************************************
     * send read receipt
     * no need to send for every message, matrix uses an "up to" algorithm
     ************************************************/
    public async sendReadReceipt(
        roomId: RoomIdentifier,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        eventId: string | undefined = undefined,
    ): Promise<void> {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix: {
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                const room = this.matrixClient.getRoom(roomId.networkId)
                if (!room) {
                    throw new Error(`room with id ${roomId.networkId} not found`)
                }
                const event = eventId
                    ? room.findEventById(eventId)
                    : room.getLiveTimeline().getEvents().at(-1)
                if (!event) {
                    throw new Error(
                        `event for room ${roomId.networkId} eventId: ${
                            eventId ?? 'at(-1)'
                        } not found`,
                    )
                }
                const result = await this.matrixClient.sendReadReceipt(event)
                this.log('read receipt sent', result)
                break
            }
            case SpaceProtocol.Casablanca:
                throw new Error('not implemented for casablanca')
        }
    }

    /************************************************
     * log
     *************************************************/
    protected log(message: string, ...optionalParams: unknown[]) {
        console.log(message, ...optionalParams)
    }

    /************************************************
     * createMatrixClient
     * helper, creates a matrix matrixClient with appropriate auth
     *************************************************/
    protected static createMatrixClient(
        opts: ZionOpts,
        auth?: MatrixAuth,
        store?: Store,
        cryptoStore?: CryptoStore,
    ): MatrixClient {
        if (auth) {
            // just *accessing* indexedDB throws an exception in firefox with indexeddb disabled.

            return createClient({
                baseUrl: opts.matrixServerUrl,
                accessToken: auth.accessToken,
                userId: auth.userId,
                deviceId: auth.deviceId,
                useAuthorizationHeader: true,
                store: store,
                cryptoStore: cryptoStore,
            })
        } else {
            return createClient({
                baseUrl: opts.matrixServerUrl,
            })
        }
    }

    /*
     * Error when web3Provider.waitForTransaction receipt has a status of 0
     */
    private async throwTransactionError(receipt: ContractReceipt): Promise<Error> {
        const code = await this.opts.web3Provider?.call(receipt, receipt.blockNumber)
        const reason = toUtf8String(`0x${code?.substring(138) || ''}`)
        throw new Error(reason)
    }

    private async onErrorLeaveSpaceRoomAndDecodeError(
        roomId: RoomIdentifier | undefined,
        error: unknown,
    ): Promise<Error> {
        if (roomId) {
            try {
                await this.leave(roomId)
            } catch (e) {
                console.error('error leaving room after blockchain error', e)
            }
        }
        /**
         *  Wallet rejection
         * */
        const walletRejectionError = this.getWalletRejectionError(error)
        if (walletRejectionError) {
            return walletRejectionError
        }

        /**
         *  Transaction error generated by space factory contract when creating space.
         * */
        return this.getDecodedErrorForSpaceFactory(error)
    }

    private async onErrorLeaveChannelRoomAndDecodeError(
        parentSpaceId: string | undefined,
        channelRoomId: RoomIdentifier | undefined,
        error: unknown,
    ): Promise<Error> {
        if (channelRoomId) {
            await this.leave(channelRoomId, parentSpaceId)
        }
        /**
         *  Wallet rejection
         * */
        const walletRejectionError = this.getWalletRejectionError(error)
        if (walletRejectionError) {
            return walletRejectionError
        }

        /**
         *  Transaction error created by Space contract when creating channel.
         * */
        if (parentSpaceId) {
            return this.getDecodedErrorForSpace(parentSpaceId, error)
        }
        // If no spaceId is provided, we can't decode the error.
        return new Error('cannot decode error because no spaceId is provided')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private getWalletRejectionError(error: any): Error | undefined {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        if (error?.code === 'ACTION_REJECTED' && !error?.error) {
            return {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                name: error?.code,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                message: error.message,
            }
        }
        return undefined
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private getDecodedErrorForSpaceFactory(error: any): Error {
        try {
            return this.spaceDapp.parseSpaceFactoryError(error)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            if (e instanceof Error) {
                return e
            }
            // Cannot decode error
            console.error('[getDecodedErrorForSpaceFactory]', 'cannot decode error', e)
            return {
                name: 'unknown',
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                message: e.message,
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async getDecodedErrorForSpace(spaceId: string, error: any): Promise<Error> {
        try {
            return await this.spaceDapp.parseSpaceError(spaceId, error)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            if (e instanceof Error) {
                return e
            }
            // Cannot decode error
            console.error('[getDecodedErrorForSpace]', 'cannot decode error', e)
            return {
                name: 'unknown',
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                message: e.message,
            }
        }
    }

    public setEventHandlers(eventHandlers: ZionClientEventHandlers | undefined) {
        this._eventHandlers = eventHandlers
    }

    public onLogin({ userId }: { userId: string }) {
        this._eventHandlers?.onLogin?.({ userId: userId })
    }

    private async matrixOnly<T>(f: (client: MatrixClient) => Promise<T>): Promise<T> {
        if (!this.matrixClient) {
            throw new Error('matrix client is undefined')
        }
        return f(this.matrixClient)
    }
}
