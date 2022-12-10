import {
    ClientEvent,
    EventType,
    MatrixClient,
    Room as MatrixRoom,
    PendingEventOrdering,
    RelationType,
    User,
    UserEvent,
    createClient,
    MatrixError,
} from 'matrix-js-sdk'
import { BigNumber, BytesLike, ContractReceipt, ContractTransaction } from 'ethers'
import {
    CreateChannelInfo,
    CreateSpaceInfo,
    EditMessageOptions,
    PowerLevel,
    PowerLevels,
    SendMessageOptions,
    SendTextMessageOptions,
} from '../types/matrix-types'
import { RoomIdentifier } from '../types/room-identifier'
import { RoleIdentifier } from '../types/web3-types'
import { AuthenticationData, LoginTypePublicKey, RegisterRequest } from '../hooks/login'
import { NewSession, newRegisterSession, newLoginSession } from '../hooks/use-matrix-wallet-sign-in'
import {
    IZionServerVersions,
    TransactionContext,
    TransactionStatus,
    ZionAccountDataType,
    ZionAuth,
    ZionOpts,
} from './ZionClientTypes'

import { createZionChannel } from './matrix/CreateChannel'
import { createZionSpace } from './matrix/CreateSpace'
import { editZionMessage } from './matrix/EditMessage'
import { enrichPowerLevels } from './matrix/PowerLevels'
import { inviteZionUser } from './matrix/InviteUser'
import { joinZionRoom } from './matrix/Join'
import { sendZionMessage } from './matrix/SendMessage'
import { setZionPowerLevel } from './matrix/SetPowerLevels'
import { syncZionSpace } from './matrix/SyncSpace'
import { CustomMemoryStore } from './store/CustomMatrixStore'
import { toZionRoom } from '../store/use-matrix-store'
import { SyncState } from 'matrix-js-sdk/lib/sync'
import { IStore } from 'matrix-js-sdk/lib/store'
import { DataTypes, ZionSpaceManagerShim } from './web3/shims/ZionSpaceManagerShim'
import { CouncilNFTShim } from './web3/shims/CouncilNFTShim'
import { ZionRoleManagerShim } from './web3/shims/ZionRoleManagerShim'
import { loadOlm } from './loadOlm'
import { TokenEntitlementModuleShim } from './web3/shims/TokenEntitlementModuleShim'
import { UserGrantedEntitlementModuleShim } from './web3/shims/UserGrantedEntitlementModuleShim'
import { FullyReadMarker } from '../types/timeline-types'

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
    public store: CustomMemoryStore
    public get auth(): ZionAuth | undefined {
        return this._auth
    }
    /// chain id at the time the contracts were created
    /// contracts are recreated when the client is started
    public get chainId(): number {
        return this._chainId
    }
    public spaceManager: ZionSpaceManagerShim
    public councilNFT: CouncilNFTShim
    public roleManager: ZionRoleManagerShim
    public tokenEntitlementModule: TokenEntitlementModuleShim
    public userGrantedEntitlementModule: UserGrantedEntitlementModuleShim
    public matrixClient: MatrixClient
    private _chainId: number
    private _auth?: ZionAuth

    constructor(opts: ZionOpts, chainId?: number, name?: string) {
        this.opts = opts
        this.name = name || ''
        this._chainId = chainId ?? 0
        console.log('~~~ new ZionClient ~~~', this.name, this.opts)
        ;({ matrixClient: this.matrixClient, store: this.store } = ZionClient.createMatrixClient(
            opts.matrixServerUrl,
            this._auth,
        ))

        this.spaceManager = new ZionSpaceManagerShim(
            this.opts.web3Provider,
            this.opts.web3Signer,
            this.chainId,
        )
        this.councilNFT = new CouncilNFTShim(
            this.opts.web3Provider,
            this.opts.web3Signer,
            this.chainId,
        )
        this.roleManager = new ZionRoleManagerShim(
            this.opts.web3Provider,
            this.opts.web3Signer,
            this.chainId,
        )

        this.tokenEntitlementModule = new TokenEntitlementModuleShim(
            this.opts.web3Provider,
            this.opts.web3Signer,
            this.chainId,
        )

        this.userGrantedEntitlementModule = new UserGrantedEntitlementModuleShim(
            this.opts.web3Provider,
            this.opts.web3Signer,
            this.chainId,
        )
    }

    /************************************************
     * getVersion
     *************************************************/
    public async getServerVersions() {
        const version = await this.matrixClient.getVersions()
        return version as IZionServerVersions
    }

    public async isUserRegistered(username: string): Promise<boolean> {
        const isAvailable = await this.matrixClient.isUsernameAvailable(username)
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
        this.stopClient()
        try {
            await this.matrixClient.logout()
        } catch (error) {
            this.log("caught error while trying to logout, but we're going to ignore it", error)
        }
        try {
            await this.matrixClient.clearStores()
        } catch (error) {
            this.log(
                "caught error while trying to clearStores, but we're going to ignore it",
                error,
            )
        }

        this._auth = undefined
        ;({ matrixClient: this.matrixClient, store: this.store } = ZionClient.createMatrixClient(
            this.opts.matrixServerUrl,
            this._auth,
        ))
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
        return await newRegisterSession(this.matrixClient, walletAddress)
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
        const { access_token, device_id, user_id } = await this.matrixClient.registerRequest(
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
        return await newLoginSession(this.matrixClient)
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

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const { access_token, device_id, user_id } = await this.matrixClient.login(
            LoginTypePublicKey,
            {
                auth,
            },
        )
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
     * startClient
     * start the matrix matrixClient, add listeners
     *************************************************/
    public async startClient(auth: ZionAuth, chainId: number) {
        if (this.auth) {
            throw new Error('already authenticated')
        }
        if (this.matrixClient.clientRunning) {
            throw new Error('matrixClient already running')
        }
        // log startOpts
        this.log('Starting matrixClient')
        // set auth, chainId
        this._auth = auth
        this._chainId = chainId
        // new contracts
        this.spaceManager = new ZionSpaceManagerShim(
            this.opts.web3Provider,
            this.opts.web3Signer,
            this.chainId,
        )
        this.councilNFT = new CouncilNFTShim(
            this.opts.web3Provider,
            this.opts.web3Signer,
            this.chainId,
        )
        // new matrixClient
        ;({ matrixClient: this.matrixClient, store: this.store } = ZionClient.createMatrixClient(
            this.opts.matrixServerUrl,
            this._auth,
        ))
        // start it up, this begins a sync command
        if (!this.opts.disableEncryption) {
            await loadOlm()
            await this.matrixClient.initCrypto()
            // disable log...
            this.matrixClient.setGlobalErrorOnUnknownDevices(false)
        }
        // start matrixClient
        await this.matrixClient.startClient({
            pendingEventOrdering: PendingEventOrdering.Chronological,
            initialSyncLimit: this.opts.initialSyncLimit,
        })
        // wait for the sync to complete
        const initialSync = new Promise<string>((resolve, reject) => {
            this.matrixClient.once(
                ClientEvent.Sync,
                (state: SyncState, prevState: unknown, res: unknown) => {
                    if (state === SyncState.Prepared) {
                        this.log('initial sync complete', this.matrixClient.getRooms())
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
     * stopClient
     *************************************************/
    public stopClient() {
        this.matrixClient.stopClient()
        this.matrixClient.removeAllListeners()
        this.log('Stopped matrixClient')
    }

    /************************************************
     * createBasicWeb3Space
     *************************************************/
    public async createBasicWeb3Space(
        createSpaceInfo: CreateSpaceInfo,
    ): Promise<RoomIdentifier | undefined> {
        const emptyPermissions: DataTypes.PermissionStruct[] = []
        const emptyExternalTokenEntitlements: DataTypes.ExternalTokenEntitlementStruct[] = []
        const spaceEntitlementData: DataTypes.CreateSpaceEntitlementDataStruct = {
            roleName: '',
            permissions: emptyPermissions,
            externalTokenEntitlements: emptyExternalTokenEntitlements,
            users: [],
        }
        return this.createWeb3Space(createSpaceInfo, spaceEntitlementData, emptyPermissions)
    }

    /************************************************
     * createWeb3Space
     *************************************************/
    public async createWeb3Space(
        createSpaceInfo: CreateSpaceInfo,
        spaceEntitlementData: DataTypes.CreateSpaceEntitlementDataStruct,
        everyonePermissions: DataTypes.PermissionStruct[],
    ): Promise<RoomIdentifier | undefined> {
        const txContext = await this.createSpaceTransaction(
            createSpaceInfo,
            spaceEntitlementData,
            everyonePermissions,
        )
        const rxContext = await this.waitForCreateSpaceTransaction(txContext)
        return rxContext?.data
    }

    public async createSpaceTransaction(
        createSpaceInfo: CreateSpaceInfo,
        spaceEntitlementData: DataTypes.CreateSpaceEntitlementDataStruct,
        everyonePermissions: DataTypes.PermissionStruct[],
    ): Promise<TransactionContext<RoomIdentifier>> {
        const roomId: RoomIdentifier | undefined = await this.createSpace(createSpaceInfo)

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

        const spaceInfo: DataTypes.CreateSpaceDataStruct = {
            spaceName: createSpaceInfo.name,
            spaceNetworkId: roomId.networkId,
            spaceMetadata: createSpaceInfo.spaceMetadata ?? '',
        }
        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined

        try {
            transaction = await this.spaceManager.createSpace(
                spaceInfo,
                spaceEntitlementData,
                everyonePermissions,
            )
            console.log(`[createSpaceTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            console.error('[createSpaceTransaction] error', err)
            error = await this.onErrorLeaveRoomAndDecodeError(err, roomId)
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
            error = await this.onErrorLeaveRoomAndDecodeError(err, roomId)
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
            error = await this.onErrorLeaveRoomAndDecodeError(
                new Error('Failed to create space'),
                roomId,
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
    public async createSpace(createSpaceInfo: CreateSpaceInfo): Promise<RoomIdentifier> {
        return createZionSpace({
            matrixClient: this.matrixClient,
            createSpaceInfo,
            disableEncryption: this.opts.disableEncryption,
        })
    }

    /************************************************
     * createChannel
     *************************************************/
    public async createChannel(createInfo: CreateChannelInfo): Promise<RoomIdentifier> {
        return createZionChannel({
            matrixClient: this.matrixClient,
            createInfo: createInfo,
            disableEncryption: this.opts.disableEncryption,
        })
    }

    /************************************************
     * createWeb3Channel
     *************************************************/
    public async createWeb3Channel(
        createChannelInfo: CreateChannelInfo,
    ): Promise<RoomIdentifier | undefined> {
        let roomIdentifier: RoomIdentifier | undefined = await this.createChannel(createChannelInfo)

        console.log('[createWeb3Channel] Matrix createChannel', roomIdentifier)

        if (roomIdentifier) {
            const channelInfo: DataTypes.CreateChannelDataStruct = {
                spaceNetworkId: createChannelInfo.parentSpaceId.networkId,
                channelName: createChannelInfo.name,
                channelNetworkId: roomIdentifier.networkId,
                roleIds: createChannelInfo.roleIds,
            }
            let transaction: ContractTransaction | undefined = undefined
            let receipt: ContractReceipt | undefined = undefined
            try {
                transaction = await this.spaceManager.createChannel(channelInfo)
                receipt = await transaction.wait()
            } catch (err: unknown) {
                const decodedError = this.getDecodedError(err)
                console.error('[createWeb3Channel] failed', decodedError)
                throw decodedError
            }

            if (receipt?.status === 1) {
                // Successful created the channel on-chain.
                const channelId = await this.spaceManager.unsigned.getChannelIdByNetworkId(
                    createChannelInfo.parentSpaceId.networkId,
                    roomIdentifier.networkId,
                )
                console.log('[createWeb3Channel] success', {
                    channelId,
                    channelMatrixRoomId: roomIdentifier.networkId,
                })
            } else {
                // On-chain channel creation failed. Abandon this channel.
                console.error('[createWeb3Channel] failed')
                await this.leave(roomIdentifier)
                roomIdentifier = undefined
            }
        }

        return roomIdentifier
    }

    /************************************************
     * isEntitled
     *************************************************/
    public async isEntitled(
        spaceId: string,
        channelId: string,
        user: string,
        permission: DataTypes.PermissionStruct,
    ): Promise<boolean> {
        const isEntitled: boolean = await this.spaceManager.unsigned.isEntitled(
            spaceId,
            channelId,
            user,
            permission,
        )
        console.log('[isEntitled] is user entitlted for channel and space for permission', {
            user: user,
            spaceId: spaceId,
            channelId: channelId,
            permission: permission.name,
        })
        return isEntitled
    }

    /************************************************
     * getSpaceInfoBySpaceId
     *************************************************/
    public async getSpaceInfoBySpaceId(spaceNetworkId: string): Promise<DataTypes.SpaceInfoStruct> {
        return this.spaceManager.unsigned.getSpaceInfoBySpaceId(spaceNetworkId)
    }

    /************************************************
     * createRole
     *************************************************/
    public async createRole(
        spaceNetworkId: string,
        name: string,
    ): Promise<RoleIdentifier | undefined> {
        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let roleIdentifier: RoleIdentifier | undefined = undefined
        let roleId: string | undefined = undefined
        let roleName: string | undefined = undefined
        try {
            transaction = await this.spaceManager.signed.createRole(spaceNetworkId, name)
            receipt = await transaction.wait()
        } catch (err) {
            const decodedError = this.getDecodedError(err)
            console.error('[createRole] failed', decodedError)
            throw decodedError
        } finally {
            if (receipt?.status === 1) {
                // Successful created the role on-chain.
                console.log('[createRole] createRole successful', receipt?.logs[0].topics[2])
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
            transaction = await this.spaceManager.signed.setSpaceAccess(spaceNetworkId, disabled)
            receipt = await transaction.wait()
        } catch (err) {
            const decodedError = this.getDecodedError(err)
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
        return inviteZionUser({ matrixClient: this.matrixClient, userId, roomId })
    }

    /************************************************
     * leave
     * ************************************************/
    // eslint-disable-next-line @typescript-eslint/ban-types
    public async leave(roomId: RoomIdentifier): Promise<void> {
        await this.matrixClient.leave(roomId.networkId)
    }

    /************************************************
     * joinRoom
     * at the time of writing, both spaces and channels are
     * identified by a room id, this function handls joining both
     *************************************************/
    public async joinRoom(roomId: RoomIdentifier) {
        const matrixRoom = await joinZionRoom({ matrixClient: this.matrixClient, roomId })
        return toZionRoom(matrixRoom)
    }

    /************************************************
     * sendMessage
     *************************************************/
    public async sendMessage(
        roomId: RoomIdentifier,
        message: string,
        options?: SendMessageOptions,
    ) {
        return await sendZionMessage(this.matrixClient, roomId, message, options)
    }

    public async sendReaction(
        roomId: RoomIdentifier,
        eventId: string,
        reaction: string,
    ): Promise<void> {
        const newEventId = await this.matrixClient.sendEvent(roomId.networkId, EventType.Reaction, {
            'm.relates_to': {
                rel_type: RelationType.Annotation,
                event_id: eventId,
                key: reaction,
            },
        })
        console.log('sendReaction', newEventId)
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
        return await editZionMessage(this.matrixClient, roomId, message, options, msgOptions)
    }

    /************************************************
     * redactEvent
     *************************************************/
    public async redactEvent(roomId: RoomIdentifier, eventId: string, reason?: string) {
        const resp = await this.matrixClient.redactEvent(roomId.networkId, eventId, undefined, {
            reason,
        })
        console.log('event redacted', roomId.networkId, eventId, resp)
    }
    /************************************************
     * sendNotice
     *************************************************/
    public async sendNotice(roomId: RoomIdentifier, message: string): Promise<void> {
        await this.matrixClient.sendNotice(roomId.networkId, message)
    }

    /************************************************
     * syncSpace
     *************************************************/
    public async syncSpace(spaceId: RoomIdentifier | string) {
        if (!this.auth) {
            throw new Error('not authenticated')
        }
        return syncZionSpace(this.matrixClient, spaceId, this.auth.userId)
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
        const room = this.matrixClient.getRoom(roomId.networkId)
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
        const response = await setZionPowerLevel(this.matrixClient, roomId, current, newValue)
        this.log(
            `updted power level ${current.definition.key} for room[${roomId.networkId}] from ${current.value} to ${newValue}`,
            response,
        )
    }

    /************************************************
     * isRoomEncrypted
     ************************************************/
    public isRoomEncrypted(roomId: RoomIdentifier): boolean {
        return this.matrixClient.isRoomEncrypted(roomId.networkId)
    }

    /************************************************
     * setRoomFullyReadData
     ************************************************/
    public async setRoomFullyReadData(
        roomId: RoomIdentifier,
        content: Record<string, FullyReadMarker>,
    ) {
        return this.matrixClient.setRoomAccountData(
            roomId.networkId,
            ZionAccountDataType.FullyRead,
            content,
        )
    }

    /************************************************
     * getRoom
     ************************************************/
    public getRoom(roomId: RoomIdentifier | string): MatrixRoom | undefined {
        if (typeof roomId === 'string') {
            return this.matrixClient.getRoom(roomId) ?? undefined
        } else {
            return this.matrixClient.getRoom(roomId.networkId) ?? undefined
        }
    }

    /************************************************
     * getRooms
     ************************************************/
    public getRooms(): MatrixRoom[] {
        return this.matrixClient.getRooms()
    }

    /************************************************
     * getUser
     ************************************************/
    public getUser(userId: string): User | null {
        return this.matrixClient.getUser(userId)
    }

    /************************************************
     * getProfileInfo
     ************************************************/
    public async getProfileInfo(
        userId: string,
    ): Promise<{ avatar_url?: string; displayname?: string }> {
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
        await this.matrixClient.setDisplayName(name)
    }

    /************************************************
     * avatarUrl
     ************************************************/
    public async setAvatarUrl(url: string): Promise<void> {
        await this.matrixClient.setAvatarUrl(url)
    }

    /************************************************
     * scrollback
     ************************************************/
    public async scrollback(roomId: RoomIdentifier, limit?: number): Promise<void> {
        const room = this.matrixClient.getRoom(roomId.networkId)
        if (!room) {
            throw new Error('room not found')
        }
        await this.matrixClient.scrollback(room, limit)
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
        const room = this.matrixClient.getRoom(roomId.networkId)
        if (!room) {
            throw new Error(`room with id ${roomId.networkId} not found`)
        }
        const event = eventId
            ? room.findEventById(eventId)
            : room.getLiveTimeline().getEvents().at(-1)
        if (!event) {
            throw new Error(
                `event for room ${roomId.networkId} eventId: ${eventId ?? 'at(-1)'} not found`,
            )
        }
        const result = await this.matrixClient.sendReadReceipt(event)
        this.log('read receipt sent', result)
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
    private static createMatrixClient(
        baseUrl: string,
        auth?: ZionAuth,
    ): { store: CustomMemoryStore; matrixClient: MatrixClient } {
        const store = new CustomMemoryStore({ localStorage: global.localStorage })
        if (auth) {
            return {
                store: store,
                matrixClient: createClient({
                    store: store as IStore,
                    baseUrl: baseUrl,
                    accessToken: auth.accessToken,
                    userId: auth.userId,
                    deviceId: auth.deviceId,
                    useAuthorizationHeader: true,
                }),
            }
        } else {
            return {
                store: store,
                matrixClient: createClient({
                    store: store as IStore,
                    baseUrl: baseUrl,
                }),
            }
        }
    }

    private async onErrorLeaveRoomAndDecodeError(
        error: unknown,
        roomId: RoomIdentifier | undefined,
    ): Promise<Error> {
        if (roomId) {
            await this.leave(roomId)
        }
        return this.getDecodedError(error)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private getDecodedError(err: any): Error {
        let decodedError: Error | undefined = undefined
        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const revertData: BytesLike = err.error?.error?.error?.data
            const errDescription = this.spaceManager.signed.interface.parseError(revertData)
            decodedError = {
                name: errDescription.errorFragment.name,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                message: err.error?.error?.error?.message,
            }

            return decodedError

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            console.error('[getDecodedError]', e)
            return {
                name: 'unknown error',
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                message: e.message,
            }
        }
    }
}
