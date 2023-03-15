import { AuthenticationData, LoginTypePublicKey, RegisterRequest } from '../hooks/login'
import { BigNumber, ContractReceipt, ContractTransaction, Wallet, ethers } from 'ethers'
import { bin_fromHexString, Client as CasablancaClient, makeStreamRpcClient } from '@zion/client'
import {
    ChannelTransactionContext,
    ChannelUpdateTransactionContext,
    IZionServerVersions,
    RoleTransactionContext,
    SpaceProtocol,
    TransactionContext,
    TransactionStatus,
    ZionAccountDataType,
    ZionAuth,
    ZionClientEventHandlers,
    ZionOpts,
} from './ZionClientTypes'
import {
    ClientEvent,
    EventType,
    MatrixClient,
    MatrixError,
    PendingEventOrdering,
    RelationType,
    UserEvent,
    createClient,
    IndexedDBCryptoStore,
    ISendEventResponse,
} from 'matrix-js-sdk'
import { LocalStorageCryptoStore } from 'matrix-js-sdk/lib/crypto/store/localStorage-crypto-store'
import {
    CreateChannelInfo,
    CreateSpaceInfo,
    EditMessageOptions,
    Membership,
    PowerLevel,
    PowerLevels,
    Room,
    RoomMember,
    SendMessageOptions,
    SendTextMessageOptions,
    UpdateChannelInfo,
    User,
} from '../types/zion-types'
import {
    SignerContext,
    publicKeyToBuffer,
    isUserStreamId as isCasablancaUserStreamId,
} from '@zion/client'

import { FullyReadMarker, ZTEvent } from '../types/timeline-types'
import { ISpaceDapp } from './web3/ISpaceDapp'
import { Permission } from './web3/ContractTypes'
import { RoleIdentifier, TProvider } from '../types/web3-types'
import { makeMatrixRoomIdentifier, RoomIdentifier } from '../types/room-identifier'
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
import { sendMatrixMessage } from './matrix/SendMessage'
import { setMatrixPowerLevel } from './matrix/SetPowerLevels'
import { staticAssertNever } from '../utils/zion-utils'
import { syncMatrixSpace } from './matrix/SyncSpace'
import { toZionRoom, toZionUser } from '../store/use-matrix-store'
import { toZionRoomFromStream } from './casablanca/CasablancaUtils'
import { sendCsbMessage } from './casablanca/SendMessage'
import { newLoginSession, newRegisterSession, NewSession } from '../hooks/session'
import { toUtf8String } from 'ethers/lib/utils.js'
import {
    MatrixDecryptionExtension,
    MatrixDecryptionExtensionDelegate,
} from './matrix/MatrixDecryptionExtensions'
/***
 * Zion Client
 * mostly a "passthrough" abstraction that hides the underlying MatrixClient
 * normally, a shitty design pattern, but in zions case we want to
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
    public matrixClient?: MatrixClient
    public matrixDecryptionExtension?: MatrixDecryptionExtension
    public casablancaClient?: CasablancaClient
    private _chainId: number
    private _auth?: ZionAuth
    private _eventHandlers?: ZionClientEventHandlers

    constructor(opts: ZionOpts, chainId?: number, name?: string) {
        this.opts = opts
        this.name = name || ''
        this._chainId = chainId ?? 0
        console.log('~~~ new ZionClient ~~~', this.name, this.opts)
        this.matrixClient = ZionClient.createMatrixClient(opts, this._auth)
        const { spaceDapp } = this.createShims(
            this._chainId,
            this.opts.web3Provider,
            this.opts.web3Signer,
        )
        this.spaceDapp = spaceDapp
        this._eventHandlers = opts.eventHandlers
    }

    public get auth(): ZionAuth | undefined {
        return this._auth
    }

    /// chain id at the time the contracts were created
    /// contracts are recreated when the client is started
    public get chainId(): number {
        return this._chainId
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
     * isUserRegistered
     *************************************************/
    public async isUserRegistered(username: string): Promise<boolean> {
        const matrixClient = ZionClient.createMatrixClient(this.opts)
        const isAvailable = await matrixClient.isUsernameAvailable(username)
        // If the username is available, then it is not yet registered.
        return isAvailable === false
    }

    /************************************************
     * logout
     *************************************************/
    public async logout(): Promise<void> {
        this.log('logout')
        if (!this.auth) {
            throw new Error('not authenticated')
        }
        const matrixClient = this.matrixClient
        await this.stopClients()
        if (matrixClient) {
            try {
                await matrixClient.logout()
            } catch (error) {
                this.log("caught error while trying to logout, but we're going to ignore it", error)
            }
            try {
                await matrixClient.clearStores()
            } catch (error) {
                this.log(
                    "caught error while trying to clearStores, but we're going to ignore it",
                    error,
                )
            }
        }

        this._eventHandlers?.onLogout?.({
            userId: this._auth?.userId as string,
        })

        this._auth = undefined
        this.matrixClient = ZionClient.createMatrixClient(this.opts, this._auth)
    }

    /************************************************
     * signCasablancaDelegate
     * sign the public key of a local wallet
     * that you will use to sign messages to casablanca
     *************************************************/
    public async signCasablancaDelegate(delegateWallet: Wallet): Promise<SignerContext> {
        if (!this.opts.web3Signer) {
            throw new Error("can't sign without a web3 signer")
        }
        const primaryAddress = await this.opts.web3Signer.getAddress()
        const delegateSig = await this.opts.web3Signer.signMessage(
            publicKeyToBuffer(delegateWallet.publicKey),
        )
        const context: SignerContext = {
            wallet: delegateWallet,
            creatorAddress: bin_fromHexString(primaryAddress),
            delegateSig: bin_fromHexString(delegateSig),
        }
        return context
    }

    /************************************************
     * preRegister
     * set up a registration request, will fail if
     * our wallet is already registered
     ************************************************/
    public async preRegister(walletAddress: string): Promise<NewSession> {
        if (this.auth) {
            throw new Error('already registered')
        }
        const matrixClient = ZionClient.createMatrixClient(this.opts)
        return await newRegisterSession(matrixClient, walletAddress)
    }

    /************************************************
     * register
     * register wallet with matrix, if successful will
     * return params that allow you to call start matrixClient
     *************************************************/
    public async register(request: RegisterRequest): Promise<ZionAuth> {
        if (this.auth) {
            throw new Error('already registered')
        }
        const matrixClient = ZionClient.createMatrixClient(this.opts)
        const { access_token, device_id, user_id } = await matrixClient.registerRequest(
            request,
            LoginTypePublicKey,
        )
        if (!access_token || !device_id || !user_id) {
            throw new Error('failed to register')
        }
        this._eventHandlers?.onRegister?.({
            userId: user_id,
        })
        return {
            accessToken: access_token,
            deviceId: device_id,
            userId: user_id,
        }
    }

    /************************************************
     * newLoginSession
     * set up a new login session.
     ************************************************/
    public async newLoginSession(): Promise<NewSession> {
        if (this.auth) {
            throw new Error('already logged in')
        }
        const matrixClient = ZionClient.createMatrixClient(this.opts)
        return await newLoginSession(matrixClient)
    }

    /************************************************
     * login
     * set up a login request, will fail if
     * our wallet is NOT registered
     ************************************************/
    public async login(auth: AuthenticationData): Promise<ZionAuth> {
        if (this.auth) {
            throw new Error('already logged in')
        }
        const matrixClient = ZionClient.createMatrixClient(this.opts)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const { access_token, device_id, user_id } = await matrixClient.login(LoginTypePublicKey, {
            auth,
        })
        if (!access_token || !device_id || !user_id) {
            throw new Error('failed to login')
        }

        this._eventHandlers?.onLogin?.({
            userId: user_id as string,
        })

        return {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            accessToken: access_token,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            deviceId: device_id,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            userId: user_id,
        }
    }

    /************************************************
     * startMatrixClient
     * start the matrix matrixClient, add listeners
     *************************************************/
    public async startMatrixClient(auth: ZionAuth, chainId: number) {
        if (this.auth) {
            throw new Error('already authenticated')
        }
        if (this.matrixClient?.clientRunning) {
            throw new Error('matrixClient already running')
        }
        if (!this.opts.web3Provider || !this.opts.web3Signer) {
            throw new Error('web3Provider and web3Signer are required')
        }
        // log startOpts
        this.log('Starting matrixClient')
        // set auth, chainId
        this._auth = auth
        this._chainId = chainId
        // new contracts
        const { spaceDapp } = this.createShims(
            this._chainId,
            this.opts.web3Provider,
            this.opts.web3Signer,
        )
        this.spaceDapp = spaceDapp
        // new matrixClient
        this.matrixClient = ZionClient.createMatrixClient(this.opts, this._auth)
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
    }

    /************************************************
     * startCasablancaClient
     *************************************************/
    public async startCasablancaClient(context: SignerContext) {
        if (this.casablancaClient) {
            throw new Error('already started casablancaClient')
        }
        const rpcClient = makeStreamRpcClient(this.opts.casablancaServerUrl)
        this.casablancaClient = new CasablancaClient(context, rpcClient)
        // TODO - long-term the app should already know if user exists via cookie
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        try {
            await this.casablancaClient.loadExistingUser()
        } catch (e) {
            console.log('user does not exist, creating new user', (e as Error).message)
            await this.casablancaClient.createNewUser()
        }

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.casablancaClient.startSync()
    }

    /************************************************
     * stopMatrixClient
     *************************************************/
    public stopMatrixClient() {
        this.matrixDecryptionExtension?.stop()
        if (this.matrixClient) {
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
        this.stopMatrixClient()
        await this.stopCasablancaClient()
    }

    public async createSpaceTransaction(
        createSpaceInfo: CreateSpaceInfo,
        memberEntitlements: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct,
        everyonePermissions: Permission[],
    ): Promise<TransactionContext<RoomIdentifier>> {
        const roomId: RoomIdentifier | undefined = await this.createSpaceRoom(createSpaceInfo)

        if (!roomId) {
            console.error('[createSpaceTransaction] Matrix createSpace failed')
            return {
                transaction: undefined,
                receipt: undefined,
                status: TransactionStatus.Failed,
                data: undefined,
                error: new Error('Matrix createSpace failed'),
            }
        }

        console.log('[createSpaceTransaction] Space created', roomId)

        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined

        try {
            transaction = await this.spaceDapp.createSpace(
                createSpaceInfo.name,
                roomId.networkId,
                createSpaceInfo.spaceMetadata ?? '',
                memberEntitlements,
                everyonePermissions,
            )

            console.log(`[createSpaceTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            console.error('[createSpaceTransaction] error', err)
            error = await this.onErrorLeaveSpaceRoomAndDecodeError(roomId, err)
        }

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: transaction ? roomId : undefined,
            error,
        }
    }

    public async waitForCreateSpaceTransaction(
        context: TransactionContext<RoomIdentifier> | undefined,
    ): Promise<TransactionContext<RoomIdentifier>> {
        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let roomId: RoomIdentifier | undefined = undefined
        let error: Error | undefined = undefined

        try {
            if (!context?.transaction) {
                throw new Error('[waitForCreateSpaceTransaction] transaction is undefined')
            }

            transaction = context.transaction
            roomId = context.data
            receipt = await context.transaction.wait()
            console.log(
                '[waitForCreateSpaceTransaction] createSpace receipt completed' /*, receipt */,
            )
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
            return {
                data: roomId,
                status: TransactionStatus.Success,
                transaction,
                receipt,
            }
        }

        // got here without success
        if (!error) {
            error = await this.onErrorLeaveSpaceRoomAndDecodeError(
                roomId,
                new Error('Failed to create space'),
            )
        }
        console.error('[waitForCreateSpaceTransaction] failed', error)

        return {
            data: roomId,
            status: TransactionStatus.Failed,
            transaction,
            receipt,
            error,
        }
    }

    /************************************************
     * createSpace
     *************************************************/
    public async createSpaceRoom(createSpaceInfo: CreateSpaceInfo): Promise<RoomIdentifier> {
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
                return createCasablancaSpace(this.casablancaClient, createSpaceInfo)
            default:
                staticAssertNever(createSpaceInfo.spaceProtocol)
        }
    }

    /************************************************
     * createChannelRoom
     *************************************************/
    public async createChannelRoom(createInfo: CreateChannelInfo): Promise<RoomIdentifier> {
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
                return createCasablancaChannel(this.casablancaClient, createInfo.parentSpaceId)
            default:
                staticAssertNever(createInfo.parentSpaceId)
        }
    }

    /************************************************
     * createChannel
     *************************************************/
    public async createChannel(
        createChannelInfo: CreateChannelInfo,
    ): Promise<RoomIdentifier | undefined> {
        const txContext = await this.createChannelTransaction(createChannelInfo)
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
    ): Promise<ChannelTransactionContext> {
        let roomId: RoomIdentifier | undefined
        try {
            roomId = await this.createChannelRoom(createChannelInfo)
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

        console.log('[createChannelTransaction] Channel created', roomId)

        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined

        try {
            transaction = await this.spaceDapp.createChannel(
                createChannelInfo.parentSpaceId.networkId,
                createChannelInfo.name,
                roomId.networkId,
                createChannelInfo.roleIds,
            )
            console.log(`[createChannelTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            console.error('[createChannelTransaction] error', err)
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

    public async waitForCreateChannelTransaction(
        context: ChannelTransactionContext | undefined,
    ): Promise<TransactionContext<RoomIdentifier>> {
        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let roomId: RoomIdentifier | undefined = undefined
        let error: Error | undefined = undefined

        try {
            if (!context?.transaction) {
                throw new Error('[waitForCreateChannelTransaction] transaction is undefined')
            }

            transaction = context.transaction
            roomId = context.data
            // provider.waitForTransaction resolves more quickly than transaction.wait(), why?
            receipt = await this.opts.web3Provider?.waitForTransaction(transaction.hash)
            // copy tx.wait() behavior - it throws an error if tx fails
            if (receipt?.status === 0) {
                await this.throwTransactionError(receipt)
            }
            console.log(
                '[waitForCreateChannelTransaction] createChannel receipt completed' /*, receipt */,
            )
        } catch (err) {
            console.error('[waitForCreateChannelTransaction] error', err)
            error = await this.onErrorLeaveChannelRoomAndDecodeError(
                context?.parentSpaceId,
                roomId,
                err,
            )
        }

        if (receipt?.status === 1) {
            console.log('[waitForCreateChannelTransaction] success', roomId)
            return {
                data: roomId,
                status: TransactionStatus.Success,
                transaction,
                receipt,
            }
        }

        // got here without success
        if (!error) {
            // If we don't have an error from the transaction, create one
            error = await this.onErrorLeaveChannelRoomAndDecodeError(
                context?.parentSpaceId,
                roomId,
                new Error('Failed to create channel'),
            )
        }
        console.error('[waitForCreateChannelTransaction] failed', error)
        return {
            data: roomId,
            status: TransactionStatus.Failed,
            transaction,
            receipt,
            error,
        }
    }

    public async updateChannelTransaction(
        updateChannelInfo: UpdateChannelInfo,
    ): Promise<ChannelUpdateTransactionContext> {
        const hasOffChainUpdate = !updateChannelInfo.updatedChannelTopic
        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined
        try {
            if (updateChannelInfo.updatedChannelName && updateChannelInfo.updatedRoleIds) {
                transaction = await this.spaceDapp.updateChannel({
                    spaceNetworkId: updateChannelInfo.parentSpaceId.networkId,
                    channelNetworkId: updateChannelInfo.channelId.networkId,
                    channelName: updateChannelInfo.updatedChannelName,
                    roleIds: updateChannelInfo.updatedRoleIds,
                })
                console.log(`[updateChannelTransaction] transaction created` /*, transaction*/)
            } else {
                // this is a matrix/casablanca off chain state update
            }
        } catch (err) {
            console.error('[updateChannelTransaction] error', err)
            error = await this.spaceDapp.parseSpaceError(
                updateChannelInfo.parentSpaceId.networkId,
                err,
            )
        }

        return {
            transaction,
            hasOffChainUpdate,
            receipt: undefined,
            status:
                transaction || hasOffChainUpdate // should proceed either if it has a transaction, or an offchain update
                    ? TransactionStatus.Pending
                    : TransactionStatus.Failed,
            data: updateChannelInfo,
            error,
        }
    }

    public async waitForUpdateChannelTransaction(
        context: ChannelUpdateTransactionContext | undefined,
    ): Promise<ChannelUpdateTransactionContext> {
        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let error: Error | undefined = undefined

        try {
            if (!context?.hasOffChainUpdate && !context?.transaction) {
                // no off chain update, and no transaction. should not happen
                throw new Error('[waitForUpdateChannelTransaction] transaction is undefined')
            }
            if (context?.transaction) {
                transaction = context.transaction
                receipt = await this.opts.web3Provider?.waitForTransaction(transaction.hash)
                if (receipt?.status === 0) {
                    await this.throwTransactionError(receipt)
                }
            }
        } catch (err) {
            console.error('[waitForUpdateChannelTransaction] waitForTransaction error', err)
            if (err instanceof Error) {
                error = err
            } else {
                error = new Error(`update channel failed: ${JSON.stringify(err)}`)
            }
        }

        // Successfully updated the channel on-chain. Or this is a matrix/casablanca off chain update
        const doOffChainUpdate = receipt?.status === 1 || context?.hasOffChainUpdate
        if (doOffChainUpdate) {
            // now update the channel name in the room
            try {
                if (!context?.data) {
                    throw new Error('[waitForUpdateChannelTransaction] context?.data is undefined')
                }
                await this.updateChannelRoom(context.data)
                console.log('[waitForUpdateChannelTransaction] success')
                return {
                    data: context.data,
                    hasOffChainUpdate: context.hasOffChainUpdate,
                    status: TransactionStatus.Success,
                    transaction,
                    receipt,
                    error,
                }
            } catch (err) {
                console.error('[waitForUpdateChannelTransaction] updateChannelRoom error', err)
                if (err instanceof Error) {
                    error = err
                } else {
                    error = new Error(`update channel failed: ${JSON.stringify(err)}`)
                }
            }
        }

        // got here without success
        return {
            data: context?.data,
            hasOffChainUpdate: context?.hasOffChainUpdate ?? false,
            status: TransactionStatus.Failed,
            transaction,
            receipt,
            error,
        }
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
    public isEntitled(
        spaceId: string,
        channelId: string | undefined,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        console.log('[isEntitled] is user entitlted for channel and space for permission', {
            user: user,
            spaceId: spaceId,
            channelId: channelId,
            permission: permission,
        })

        if (channelId) {
            return this.spaceDapp.isEntitledToChannel(spaceId, channelId, user, permission)
        } else {
            return this.spaceDapp.isEntitledToSpace(spaceId, user, permission)
        }
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
    ): Promise<RoleTransactionContext> {
        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined
        try {
            transaction = await this.spaceDapp.createRole(
                spaceNetworkId,
                roleName,
                permissions,
                tokens,
                users,
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
    ): Promise<TransactionContext<RoleIdentifier>> {
        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let error: Error | undefined = undefined

        try {
            if (!context?.transaction) {
                throw new Error('[waitForCreateRoleTransaction] transaction is undefined')
            }
            transaction = context.transaction
            receipt = await this.opts.web3Provider?.waitForTransaction(transaction.hash)
            if (receipt?.status === 0) {
                await this.throwTransactionError(receipt)
            }
            console.log(
                '[waitForCreateRoleTransaction] createRoleTransaction receipt completed' /*, receipt */,
            )
        } catch (err) {
            console.error('[waitForCreateRoleTransaction] error', err)
            if (err instanceof Error) {
                error = err
            } else {
                error = new Error(`create role failed: ${JSON.stringify(err)}`)
            }
        }

        if (receipt?.status === 1 && context?.spaceNetworkId) {
            // Successfully created the role on-chain.
            console.log('[waitForCreateRoleTransaction] success', receipt.logs[0].topics[2])
            const roleId = BigNumber.from(receipt.logs[0].topics[2]).toNumber()
            // John: how can we best decode this 32 byte hex string to a human readable string ?
            const roleName = receipt?.logs[0].topics[3]
            const roleIdentifier: RoleIdentifier = {
                roleId,
                name: roleName,
                spaceNetworkId: context.spaceNetworkId,
            }
            return {
                data: roleIdentifier,
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

    public async addRoleToChannelTransaction(
        spaceNetworkId: string,
        channelNetworkId: string,
        roleId: number,
    ): Promise<TransactionContext<void>> {
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
    ): Promise<TransactionContext<void>> {
        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined
        try {
            transaction = await this.spaceDapp.updateRole({
                spaceNetworkId,
                roleId,
                roleName,
                permissions,
                tokens,
                users,
            })
            console.log(`[updateRoleTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            console.error('[updateRoleTransaction] error', err)
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
        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let error: Error | undefined = undefined

        try {
            if (!context?.transaction) {
                throw new Error('[waitForUpdateRoleTransaction] transaction is undefined')
            }
            transaction = context.transaction
            receipt = await this.opts.web3Provider?.waitForTransaction(transaction.hash)
            if (receipt?.status === 0) {
                await this.throwTransactionError(receipt)
            }
            console.log(
                '[waitForUpdateRoleTransaction] updateRole transaction completed' /*, receipt */,
            )
        } catch (err) {
            console.error('[waitForUpdateRoleTransaction] error', err)
            if (err instanceof Error) {
                error = err
            } else {
                error = new Error(`update role failed: ${JSON.stringify(err)}`)
            }
        }

        if (receipt?.status === 1) {
            // Successfully updated the role on-chain.
            console.log('[waitForUpdateRoleTransaction] success')
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

    public async deleteRoleTransaction(
        spaceNetworkId: string,
        roleId: number,
    ): Promise<TransactionContext<void>> {
        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined
        try {
            transaction = await this.spaceDapp.deleteRole(spaceNetworkId, roleId)
            console.log(`[deleteRoleTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            console.error('[deleteRoleTransaction] error', err)
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
    public async setSpaceAccess(spaceNetworkId: string, disabled: boolean): Promise<boolean> {
        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let success = false
        try {
            transaction = await this.spaceDapp.setSpaceAccess(spaceNetworkId, disabled)
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
                this._eventHandlers?.onInviteUser?.(roomId, userId)
                return
            case SpaceProtocol.Casablanca:
                throw new Error('inviteUser not implemented for Casablanca')
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
                throw new Error('leave not implemented for Casablanca')
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

                this._eventHandlers?.onJoinRoom?.(zionRoom.id)
                return zionRoom
            }
            case SpaceProtocol.Casablanca: {
                // TODO: not doing event handlers here since Casablanca is not part of alpha
                if (!this.casablancaClient) {
                    throw new Error('Casablanca client not initialized')
                }
                await this.casablancaClient.joinChannel(roomId.networkId)
                const stream = await this.casablancaClient.waitForStream(roomId.networkId)
                return toZionRoomFromStream(stream)
            }
            default:
                staticAssertNever(roomId)
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

                this._eventHandlers?.onSendMessage?.(roomId, options)
                return
            case SpaceProtocol.Casablanca:
                if (!this.casablancaClient) {
                    throw new Error('Casablanca client not initialized')
                }
                return await sendCsbMessage(
                    this.casablancaClient,
                    ZTEvent.RoomMessage,
                    roomId,
                    message,
                    options,
                )
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
                await sendCsbMessage(
                    this.casablancaClient,
                    ZTEvent.Reaction,
                    roomId,
                    reaction,
                    undefined,
                    { targetEventId: eventId },
                )
                console.log('sendReaction')
                break
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * canSendToDevice
     *************************************************/
    public canSendToDeviceMessage(userId: string) {
        if (isCasablancaUserStreamId(userId)) {
            // todo casablanca look for user in casablanca
            throw new Error('not implemented')
        } else {
            if (!this.matrixClient) {
                throw new Error('matrix client is undefined')
            }

            const devices = this.matrixClient.getStoredDevicesForUser(userId)
            return devices.length > 0
        }
    }

    /************************************************
     * sendToDevice
     *************************************************/
    public async sendToDeviceMessage(userId: string, type: string, content: object) {
        if (isCasablancaUserStreamId(userId)) {
            // todo casablanca look for user in casablanca
            throw new Error('not implemented')
        } else {
            if (!this.matrixClient) {
                throw new Error('matrix client is undefined')
            }

            const devices = this.matrixClient.getStoredDevicesForUser(userId)
            const devicesInfo = devices.map((d) => ({ userId: userId, deviceInfo: d }))
            await this.matrixClient.encryptAndSendToDevices(devicesInfo, {
                type,
                content,
            })
        }
    }
    /************************************************
     * editMessage
     *************************************************/
    public async editMessage(
        roomId: RoomIdentifier,
        message: string,
        options: EditMessageOptions,
        msgOptions: SendTextMessageOptions | undefined,
    ) {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix:
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                return await editZionMessage(
                    this.matrixClient,
                    roomId,
                    message,
                    options,
                    msgOptions,
                )
            case SpaceProtocol.Casablanca:
                if (!this.casablancaClient) {
                    throw new Error('casablanca client is undefined')
                }
                return await sendCsbMessage(
                    this.casablancaClient,
                    ZTEvent.RoomMessage,
                    roomId,
                    message,
                    msgOptions,
                    undefined,
                    options,
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
                throw new Error('not implemented')
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * syncSpace
     *************************************************/
    public async syncSpace(spaceId: RoomIdentifier, walletAddress?: string) {
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
                throw new Error('not implemented')
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
                throw new Error('not implemented')
            default:
                staticAssertNever(roomId)
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
            case SpaceProtocol.Casablanca:
                throw new Error('not implemented')
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
                return stream ? toZionRoomFromStream(stream) : undefined
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
        if (isCasablancaUserStreamId(userId)) {
            // todo casablanca look for user in casablanca
            throw new Error('not implemented')
        } else {
            if (!this.matrixClient) {
                throw new Error('matrix client is undefined')
            }
            const matrixUser = this.matrixClient.getUser(userId)
            return matrixUser ? toZionUser(matrixUser) : undefined
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
        return this.auth?.userId
    }
    /************************************************
     * setDisplayName
     ************************************************/
    public async setDisplayName(name: string): Promise<void> {
        // todo casablanca display name
        if (!this.matrixClient) {
            throw new Error('matrix client is undefined')
        }
        await this.matrixClient.setDisplayName(name)
    }

    /************************************************
     * avatarUrl
     ************************************************/
    public async setAvatarUrl(url: string): Promise<void> {
        // todo casablanca avatar url
        if (!this.matrixClient) {
            throw new Error('matrix client is undefined')
        }
        await this.matrixClient.setAvatarUrl(url)
    }

    /************************************************
     * setRoomTopic
     ************************************************/
    public async setRoomTopic(roomId: RoomIdentifier, name: string): Promise<void> {
        // todo casablanca display name
        if (!this.matrixClient) {
            throw new Error('matrix client is undefined')
        }

        await this.matrixClient.setRoomTopic(roomId.networkId, name)
    }

    /************************************************
     * getRoomTopic
     ************************************************/
    public async getRoomTopic(roomId: RoomIdentifier): Promise<string> {
        // todo casablanca display name
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
                throw new Error('not implemented')
            default:
                staticAssertNever(roomId)
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
            case SpaceProtocol.Matrix:
                {
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
                }
                break
            case SpaceProtocol.Casablanca:
                throw new Error('not implemented')
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * log
     *************************************************/
    protected log(message: string, ...optionalParams: unknown[]) {
        console.log(message, ...optionalParams)
    }

    private createShims(
        chainId: number,
        provider: TProvider | undefined,
        signer: ethers.Signer | undefined,
    ): { spaceDapp: ISpaceDapp } {
        const spaceDapp = new SpaceDapp(chainId, provider, signer)
        return {
            spaceDapp,
        }
    }

    /************************************************
     * createMatrixClient
     * helper, creates a matrix matrixClient with appropriate auth
     *************************************************/
    private static createMatrixClient(opts: ZionOpts, auth?: ZionAuth): MatrixClient {
        if (auth) {
            // just *accessing* indexedDB throws an exception in firefox with indexeddb disabled.
            let indexedDB: IDBFactory | undefined
            try {
                indexedDB = global.indexedDB
                // eslint-disable-next-line no-empty
            } catch (e) {}
            return createClient({
                baseUrl: opts.matrixServerUrl,
                accessToken: auth.accessToken,
                userId: auth.userId,
                deviceId: auth.deviceId,
                useAuthorizationHeader: true,
                cryptoStore: indexedDB
                    ? new IndexedDBCryptoStore(
                          global.indexedDB,
                          `matrix-js-sdk:crypto:${auth.userId}`,
                      )
                    : new LocalStorageCryptoStore(global.localStorage), // note, local storage doesn't support key sharing
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

    public setEventHandlers(eventHandlers: ZionClientEventHandlers) {
        this._eventHandlers = eventHandlers
    }
}
