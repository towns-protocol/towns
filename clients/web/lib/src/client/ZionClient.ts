import { AuthenticationData, LoginTypePublicKey, RegisterRequest } from '../hooks/login'
import { BigNumber, ContractReceipt, ContractTransaction, Wallet, ethers } from 'ethers'
import { Client as CasablancaClient, makeZionRpcClient } from '@zion/client'
import {
    ChannelTransactionContext,
    IZionServerVersions,
    SpaceProtocol,
    TransactionContext,
    TransactionStatus,
    ZionAccountDataType,
    ZionAuth,
    ZionOpts,
} from './ZionClientTypes'
import {
    ClientEvent,
    EventType,
    MatrixClient,
    MatrixError,
    Room as MatrixRoom,
    PendingEventOrdering,
    RelationType,
    User,
    UserEvent,
    createClient,
} from 'matrix-js-sdk'
import { LocalStorageCryptoStore } from 'matrix-js-sdk/lib/crypto/store/localStorage-crypto-store'
import {
    CreateChannelInfo,
    CreateSpaceInfo,
    EditMessageOptions,
    PowerLevel,
    PowerLevels,
    SendMessageOptions,
    SendTextMessageOptions,
} from '../types/matrix-types'
import { NewSession, newLoginSession, newRegisterSession } from '../hooks/use-matrix-wallet-sign-in'
import { SignerContext, publicKeyToBuffer } from '@zion/core'

import { CouncilNFTShim } from './web3/shims/CouncilNFTShim'
import { FullyReadMarker } from '../types/timeline-types'
import { ISpaceDapp } from './web3/ISpaceDapp'
import { Permission } from './web3/ContractTypes'
import { RoleIdentifier } from '../types/web3-types'
import { RoomIdentifier } from '../types/room-identifier'
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
import { getContractsInfo } from './web3/IStaticContractsInfo'
import { inviteMatrixUser } from './matrix/InviteUser'
import { joinMatrixRoom } from './matrix/Join'
import { loadOlm } from './loadOlm'
import { sendMatrixMessage } from './matrix/SendMessage'
import { setMatrixPowerLevel } from './matrix/SetPowerLevels'
import { staticAssertNever } from '../utils/zion-utils'
import { syncMatrixSpace } from './matrix/SyncSpace'
import { toZionRoom } from '../store/use-matrix-store'
import { toZionRoomFromStream } from './casablanca/CasablancaUtils'

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
export class ZionClient {
    public readonly opts: ZionOpts
    public readonly name: string
    public spaceDapp: ISpaceDapp
    public councilNFT: CouncilNFTShim
    public matrixClient?: MatrixClient
    public casablancaClient?: CasablancaClient
    private _chainId: number
    private _auth?: ZionAuth

    constructor(opts: ZionOpts, chainId?: number, name?: string) {
        this.opts = opts
        this.name = name || ''
        this._chainId = chainId ?? 0
        console.log('~~~ new ZionClient ~~~', this.name, this.opts)
        this.matrixClient = ZionClient.createMatrixClient(opts.matrixServerUrl, this._auth)
        const { spaceDapp, councilNFT } = this.createShims(
            this._chainId,
            this.opts.web3Provider,
            this.opts.web3Signer,
        )
        this.spaceDapp = spaceDapp
        this.councilNFT = councilNFT
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
        const matrixClient = ZionClient.createMatrixClient(this.opts.matrixServerUrl)
        const version = await matrixClient.getVersions()
        // TODO casablanca, return server versions
        return version as IZionServerVersions
    }

    /************************************************
     * isUserRegistered
     *************************************************/
    public async isUserRegistered(username: string): Promise<boolean> {
        const matrixClient = ZionClient.createMatrixClient(this.opts.matrixServerUrl)
        const isAvailable = await matrixClient.isUsernameAvailable(username)
        // If the username is available, then it is not yet registered.
        return isAvailable === false
    }

    /************************************************
     * logout
     *************************************************/
    public async logout(): Promise<void> {
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

        this._auth = undefined
        this.matrixClient = ZionClient.createMatrixClient(this.opts.matrixServerUrl, this._auth)
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
            creatorAddress: primaryAddress,
            delegateSig: delegateSig,
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
        const matrixClient = ZionClient.createMatrixClient(this.opts.matrixServerUrl)
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
        const matrixClient = ZionClient.createMatrixClient(this.opts.matrixServerUrl)
        const { access_token, device_id, user_id } = await matrixClient.registerRequest(
            request,
            LoginTypePublicKey,
        )
        if (!access_token || !device_id || !user_id) {
            throw new Error('failed to register')
        }
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
        const matrixClient = ZionClient.createMatrixClient(this.opts.matrixServerUrl)
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
        const matrixClient = ZionClient.createMatrixClient(this.opts.matrixServerUrl)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const { access_token, device_id, user_id } = await matrixClient.login(LoginTypePublicKey, {
            auth,
        })
        if (!access_token || !device_id || !user_id) {
            throw new Error('failed to login')
        }

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
        const { spaceDapp, councilNFT } = this.createShims(
            this._chainId,
            this.opts.web3Provider,
            this.opts.web3Signer,
        )
        this.spaceDapp = spaceDapp
        this.councilNFT = councilNFT
        // new matrixClient
        this.matrixClient = ZionClient.createMatrixClient(this.opts.matrixServerUrl, this._auth)
        // start it up, this begins a sync command
        if (!this.matrixClient.crypto) {
            await loadOlm()
        }
        await this.matrixClient.initCrypto()
        // disable log...
        this.matrixClient.setGlobalErrorOnUnknownDevices(false)
        // start matrixClient
        await this.matrixClient.startClient({
            pendingEventOrdering: PendingEventOrdering.Chronological,
            initialSyncLimit: this.opts.initialSyncLimit,
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
        const rpcClient = makeZionRpcClient(this.opts.casablancaServerUrl)
        this.casablancaClient = new CasablancaClient(context, rpcClient)
        // TODO - long-term the app should already know if user exists via cookie
        const userExists = await this.casablancaClient.userExists()
        if (!userExists) {
            await this.casablancaClient.createNewUser()
        } else {
            await this.casablancaClient.loadExistingUser()
        }

        void this.casablancaClient.startSync()
    }

    /************************************************
     * stopMatrixClient
     *************************************************/
    public stopMatrixClient() {
        this.matrixClient?.stopClient()
        this.matrixClient?.removeAllListeners()
        this.matrixClient = undefined
        this.log('Stopped matrixClient')
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

    /************************************************
     * createSpace
     *************************************************/
    public async createSpace(
        createSpaceInfo: CreateSpaceInfo,
        memberEntitlements: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct,
        everyonePermissions: Permission[],
    ): Promise<RoomIdentifier | undefined> {
        const txContext = await this.createSpaceTransaction(
            createSpaceInfo,
            memberEntitlements,
            everyonePermissions,
        )
        if (txContext.error) {
            throw txContext.error
        }
        if (txContext.status === TransactionStatus.Pending) {
            const rxContext = await this.waitForCreateSpaceTransaction(txContext)
            return rxContext?.data
        }
        // Something went wrong. Don't return a room identifier.
        return undefined
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

        console.log('[createSpaceTransaction] Matrix space created', roomId)

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
            case SpaceProtocol.Matrix:
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                return createMatrixChannel(this.matrixClient, createInfo)
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
            const _error = new Error('Matrix createChannel failed')
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

        console.log('[createChannelTransaction] Matrix channel created', roomId)

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
            receipt = await transaction.wait()
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

    /************************************************
     * isEntitled
     *************************************************/
    public isEntitled(
        spaceId: string,
        channelId: string,
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

    /************************************************
     * createRole
     *************************************************/
    public async createRole(
        spaceNetworkId: string,
        name: string,
        permissions: Permission[],
        tokens: SpaceFactoryDataTypes.ExternalTokenStruct[],
        users: string[],
    ): Promise<RoleIdentifier | undefined> {
        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let roleIdentifier: RoleIdentifier | undefined = undefined
        let roleId: string | undefined = undefined
        let roleName: string | undefined = undefined
        try {
            transaction = await this.spaceDapp.createRole(
                spaceNetworkId,
                name,
                permissions,
                tokens,
                users,
            )
            receipt = await transaction.wait()
        } catch (err) {
            const decodedError = this.getDecodedErrorForSpace(spaceNetworkId, err)
            console.error('[createRole] failed', decodedError)
            throw decodedError
        } finally {
            if (receipt?.status === 1) {
                // Successful created the role on-chain.
                console.log('[createRoleWithEntitlementData] success', receipt?.logs[0].topics[2])
                roleId = BigNumber.from(receipt?.logs[0].topics[2]).toString()
                // John: how can we best decode this 32 byte hex string to a human readable string ?
                roleName = receipt?.logs[0].topics[3]
                roleIdentifier = { roleId, name: roleName, spaceNetworkId }
            } else {
                // On-chain role creation failed.
                console.error('[createRole] failed')
            }
        }
        return roleIdentifier
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
            const decodedError = this.getDecodedErrorForSpace(spaceNetworkId, err)
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
                return inviteMatrixUser({ matrixClient: this.matrixClient, userId, roomId })
            case SpaceProtocol.Casablanca:
                throw new Error('inviteUser not implemented for Casablanca')
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * leave
     * ************************************************/
    // eslint-disable-next-line @typescript-eslint/ban-types
    public async leave(roomId: RoomIdentifier): Promise<void> {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix:
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                await this.matrixClient.leave(roomId.networkId)
                break
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
    public async joinRoom(roomId: RoomIdentifier) {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix: {
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                const matrixRoom = await joinMatrixRoom({ matrixClient: this.matrixClient, roomId })
                return toZionRoom(matrixRoom)
            }
            case SpaceProtocol.Casablanca: {
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
                return sendMatrixMessage(this.matrixClient, roomId, message, options)
            case SpaceProtocol.Casablanca:
                if (!this.casablancaClient) {
                    throw new Error('Casablanca client not initialized')
                }
                return this.casablancaClient.sendMessage(roomId.networkId, message)
            default:
                staticAssertNever(roomId)
        }
    }

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
                throw new Error('sendReaction not implemented for Casablanca')
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * sendMessage
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
                throw new Error('not implemented')
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
    public async syncSpace(spaceId: RoomIdentifier) {
        switch (spaceId.protocol) {
            case SpaceProtocol.Matrix:
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                return syncMatrixSpace(this.matrixClient, spaceId)
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
        const room = this.getRoom(roomId)
        if (!room) {
            throw new Error(`Room ${roomId.networkId} not found`)
        }
        const powerLevelsEvent = room.currentState.getStateEvents(EventType.RoomPowerLevels, '')
        const powerLevels = powerLevelsEvent ? powerLevelsEvent.getContent() : {}
        return enrichPowerLevels(powerLevels)
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
    public isRoomEncrypted(roomId: RoomIdentifier): boolean {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix:
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
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

    /************************************************
     * getRoom
     ************************************************/
    public getRoom(roomId: RoomIdentifier): MatrixRoom | undefined {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix:
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                return this.matrixClient.getRoom(roomId.networkId) ?? undefined
            case SpaceProtocol.Casablanca:
                throw new Error('not implemented')
            default:
                staticAssertNever(roomId)
        }
    }

    /************************************************
     * getUser
     ************************************************/
    public getUser(userId: string): User | null {
        // todo casablanca look for user in casablanca
        if (!this.matrixClient) {
            throw new Error('matrix client is undefined')
        }
        return this.matrixClient.getUser(userId)
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
        provider: ethers.providers.Provider | undefined,
        signer: ethers.Signer | undefined,
    ): { spaceDapp: ISpaceDapp; councilNFT: CouncilNFTShim } {
        const spaceDapp = new SpaceDapp(chainId, provider, signer)
        const contractsInfo = getContractsInfo(chainId)
        const councilNFT = new CouncilNFTShim(
            contractsInfo.councilNft.address.councilnft,
            contractsInfo.councilNft.abi,
            chainId,
            provider,
            signer,
        )
        return {
            spaceDapp,
            councilNFT,
        }
    }

    /************************************************
     * createMatrixClient
     * helper, creates a matrix matrixClient with appropriate auth
     *************************************************/
    private static createMatrixClient(baseUrl: string, auth?: ZionAuth): MatrixClient {
        if (auth) {
            return createClient({
                baseUrl: baseUrl,
                accessToken: auth.accessToken,
                userId: auth.userId,
                deviceId: auth.deviceId,
                useAuthorizationHeader: true,
                cryptoStore: new LocalStorageCryptoStore(global.localStorage),
            })
        } else {
            return createClient({
                baseUrl: baseUrl,
            })
        }
    }

    private async onErrorLeaveSpaceRoomAndDecodeError(
        roomId: RoomIdentifier | undefined,
        error: unknown,
    ): Promise<Error> {
        if (roomId) {
            await this.leave(roomId)
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
            await this.leave(channelRoomId)
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
}
