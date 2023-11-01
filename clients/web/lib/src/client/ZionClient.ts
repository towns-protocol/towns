import { BigNumber, ContractReceipt, ContractTransaction, Wallet, ethers } from 'ethers'
import { BlockchainTransactionEvent, RoomMessageEvent } from '../types/timeline-types'
import {
    Client as CasablancaClient,
    RiverDbManager,
    bin_fromHexString,
    makeOldTownsDelegateSig,
    makeStreamRpcClient,
    takeKeccakFingerprintInHex,
    userIdFromAddress,
} from '@river/sdk'
import { EncryptedDeviceData, FullyReadMarker, ToDeviceMessage } from '@river/proto'
import {
    ChannelTransactionContext,
    ChannelUpdateTransactionContext,
    CreateSpaceTransactionContext,
    IZionServerVersions,
    MatrixAuth,
    RoleTransactionContext,
    TransactionContext,
    TransactionStatus,
    ZionClientEventHandlers,
    ZionOpts,
    createTransactionContext,
    logTxnResult,
} from './ZionClientTypes'
import {
    CreateChannelInfo,
    CreateSpaceInfo,
    Membership,
    MessageType,
    Room,
    RoomMember,
    RoomVisibility,
    SendMessageOptions,
    SendTextMessageOptions,
    UpdateChannelInfo,
    User,
} from '../types/zion-types'
import { RoomIdentifier, makeRoomIdentifier } from '../types/room-identifier'
import { SignerContext } from '@river/sdk'
import { toZionCasablancaUser } from '../store/use-casablanca-store'
import { PushNotificationClient } from './PushNotificationClient'
import { SignerUndefinedError } from '../types/error-types'
import {
    createCasablancaChannel,
    updateCasablancaChannel,
} from './casablanca/CreateOrUpdateChannel'
import { createCasablancaSpace } from './casablanca/CreateSpace'
import { makeUniqueChannelStreamId } from '@river/sdk'
import { makeUniqueSpaceStreamId } from '@river/sdk'
import { staticAssertNever } from '../utils/zion-utils'
import { toUtf8String } from 'ethers/lib/utils.js'
import { toZionRoomFromStream } from './casablanca/CasablancaUtils'
import {
    DecryptionExtensionDelegate,
    RiverDecryptionExtension,
} from './casablanca/RiverDecryptionExtensions'
import { RoleIdentifier } from '../types/web3-types'
import {
    createSpaceDapp,
    ITownArchitectBase,
    ISpaceDapp,
    Permission,
    PioneerNFT,
    TokenEntitlementDataTypes,
    SpaceInfo,
} from '@river/web3'

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
 * the zion client will wrap the underlying river client and
 * ensure correct protocol business logic
 */

export class ZionClient implements DecryptionExtensionDelegate {
    public readonly opts: ZionOpts
    public readonly name: string
    public spaceDapp: ISpaceDapp
    public pioneerNFT: PioneerNFT
    protected casablancaClient?: CasablancaClient
    public riverDecryptionExtension?: RiverDecryptionExtension
    private riverDbManager: RiverDbManager
    private _auth?: MatrixAuth
    private _signerContext?: SignerContext
    protected _eventHandlers?: ZionClientEventHandlers
    private pushNotificationClient?: PushNotificationClient

    constructor(opts: ZionOpts, name?: string) {
        this.opts = opts
        this.name = name || ''
        console.log('~~~ new ZionClient ~~~', this.name, this.opts)
        this.riverDbManager = new RiverDbManager()
        this.spaceDapp = createSpaceDapp(opts.chainId, opts.web3Provider)
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
    // eslint-disable-next-line @typescript-eslint/require-await
    public async getServerVersions() {
        // TODO casablanca, return server versions
        return {
            versions: [],
            unstable_features: {},
            release_version: '0.0.0',
        } satisfies IZionServerVersions
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
        // TODO HNT-1829 - long-term the app should already know if user exists
        try {
            await this.casablancaClient.loadExistingUser()
        } catch (e) {
            console.log('user does not exist, creating new user', (e as Error).message)
            await this.casablancaClient.createNewUser()
        }
        await this.casablancaClient.initCrypto()
        this.riverDecryptionExtension = new RiverDecryptionExtension(this.casablancaClient, this)
        this._eventHandlers?.onRegister?.({
            userId: this.casablancaClient.userId,
        })

        await this.casablancaClient.startSync()

        return this.casablancaClient
    }

    /************************************************
     * stopCasablancaClient
     *************************************************/
    public async stopCasablancaClient() {
        if (this.riverDecryptionExtension) {
            this.riverDecryptionExtension?.stop()
            this.riverDecryptionExtension = undefined
        }
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
        await this.stopCasablancaClient()
    }

    public async createSpaceTransaction(
        createSpaceInfo: CreateSpaceInfo,
        membership: ITownArchitectBase.MembershipStruct,
        signer: ethers.Signer | undefined,
    ): Promise<CreateSpaceTransactionContext> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        return this.createCasablancaSpaceTransaction(createSpaceInfo, membership, signer)
    }

    public async waitForCreateSpaceTransaction(
        context: CreateSpaceTransactionContext | undefined,
    ): Promise<CreateSpaceTransactionContext> {
        const txContext = await this._waitForBlockchainTransaction(context)
        if (txContext.status === TransactionStatus.Success) {
            if (txContext.data) {
                const spaceId = txContext.data.spaceId
                const channelId = txContext.data.channelId
                // wait until the space and channel are minted on-chain
                // before creating the streams
                if (!this.casablancaClient) {
                    throw new Error("Casablanca client doesn't exist")
                }
                await createCasablancaSpace(this.casablancaClient, spaceId.networkId)
                console.log('[waitForCreateSpaceTransaction] Space stream created', spaceId)

                await this.createSpaceDefaultChannelRoom(spaceId, 'general', channelId)
                console.log(
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

    /************************************************
     * createSpace
     *************************************************/
    private async createSpaceRoom(
        _createSpaceInfo: CreateSpaceInfo,
        networkId?: string,
    ): Promise<RoomIdentifier> {
        if (!this.casablancaClient) {
            throw new Error("Casablanca client doesn't exist")
        }
        return createCasablancaSpace(this.casablancaClient, networkId)
    }

    private async createCasablancaSpaceTransaction(
        createSpaceInfo: CreateSpaceInfo,
        membership: ITownArchitectBase.MembershipStruct,
        signer: ethers.Signer,
    ): Promise<CreateSpaceTransactionContext> {
        const spaceId: RoomIdentifier = makeRoomIdentifier(makeUniqueSpaceStreamId())
        const channelId: RoomIdentifier = makeRoomIdentifier(makeUniqueChannelStreamId())

        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined

        try {
            transaction = await this.spaceDapp.createSpace(
                {
                    spaceId: spaceId.networkId,
                    spaceName: createSpaceInfo.name,
                    spaceMetadata: createSpaceInfo.name,
                    channelId: channelId.networkId,
                    channelName: createSpaceInfo.defaultChannelName ?? 'general', // default channel name
                    membership,
                },
                signer,
            )

            console.log(`[createCasablancaSpaceTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            console.error('[createCasablancaSpaceTransaction] error', err)
            error = this.getDecodedErrorForSpaceFactory(err)
        }

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: transaction
                ? {
                      spaceId,
                      spaceName: createSpaceInfo.name,
                      channelId,
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
    ): Promise<RoomIdentifier> {
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
            createInfo.streamSettings,
        )
    }

    private async createSpaceDefaultChannelRoom(
        parentSpaceId: RoomIdentifier,
        channelName?: string,
        channelId?: RoomIdentifier,
    ): Promise<RoomIdentifier> {
        const channelInfo: CreateChannelInfo = {
            name: channelName ?? 'general',
            visibility: RoomVisibility.Public,
            parentSpaceId,
            roleIds: [],
        }
        return await this.createChannelRoom(channelInfo, channelId?.networkId)
    }

    private async createCasablancaChannelTransaction(
        createChannelInfo: CreateChannelInfo,
        signer: ethers.Signer,
    ): Promise<ChannelTransactionContext> {
        const roomId: RoomIdentifier = makeRoomIdentifier(makeUniqueChannelStreamId())

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
            error = await this.getDecodedErrorForSpace(
                createChannelInfo.parentSpaceId.networkId,
                err,
            )
        }

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
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
            const rxContext = await this.waitForCreateChannelTransaction(
                createChannelInfo,
                txContext,
            )
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
        return this.createCasablancaChannelTransaction(createChannelInfo, signer)
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
                await this.createChannelRoom(createChannelInfo, roomId.networkId)
                console.log('[waitForCreateChannelTransaction] Channel stream created', roomId)
            }
        }

        if (txnContext.error) {
            txnContext.error = await this.getDecodedErrorForSpace(
                createChannelInfo.parentSpaceId.networkId,
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
        if (!updateChannelInfo.updatedChannelName) {
            throw new Error('updateChannel: channelName cannot be empty')
        }
        await updateCasablancaChannel(
            this.casablancaClient,
            updateChannelInfo.parentSpaceId.networkId,
            updateChannelInfo.updatedChannelName,
            updateChannelInfo.updatedChannelTopic ?? '',
            updateChannelInfo.channelId.networkId,
        )
    }

    /************************************************
     * DMs
     *************************************************/

    public async createDMChannel(userId: string): Promise<RoomIdentifier | undefined> {
        const client = this.casablancaClient
        if (!client) {
            throw new Error('No casablanca client')
        }
        const { streamId } = await client.createDMChannel(userId)
        return makeRoomIdentifier(streamId)
    }

    /************************************************
     * GDMs
     *************************************************/

    public async createGDMChannel(userIds: string[]): Promise<RoomIdentifier | undefined> {
        const client = this.casablancaClient
        if (!client) {
            throw new Error('No casablanca client')
        }
        const { streamId } = await client.createGDMChannel(userIds)
        return makeRoomIdentifier(streamId)
    }

    /************************************************
     * Media
     *************************************************/
    public async createMediaStream(channelId: string, chunkCount: number): Promise<string> {
        if (!this.casablancaClient) {
            throw new Error("Casablanca client doesn't exist")
        }
        const { streamId } = await this.casablancaClient.createMediaStream(channelId, chunkCount)
        return streamId
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
            )
        } else if (spaceId) {
            isEntitled = await this.spaceDapp.isEntitledToSpace(spaceId, user, permission)
        } else {
            // TODO: Implement entitlement checks for DMs (channels without a space)
            // https://linear.app/hnt-labs/issue/HNT-3112/implement-entitlement-checks
            isEntitled = true
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
        tokens: TokenEntitlementDataTypes.ExternalTokenStruct[],
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
            error = await this.spaceDapp.parseSpaceError(spaceNetworkId, err)
        }

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
            const roleId = BigNumber.from(txResult.receipt.logs[0].topics[2]).toNumber()
            // John: how can we best decode this 32 byte hex string to a human readable string ?
            const roleName = txResult.receipt.logs[0].topics[1]
            const roleIdentifier: RoleIdentifier = {
                roleId,
                name: roleName,
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
        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined
        try {
            transaction = await this.spaceDapp.updateSpaceName(spaceNetworkId, name, signer)
            console.log(`[updateSpaceNameTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            error = await this.spaceDapp.parseSpaceError(spaceNetworkId, err)
        }

        return createTransactionContext({
            transaction,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            error,
        })
    }

    public async updateRoleTransaction(
        spaceNetworkId: string,
        roleId: number,
        roleName: string,
        permissions: Permission[],
        tokens: TokenEntitlementDataTypes.ExternalTokenStruct[],
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
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }
        await this.casablancaClient.inviteUser(roomId.networkId, userId)
    }

    /************************************************
     * leave
     * ************************************************/
    public async leave(roomId: RoomIdentifier, _parentNetworkId?: string): Promise<void> {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }
        await this.casablancaClient.leaveStream(roomId.networkId)
    }

    /************************************************
     * joinRoom
     * - this function can handle joining both spaces and channels BUT should be used for channels only
     * - for spaces, use joinTown
     * @todo deprecate this in favor of separate joinTown and joinChannel functions
     *************************************************/
    public async joinRoom(
        roomId: RoomIdentifier,
        _parentNetworkId?: string,
        opts?: { skipWaitForMiniblockConfirmation: boolean },
    ) {
        // TODO: not doing event handlers here since Casablanca is not part of alpha
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }
        const stream = await this.casablancaClient.joinStream(roomId.networkId, opts)
        let parentId = roomId
        if (stream.view.contentKind === 'channelContent' && stream.view.channelContent.spaceId) {
            parentId = makeRoomIdentifier(stream.view.channelContent.spaceId)
        }
        this._eventHandlers?.onJoinRoom?.(roomId, parentId)
        return toZionRoomFromStream(stream, this.casablancaClient.userId)
    }

    /************************************************
     * joinTown
     * - mints membership if needed
     * - joins the space
     *************************************************/
    public async joinTown(spaceId: RoomIdentifier, signer: ethers.Signer | undefined) {
        if (!signer) {
            throw new SignerUndefinedError()
        }

        const wallet = await signer.getAddress()

        try {
            if (await this.spaceDapp.hasTownMembership(spaceId.networkId, wallet)) {
                return this.joinRoom(spaceId)
            }
        } catch (error) {
            const decodeError = this.getDecodedErrorForSpaceFactory(spaceId.networkId)
            console.error('[mintMembershipAndJoinRoom] failed', decodeError)
            throw decodeError
        }

        await this.mintMembershipTransaction(spaceId, signer)

        return this.joinRoom(spaceId)
    }

    /************************************************
     * mintMembershipTransaction
     *************************************************/
    public async mintMembershipTransaction(
        spaceId: RoomIdentifier,
        signer: ethers.Signer | undefined,
    ) {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        const wallet = await signer.getAddress()

        try {
            const transaction = await this.spaceDapp.joinTown(spaceId.networkId, wallet, signer)
            await transaction.wait()
        } catch (error) {
            const decodeError = await this.getDecodedErrorForSpace(spaceId.networkId, error)
            console.error('[mintMembershipAndJoinRoom] failed', decodeError)
            throw decodeError
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
        if (this.pushNotificationClient && options?.parentSpaceId) {
            await this.pushNotificationClient.sendNotificationTagIfAny(
                options.parentSpaceId.networkId,
                roomId.networkId,
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
                    await this.casablancaClient.sendChannelMessage_Text(roomId.networkId, {
                        threadId: options?.threadId,
                        threadPreview: options?.threadPreview,
                        content: {
                            body: message,
                            mentions: options?.mentions ?? [],
                        },
                    })
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
            case MessageType.EmbeddedMedia:
                await this.casablancaClient.sendChannelMessage_EmbeddedMedia(roomId.networkId, {
                    threadId: options.threadId,
                    threadPreview: options.threadPreview,
                    content: {
                        content: options.content,
                        info: {
                            sizeBytes: options.info.sizeBytes,
                            mimetype: options.info.mimetype,
                            widthPixels: options.info.widthPixels,
                            heightPixels: options.info.heightPixels,
                        },
                    },
                })
                break
            case MessageType.ChunkedMedia:
                await this.casablancaClient.sendChannelMessage_Media(roomId.networkId, {
                    threadId: options?.threadId,
                    threadPreview: options?.threadPreview,
                    content: {
                        streamId: options.streamId,
                        info: {
                            sizeBytes: options.info.sizeBytes,
                            mimetype: options.info.mimetype,
                            widthPixels: options.info.widthPixels,
                            heightPixels: options.info.heightPixels,
                        },
                        encryption: {
                            case: 'aesgcm',
                            value: {
                                iv: options.iv,
                                secretKey: options.secretKey,
                            },
                        },
                        thumbnail: {
                            info: {
                                sizeBytes: options.thumbnail.info.sizeBytes,
                                mimetype: options.thumbnail.info.mimetype,
                                widthPixels: options.thumbnail.info.widthPixels,
                                heightPixels: options.thumbnail.info.heightPixels,
                            },
                            content: options.thumbnail.content,
                        },
                    },
                })
                break
            default:
                staticAssertNever(options)
        }
        this._eventHandlers?.onSendMessage?.(roomId, message, options)
    }

    public async sendMediaPayload(streamId: string, data: Uint8Array, chunkIndex: number) {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }
        await this.casablancaClient.sendMediaPayload(streamId, data, chunkIndex)
    }

    public async sendBlockTxn(_roomId: RoomIdentifier, _txn: BlockchainTransactionEvent) {
        // blockchain transactions are not necessary, we can
        // just listen for channel events in the space stream
    }

    /************************************************
     * sendReaction
     *************************************************/
    public async sendReaction(
        roomId: RoomIdentifier,
        eventId: string,
        reaction: string,
    ): Promise<void> {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }
        await this.casablancaClient.sendChannelMessage_Reaction(roomId.networkId, {
            reaction,
            refEventId: eventId,
        })
        console.log('sendReaction')
    }

    /************************************************
     * canSendToDevice
     *************************************************/
    public async canSendToDeviceMessage(userId: string): Promise<boolean> {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }
        const devices = await this.casablancaClient.getStoredDevicesForUser(userId)
        return devices.size > 0
    }

    /************************************************
     * sendToDevice
     *************************************************/
    public async encryptAndSendToDeviceMessage(
        userId: string,
        type: string,
        content: ToDeviceMessage,
    ) {
        // todo casablanca look for user in casablanca
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }
        const canSend = await this.canSendToDeviceMessage(userId)
        if (!canSend) {
            throw new Error('cannot send to device for user ' + userId)
        }
        await this.casablancaClient.encryptAndSendToDevicesMessage(userId, content, type)
    }

    /************************************************
     * sendToDevice
     *************************************************/
    public async sendToDeviceMessage(userId: string, type: string, content: EncryptedDeviceData) {
        // todo casablanca look for user in casablanca
        if (!this.casablancaClient) {
            throw new Error('Casablanca client not initialized')
        }
        const canSend = await this.canSendToDeviceMessage(userId)
        if (!canSend) {
            throw new Error('cannot send to device for user ' + userId)
        }
        await this.casablancaClient.sendToDevicesMessage(userId, content, type)
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
        if (!this.casablancaClient) {
            throw new Error('casablanca client is undefined')
        }
        return await this.casablancaClient.sendChannelMessage_Edit_Text(roomId.networkId, eventId, {
            threadId: originalEventContent.inReplyTo,
            threadPreview: originalEventContent.threadPreview,
            content: {
                body: message,
                mentions: options?.mentions ?? [],
            },
        })
    }

    /************************************************
     * redactEvent
     *************************************************/
    public async redactEvent(roomId: RoomIdentifier, eventId: string, reason?: string) {
        if (!this.casablancaClient) {
            throw new Error('casablanca client is undefined')
        }
        await this.casablancaClient.sendChannelMessage_Redaction(roomId.networkId, {
            refEventId: eventId,
            reason,
        })
    }

    /************************************************
     * setRoomFullyReadData
     ************************************************/
    public async setRoomFullyReadData(
        channelId: RoomIdentifier,
        content: Record<string, FullyReadMarker>,
    ) {
        if (!this.casablancaClient) {
            throw new Error('Casablanca client is undefined')
        }
        await this.casablancaClient.sendFullyReadMarkers(channelId.networkId, content)
    }

    private getAllChannelMembershipsFromSpace(roomId: RoomIdentifier): Record<string, Membership> {
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
            spaceStream?.view?.spaceContent.spaceChannelsMetadata.keys() || [],
        )

        //We go through all the channels in the space and check if the user is invited or joined
        spaceChannels?.forEach((channel) => {
            if (userStreamRollup?.userContent.userInvitedStreams.has(channel)) {
                memberships[channel] = Membership.Invite
            }
            if (userStreamRollup?.userContent.userJoinedStreams.has(channel)) {
                memberships[channel] = Membership.Join
            }
        })

        return memberships
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
     * getRoomData
     ************************************************/
    public getRoomData(roomId: RoomIdentifier): Room | undefined {
        if (!this.casablancaClient) {
            throw new Error('casablanca client is undefined')
        }
        const stream = this.casablancaClient.stream(roomId.networkId)
        return stream ? toZionRoomFromStream(stream, this.casablancaClient.userId) : undefined
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
        //TODO: Make real implementation when user profile support will be implemented
        return toZionCasablancaUser(userId)
    }

    /************************************************
     * getProfileInfo
     ************************************************/
    // eslint-disable-next-line @typescript-eslint/require-await
    public async getProfileInfo(
        userId: string,
    ): Promise<{ avatar_url?: string; displayname?: string }> {
        // todo casablanca look for user in casablanca
        console.warn('[getProfileInfo] not implemented', userId)
        return { avatar_url: undefined, displayname: undefined }
    }

    /************************************************
     * setDisplayName
     ************************************************/
    // eslint-disable-next-line @typescript-eslint/require-await
    public async setDisplayName(name: string): Promise<void> {
        // todo casablanca display name
        console.error('not implemented for casablanca', name)
    }

    /************************************************
     * avatarUrl
     ************************************************/
    // eslint-disable-next-line @typescript-eslint/require-await
    public async setAvatarUrl(url: string): Promise<void> {
        // todo casablanca avatar url
        console.error('not implemented for casablanca', url)
    }

    /************************************************
     * setRoomTopic
     ************************************************/
    // eslint-disable-next-line @typescript-eslint/require-await
    public async setRoomTopic(_roomId: RoomIdentifier, _name: string): Promise<void> {
        console.error('not implemented for casablanca')
    }

    /************************************************
     * setRoomName
     ************************************************/
    // eslint-disable-next-line @typescript-eslint/require-await
    public async setRoomName(_roomId: RoomIdentifier, _name: string): Promise<void> {
        // todo casablanca display name
        console.error('not implemented for casablanca')
    }

    /************************************************
     * getRoomTopic
     ************************************************/
    // eslint-disable-next-line @typescript-eslint/require-await
    public async getRoomTopic(_roomId: RoomIdentifier): Promise<string> {
        console.error('not implemented for casablanca')
        return ''
    }

    /************************************************
     * scrollback
     ************************************************/
    public async scrollback(
        roomId: RoomIdentifier,
        _limit?: number,
    ): Promise<{
        terminus: boolean
        eventCount: number
        firstEventId?: string
        firstEventTimestamp?: number
    }> {
        if (!this.casablancaClient) {
            throw new Error('casablanca client is undefined')
        }
        const result = await this.casablancaClient.scrollback(roomId.networkId)
        return {
            terminus: result.terminus,
            eventCount: this.casablancaClient?.stream(roomId.networkId)?.view?.timeline.length ?? 0,
            firstEventId: result.firstEvent?.hashStr,
            firstEventTimestamp: result.firstEvent
                ? Number(result.firstEvent.event.createdAtEpocMs)
                : undefined,
        }
    }

    /************************************************
     * log
     *************************************************/
    protected log(message: string, ...optionalParams: unknown[]) {
        console.log(message, ...optionalParams)
    }

    /*
     * Error when web3Provider.waitForTransaction receipt has a status of 0
     */
    private async throwTransactionError(receipt: ContractReceipt): Promise<Error> {
        const code = await this.opts.web3Provider?.call(receipt, receipt.blockNumber)
        const reason = toUtf8String(`0x${code?.substring(138) || ''}`)
        throw new Error(reason)
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

    private async _waitForBlockchainTransaction<TxnContext>(
        context: TransactionContext<TxnContext> | undefined,
    ): Promise<TransactionContext<TxnContext>> {
        if (!context?.transaction) {
            return createTransactionContext<TxnContext>({
                status: TransactionStatus.Failed,
                error: new Error(`[_waitForBlockchainTransaction] transaction is undefined`),
            })
        }

        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let error: Error | undefined = undefined

        try {
            transaction = context.transaction
            receipt = await this.opts.web3Provider?.waitForTransaction(transaction.hash)

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
