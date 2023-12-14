import { Message, PlainMessage } from '@bufbuild/protobuf'
import {
    MembershipOp,
    ChannelOp,
    ChannelMessage_Post_Mention,
    ChannelMessage,
    ChannelMessage_Post,
    ChannelMessage_Post_Content_Text,
    ChannelMessage_Post_Content_Image,
    ChannelMessage_Post_Content_GM,
    ChannelMessage_Post_Content_ChunkedMedia,
    ChannelMessage_Reaction,
    ChannelMessage_Redaction,
    StreamEvent,
    EncryptedData,
    GetStreamResponse,
    CreateStreamResponse,
    StreamSettings,
    ChannelMessage_Post_Content_EmbeddedMedia,
    FullyReadMarkers,
    FullyReadMarker,
    Envelope,
    Err,
    SessionKeys,
} from '@river/proto'
import { Crypto } from './crypto/crypto'
import { OlmDevice } from './crypto/olmDevice'
import { MegolmSession, UserDevice, UserDeviceCollection } from './crypto/olmLib'
import { DLogger, dlog, dlogError } from './dlog'
import { errorContains, getRpcErrorProperty, StreamRpcClientType } from './makeStreamRpcClient'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { assert, check, hasElements, isDefined } from './check'
import {
    isChannelStreamId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    isSpaceStreamId,
    makeDMStreamId,
    makeUniqueChannelStreamId,
    makeUniqueGDMChannelStreamId,
    makeUniqueMediaStreamId,
    makeUniqueSpaceStreamId,
    makeUserDeviceKeyStreamId,
    makeUserSettingsStreamId,
    makeUserStreamId,
    makeUserToDeviceStreamId,
    userIdFromAddress,
} from './id'
import { SignerContext, makeEvent, unpackStreamResponse } from './sign'
import { StreamEvents } from './streamEvents'
import { StreamStateView } from './streamStateView'
import {
    make_UserDeviceKeyPayload_Inception,
    make_ChannelPayload_Inception,
    make_ChannelProperties,
    make_ChannelPayload_Membership,
    make_ChannelPayload_Message,
    make_SpacePayload_Inception,
    make_SpacePayload_Membership,
    make_UserPayload_Inception,
    make_SpacePayload_Channel,
    make_UserSettingsPayload_FullyReadMarkers,
    make_UserSettingsPayload_Inception,
    make_MediaPayload_Inception,
    make_MediaPayload_Chunk,
    make_DMChannelPayload_Inception,
    make_DMChannelPayload_Membership,
    make_DMChannelPayload_Message,
    make_GDMChannelPayload_Inception,
    make_GDMChannelPayload_Message,
    make_GDMChannelPayload_Membership,
    make_SpacePayload_DisplayName,
    StreamTimelineEvent,
    make_UserToDevicePayload_Ack,
    make_UserToDevicePayload_Inception,
    make_fake_encryptedData,
    make_UserDeviceKeyPayload_MegolmDevice,
    make_UserToDevicePayload_MegolmSessions,
    make_SpacePayload_Username,
    make_DMChannelPayload_DisplayName,
    make_GDMChannelPayload_DisplayName,
    make_DMChannelPayload_Username,
    make_GDMChannelPayload_Username,
} from './types'
import { bin_fromHexString, bin_toHexString, shortenHexString } from './binary'
import { CryptoStore } from './crypto/store/cryptoStore'

import debug from 'debug'
import { Stream } from './stream'
import { Code } from '@connectrpc/connect'
import { usernameChecksum, isIConnectError } from './utils'
import { EncryptedContent, toDecryptedContent } from './encryptedContentTypes'
import { DecryptionExtensions, EntitlementsDelegate } from './decryptionExtensions'
import { PersistenceStore } from './persistenceStore'
import { SyncedStreams } from './syncedStreams'
import { CachingStreamRpcClient } from './cachingStreamRpcClient'

export type EmittedEvents = StreamEvents

export class Client extends (EventEmitter as new () => TypedEmitter<EmittedEvents>) {
    readonly signerContext: SignerContext
    readonly rpcClient: CachingStreamRpcClient
    readonly userId: string
    readonly streams: SyncedStreams

    streamSyncActive = false
    userStreamId?: string
    userSettingsStreamId?: string
    userDeviceKeyStreamId?: string
    userToDeviceStreamId?: string

    private readonly logCall: DLogger
    private readonly logSync: DLogger
    private readonly logEmitFromStream: DLogger
    private readonly logEmitFromClient: DLogger
    private readonly logEvent: DLogger
    private readonly logError: DLogger
    private readonly logInfo: DLogger

    public cryptoBackend?: Crypto
    public cryptoStore: CryptoStore

    private getStreamRequests: Map<string, Promise<StreamStateView>> = new Map()
    private getScrollbackRequests: Map<string, ReturnType<typeof this.scrollback>> = new Map()
    private entitlementsDelegate: EntitlementsDelegate
    private decryptionExtensions?: DecryptionExtensions
    private persistenceStore: PersistenceStore

    constructor(
        signerContext: SignerContext,
        rpcClient: StreamRpcClientType,
        cryptoStore: CryptoStore,
        entitlementsDelegate: EntitlementsDelegate,
        logNamespaceFilter?: string,
    ) {
        super()
        if (logNamespaceFilter) {
            debug.enable(logNamespaceFilter)
        }
        assert(
            isDefined(signerContext.creatorAddress) && signerContext.creatorAddress.length === 20,
            'creatorAddress must be set',
        )
        assert(
            isDefined(signerContext.signerPrivateKey()) &&
                signerContext.signerPrivateKey().length === 64,
            'signerPrivateKey must be set',
        )
        this.entitlementsDelegate = entitlementsDelegate
        this.signerContext = signerContext
        this.rpcClient = new CachingStreamRpcClient(rpcClient)

        this.userId = userIdFromAddress(signerContext.creatorAddress)

        const shortId = shortenHexString(
            this.userId.startsWith('0x') ? this.userId.slice(2) : this.userId,
        )

        this.logCall = dlog('csb:cl:call').extend(shortId)
        this.logSync = dlog('csb:cl:sync').extend(shortId)
        this.logEmitFromStream = dlog('csb:cl:stream').extend(shortId)
        this.logEmitFromClient = dlog('csb:cl:emit').extend(shortId)
        this.logEvent = dlog('csb:cl:event').extend(shortId)
        this.logError = dlogError('csb:cl:error').extend(shortId)
        this.logInfo = dlog('csb:cl:info', { defaultEnabled: true }).extend(shortId)
        this.cryptoStore = cryptoStore
        this.persistenceStore = new PersistenceStore(
            `persistence-${cryptoStore.name.replace('database-', '')}`,
        )
        this.streams = new SyncedStreams(this.userId, this.rpcClient, this.persistenceStore, this)
        this.logCall('new Client')
    }

    get cryptoEnabled(): boolean {
        return this.cryptoBackend !== undefined
    }

    get olmDevice(): OlmDevice {
        if (!this.cryptoBackend) {
            throw new Error('cryptoBackend not initialized')
        }
        return this.cryptoBackend.olmDevice
    }

    async stop(): Promise<void> {
        this.logCall('stop')
        await this.decryptionExtensions?.stop()
        await this.stopSync()
    }

    stream(streamId: string): Stream | undefined {
        return this.streams.get(streamId)
    }

    private async initUserStream(
        userStreamId: string,
        response: GetStreamResponse | CreateStreamResponse,
    ): Promise<void> {
        assert(this.userStreamId === undefined, 'streamId must not be set')
        this.userStreamId = userStreamId
        await this.initStreamFromResponse(userStreamId, response)
    }

    private async initUserJoinedStreams() {
        assert(isDefined(this.userStreamId), 'userStreamId must be set')
        const stream = this.stream(this.userStreamId)
        assert(isDefined(stream), 'userStream must be set')
        stream.on('userJoinedStream', (s) => void this.onJoinedStream(s))
        stream.on('userInvitedToStream', (s) => void this.onInvitedToStream(s))
        stream.on('userLeftStream', (s) => void this.onLeftStream(s))

        const streamIds = [
            ...Array.from(stream.view.userContent.userJoinedStreams),
            ...Array.from(stream.view.userContent.userInvitedStreams).filter(
                (streamId) => isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId),
            ),
        ]

        return Promise.all(streamIds.map((streamId) => this.initStream(streamId))).then(() => {})
    }

    private async initUserSettingsStream(
        userSettingsStreamId: string,
        response: GetStreamResponse | CreateStreamResponse,
    ): Promise<void> {
        assert(this.userSettingsStreamId === undefined, 'streamId must not be set')
        this.userSettingsStreamId = userSettingsStreamId
        await this.initStreamFromResponse(userSettingsStreamId, response)
    }

    private async initUserDeviceKeyStream(
        userDeviceKeyStreamId: string,
        response: GetStreamResponse | CreateStreamResponse,
    ): Promise<void> {
        assert(this.userDeviceKeyStreamId === undefined, 'streamId must not be set')
        this.userDeviceKeyStreamId = userDeviceKeyStreamId
        await this.initStreamFromResponse(userDeviceKeyStreamId, response)
    }

    private async initUserToDeviceStream(
        userToDeviceStreamId: string,
        response: GetStreamResponse | CreateStreamResponse,
    ): Promise<void> {
        assert(this.userToDeviceStreamId === undefined, 'streamId must not be set')
        this.userToDeviceStreamId = userToDeviceStreamId
        await this.initStreamFromResponse(userToDeviceStreamId, response)
    }

    private async initStreamFromResponse(
        streamId: string,
        response: GetStreamResponse | CreateStreamResponse,
    ): Promise<void> {
        const { streamAndCookie, snapshot, miniblocks, prevSnapshotMiniblockNum, eventIds } =
            unpackStreamResponse(response)

        const cleartexts = await this.persistenceStore.getCleartexts(eventIds)
        const stream = new Stream(
            this.userId,
            streamId,
            snapshot,
            prevSnapshotMiniblockNum,
            this,
            this.logEmitFromStream,
        )
        this.streams.set(streamId, stream)
        stream.initialize(streamAndCookie, snapshot, miniblocks, cleartexts)
    }

    async initializeUser(): Promise<void> {
        this.logCall('initializeUser')
        assert(this.userStreamId === undefined, 'already initialized')
        await this.initCrypto()
        check(isDefined(this.decryptionExtensions), 'decryptionExtensions must be defined')
        const userStreamId = makeUserStreamId(this.userId)
        const userToDeviceStreamId = makeUserToDeviceStreamId(this.userId)
        const userDeviceKeyStreamId = makeUserDeviceKeyStreamId(this.userId)
        const userSettingsStreamId = makeUserSettingsStreamId(this.userId)

        // todo as part of HNT-2826 we should check/create all these streamson the node
        const userStream =
            (await this.getUserStream(userStreamId)) ?? (await this.createUserStream(userStreamId))
        const userToDeviceStream =
            (await this.getUserStream(userToDeviceStreamId)) ??
            (await this.createUserToDeviceStream(userToDeviceStreamId))
        const userDeviceKeyStream =
            (await this.getUserStream(userDeviceKeyStreamId)) ??
            (await this.createUserDeviceKeyStream(userDeviceKeyStreamId))
        const userSettingResponse =
            (await this.getUserStream(userSettingsStreamId)) ??
            (await this.createUserSettingsStream(userSettingsStreamId))

        await this.initUserDeviceKeyStream(userDeviceKeyStreamId, userDeviceKeyStream)
        await this.initUserToDeviceStream(userToDeviceStreamId, userToDeviceStream)
        await this.initUserSettingsStream(userSettingsStreamId, userSettingResponse)
        await this.initUserStream(userStreamId, userStream)
        await this.uploadDeviceKeys()
        await this.initUserJoinedStreams()
        this.decryptionExtensions.start()
    }

    // special wrapper around rpcClient.getStream which catches NOT_FOUND errors but re-throws everything else
    private async getUserStream(streamId: string): Promise<GetStreamResponse | undefined> {
        try {
            const response = await this.rpcClient.getStream({ streamId })
            return response
        } catch (e) {
            if (isIConnectError(e) && e.code === Number(Err.NOT_FOUND)) {
                return undefined
            } else {
                throw e
            }
        }
    }

    private async createUserStream(userStreamId: string): Promise<CreateStreamResponse> {
        const userEvents = [
            await makeEvent(
                this.signerContext,
                make_UserPayload_Inception({
                    streamId: userStreamId,
                }),
            ),
        ]
        return await this.rpcClient.createStream({
            events: userEvents,
            streamId: userStreamId,
        })
    }

    private async createUserDeviceKeyStream(
        userDeviceKeyStreamId: string,
    ): Promise<CreateStreamResponse> {
        const userDeviceKeyEvents = [
            await makeEvent(
                this.signerContext,
                make_UserDeviceKeyPayload_Inception({
                    streamId: userDeviceKeyStreamId,
                    userId: this.userId,
                    // device keys are updated often, and we're limited to
                    // 10, so after ten just snapshot
                    settings: {
                        minEventsPerSnapshot: 10,
                        miniblockTimeMs: 2000n,
                    },
                }),
            ),
        ]

        return await this.rpcClient.createStream({
            events: userDeviceKeyEvents,
            streamId: userDeviceKeyStreamId,
        })
    }

    private async createUserToDeviceStream(
        userToDeviceStreamId: string,
    ): Promise<CreateStreamResponse> {
        const userToDeviceEvents = [
            await makeEvent(
                this.signerContext,
                make_UserToDevicePayload_Inception({
                    streamId: userToDeviceStreamId,
                    // todo: move this to a config on the node https://linear.app/hnt-labs/issue/HNT-3931/move-custom-snapshot-config-for-user-streams-to-node
                    // aellis optimizing the to device stream to make blocks
                    // faster and snapshot often, because of the way we ack
                    // for different devices,
                    // this keeps us from having to re-download things for other
                    // devices. This should be configured on the node side.
                    settings: {
                        minEventsPerSnapshot: 10,
                        miniblockTimeMs: 1000n,
                    },
                }),
            ),
        ]

        return await this.rpcClient.createStream({
            events: userToDeviceEvents,
            streamId: userToDeviceStreamId,
        })
    }

    private async createUserSettingsStream(
        userSettingsStreamId: string,
    ): Promise<CreateStreamResponse> {
        const userSettingsEvents = [
            await makeEvent(
                this.signerContext,
                make_UserSettingsPayload_Inception({
                    streamId: userSettingsStreamId,
                }),
            ),
        ]

        return await this.rpcClient.createStream({
            events: userSettingsEvents,
            streamId: userSettingsStreamId,
        })
    }

    async createSpace(spaceId: string | undefined): Promise<{ streamId: string }> {
        spaceId = spaceId ?? makeUniqueSpaceStreamId()
        this.logCall('createSpace', spaceId)
        assert(this.userStreamId !== undefined, 'streamId must be set')
        assert(isSpaceStreamId(spaceId), 'spaceId must be a valid streamId')

        // create utf8 encoder
        const streamId = spaceId
        const inceptionEvent = await makeEvent(
            this.signerContext,
            make_SpacePayload_Inception({
                streamId,
            }),
        )
        const joinEvent = await makeEvent(
            this.signerContext,
            make_SpacePayload_Membership({
                userId: this.userId,
                op: MembershipOp.SO_JOIN,
            }),
        )

        await this.rpcClient.createStream({
            events: [inceptionEvent, joinEvent],
            streamId: spaceId,
        })
        return { streamId: streamId }
    }

    async createChannel(
        spaceId: string,
        channelName: string,
        channelTopic: string,
        channelId?: string,
        streamSettings?: PlainMessage<StreamSettings>,
    ): Promise<{ streamId: string }> {
        channelId = channelId ?? makeUniqueChannelStreamId()
        this.logCall('createChannel', channelId, spaceId)
        assert(this.userStreamId !== undefined, 'userStreamId must be set')
        assert(isSpaceStreamId(spaceId), 'spaceId must be a valid streamId')
        assert(isChannelStreamId(channelId), 'channelId must be a valid streamId')

        const inceptionEvent = await makeEvent(
            this.signerContext,
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId,
                channelProperties: make_fake_encryptedData(
                    make_ChannelProperties(channelName, channelTopic).toJsonString(),
                ),
                settings: streamSettings,
            }),
        )
        const joinEvent = await makeEvent(
            this.signerContext,
            make_ChannelPayload_Membership({
                userId: this.userId,
                op: MembershipOp.SO_JOIN,
            }),
        )

        await this.rpcClient.createStream({
            events: [inceptionEvent, joinEvent],
            streamId: channelId,
        })
        return { streamId: channelId }
    }

    async createDMChannel(
        userId: string,
        streamSettings?: PlainMessage<StreamSettings>,
    ): Promise<{ streamId: string }> {
        const channelId = makeDMStreamId(this.userId, userId)

        const inceptionEvent = await makeEvent(
            this.signerContext,
            make_DMChannelPayload_Inception({
                streamId: channelId,
                firstPartyId: this.userId,
                secondPartyId: userId,
                settings: streamSettings,
            }),
        )

        const joinEvent = await makeEvent(
            this.signerContext,
            make_DMChannelPayload_Membership({
                userId: this.userId,
                op: MembershipOp.SO_JOIN,
            }),
        )

        const inviteEvent = await makeEvent(
            this.signerContext,
            make_DMChannelPayload_Membership({
                userId: userId,
                op: MembershipOp.SO_JOIN,
            }),
        )

        try {
            await this.rpcClient.createStream({
                events: [inceptionEvent, joinEvent, inviteEvent],
                streamId: channelId,
            })
            return { streamId: channelId }
        } catch (err) {
            // Two users can only have a single DM stream between them.
            // Return the stream id if it already exists.
            if (isIConnectError(err) && err.code == (Code.AlreadyExists as number)) {
                return { streamId: channelId }
            }
            throw err
        }
    }

    async createGDMChannel(
        userIds: string[],
        channelProperties?: EncryptedData,
        streamSettings?: PlainMessage<StreamSettings>,
    ): Promise<{ streamId: string }> {
        const channelId = makeUniqueGDMChannelStreamId()

        const events: Envelope[] = []
        const inceptionEvent = await makeEvent(
            this.signerContext,
            make_GDMChannelPayload_Inception({
                streamId: channelId,
                channelProperties: channelProperties,
                settings: streamSettings,
            }),
        )
        events.push(inceptionEvent)
        const joinEvent = await makeEvent(
            this.signerContext,
            make_GDMChannelPayload_Membership({
                userId: this.userId,
                op: MembershipOp.SO_JOIN,
            }),
        )
        events.push(joinEvent)

        for (const userId of userIds) {
            const inviteEvent = await makeEvent(
                this.signerContext,
                make_GDMChannelPayload_Membership({
                    userId: userId,
                    op: MembershipOp.SO_JOIN,
                }),
            )
            events.push(inviteEvent)
        }

        await this.rpcClient.createStream({
            events: events,
            streamId: channelId,
        })
        return { streamId: channelId }
    }

    async createMediaStream(
        channelId: string,
        chunkCount: number,
        streamSettings?: PlainMessage<StreamSettings>,
    ): Promise<{ streamId: string }> {
        const streamId = makeUniqueMediaStreamId()

        this.logCall('createMedia', channelId, streamId)
        assert(this.userStreamId !== undefined, 'userStreamId must be set')
        assert(
            isChannelStreamId(channelId) ||
                isDMChannelStreamId(channelId) ||
                isGDMChannelStreamId(channelId),
            'channelId must be a valid streamId',
        )

        const inceptionEvent = await makeEvent(
            this.signerContext,
            make_MediaPayload_Inception({
                streamId,
                channelId,
                chunkCount,
                settings: streamSettings,
            }),
        )

        const response = await this.rpcClient.createStream({
            events: [inceptionEvent],
            streamId: streamId,
        })
        const { streamAndCookie, snapshot, miniblocks, prevSnapshotMiniblockNum, eventIds } =
            unpackStreamResponse(response)
        const cleartexts = await this.persistenceStore.getCleartexts(eventIds)
        const stream = new Stream(
            this.userId,
            streamId,
            snapshot,
            prevSnapshotMiniblockNum,
            this,
            this.logEmitFromStream,
        )

        // TODO: add support for creating/getting a stream without syncing (HNT-2686)
        this.streams.set(streamId, stream)
        stream.initialize(streamAndCookie, snapshot, miniblocks, cleartexts)
        return { streamId: streamId }
    }

    async updateChannel(
        spaceId: string,
        channelId: string,
        channelName: string,
        channelTopic: string,
    ) {
        this.logCall('updateChannel', channelId, spaceId, channelName, channelTopic)
        assert(isSpaceStreamId(spaceId), 'spaceId must be a valid streamId')
        assert(isChannelStreamId(channelId), 'channelId must be a valid streamId')
        const channelProps = make_ChannelProperties(channelName, channelTopic).toJsonString()

        return this.makeEventAndAddToStream(
            spaceId, // we send events to the stream of the space where updated channel belongs to
            make_SpacePayload_Channel({
                op: ChannelOp.CO_UPDATED,
                channelId: channelId,
                channelProperties: make_fake_encryptedData(channelProps),
            }),
            { method: 'updateChannel' },
        )
    }

    async sendFullyReadMarkers(
        channelId: string,
        fullyReadMarkers: Record<string, FullyReadMarker>,
    ) {
        this.logCall('sendFullyReadMarker', fullyReadMarkers)

        if (!isDefined(this.userSettingsStreamId)) {
            throw Error('userSettingsStreamId is not defined')
        }

        const fullyReadMarkersContent: FullyReadMarkers = new FullyReadMarkers({
            markers: fullyReadMarkers,
        })

        return this.makeEventAndAddToStream(
            this.userSettingsStreamId,
            make_UserSettingsPayload_FullyReadMarkers({
                channelStreamId: channelId,
                content: make_fake_encryptedData(fullyReadMarkersContent.toJsonString()),
            }),
            { method: 'sendFullyReadMarker' },
        )
    }

    async setDisplayName(streamId: string, displayName: string) {
        check(isDefined(this.cryptoBackend))
        const encryptedData = await this.cryptoBackend.encryptMegolmEvent(streamId, displayName)
        const makePayload = () => {
            if (isSpaceStreamId(streamId)) {
                return make_SpacePayload_DisplayName(encryptedData)
            } else if (isDMChannelStreamId(streamId)) {
                return make_DMChannelPayload_DisplayName(encryptedData)
            } else if (isGDMChannelStreamId(streamId)) {
                return make_GDMChannelPayload_DisplayName(encryptedData)
            } else {
                throw new Error(`Invalid streamId ${streamId}`)
            }
        }
        await this.makeEventAndAddToStream(streamId, makePayload(), { method: 'displayName' })
    }

    async setUsername(streamId: string, username: string) {
        check(isDefined(this.cryptoBackend))
        const encryptedData = await this.cryptoBackend.encryptMegolmEvent(streamId, username)
        encryptedData.checksum = usernameChecksum(username, streamId)

        const makePayload = () => {
            if (isSpaceStreamId(streamId)) {
                return make_SpacePayload_Username(encryptedData)
            } else if (isDMChannelStreamId(streamId)) {
                return make_DMChannelPayload_Username(encryptedData)
            } else if (isGDMChannelStreamId(streamId)) {
                return make_GDMChannelPayload_Username(encryptedData)
            } else {
                throw new Error(`Invalid streamId ${streamId}`)
            }
        }

        await this.makeEventAndAddToStream(streamId, makePayload(), { method: 'username' })
    }

    async waitForStream(streamId: string): Promise<Stream> {
        this.logCall('waitForStream', streamId)
        let stream = this.stream(streamId)
        if (stream !== undefined) {
            this.logCall('waitForStream: stream already initialized', streamId)
            return stream
        }
        await new Promise<void>((resolve) => {
            const handler = (newStreamId: string) => {
                if (newStreamId === streamId) {
                    this.logCall('waitForStream: got streamInitialized', newStreamId)
                    this.off('streamInitialized', handler)
                    resolve()
                } else {
                    this.logCall(
                        'waitForStream: still waiting for ',
                        streamId,
                        ' got ',
                        newStreamId,
                    )
                }
            }
            this.on('streamInitialized', handler)
        })

        stream = this.stream(streamId)
        if (!stream) {
            throw new Error(`Stream ${streamId} not found after waiting`)
        }
        return stream
    }

    async getStream(streamId: string): Promise<StreamStateView> {
        const existingRequest = this.getStreamRequests.get(streamId)
        if (existingRequest) {
            this.logCall(`had existing get request for ${streamId}, returning promise`)
            return await existingRequest
        }

        const request = this._getStream(streamId)
        this.getStreamRequests.set(streamId, request)
        const streamView = await request
        this.getStreamRequests.delete(streamId)
        return streamView
    }

    private async _getStream(streamId: string): Promise<StreamStateView> {
        try {
            this.logCall('getStream', streamId)
            const response = await this.rpcClient.getStream({ streamId })
            this.logCall('getStream', response.stream)
            check(isDefined(response.stream) && hasElements(response.miniblocks), 'got bad stream')
            const { streamAndCookie, snapshot, miniblocks, prevSnapshotMiniblockNum } =
                unpackStreamResponse(response)
            const streamView = new StreamStateView(
                this.userId,
                streamId,
                snapshot,
                prevSnapshotMiniblockNum,
            )
            streamView.initialize(streamAndCookie, snapshot, miniblocks, undefined, undefined)
            return streamView
        } catch (err) {
            this.logCall('getStream', streamId, 'ERROR', err)
            throw err
        }
    }

    private async initStream(streamId: string): Promise<Stream> {
        try {
            this.logCall('initStream', streamId)
            const stream = this.stream(streamId)
            if (stream) {
                this.logCall('initStream', streamId, 'already initialized')
                return stream
            } else {
                // <Async> do async work here
                const response = await this.rpcClient.getStream({ streamId })
                const {
                    streamAndCookie,
                    snapshot,
                    miniblocks,
                    prevSnapshotMiniblockNum,
                    eventIds,
                } = unpackStreamResponse(response)
                const cleartexts = await this.persistenceStore.getCleartexts(eventIds)
                // </Async> end async work
                const previousStream = this.stream(streamId)
                if (previousStream) {
                    this.logCall('initStream', streamId, 'RACE: already initialized')
                    return previousStream
                } else {
                    this.logCall('initStream', streamAndCookie)
                    const stream = new Stream(
                        this.userId,
                        streamId,
                        snapshot,
                        prevSnapshotMiniblockNum,
                        this,
                        this.logEmitFromStream,
                    )
                    this.streams.set(streamId, stream)
                    stream.on('streamInitialized', () => {
                        const addToSync = async () => {
                            // add to the sync subscription to monitor the new stream
                            await this.streams.addStreamToSync(streamAndCookie.nextSyncCookie)
                        }
                        addToSync().catch((err) => {
                            // log an error. Let the main sync loop handle retries.
                            this.logError('addStreamToSync failed', err)
                        })
                    })
                    stream.initialize(streamAndCookie, snapshot, miniblocks, cleartexts)
                    return stream
                }
            }
        } catch (err) {
            this.logCall('initStream', streamId, 'ERROR', err)
            throw err
        }
    }

    private onJoinedStream = (streamId: string): Promise<Stream> => {
        this.logEvent('onJoinedStream', streamId)
        return this.initStream(streamId)
    }

    private onInvitedToStream = async (streamId: string): Promise<void> => {
        this.logEvent('onInvitedToStream', streamId)
        if (isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId)) {
            await this.initStream(streamId)
        }
    }

    private onLeftStream = async (streamId: string): Promise<void> => {
        this.logEvent('onLeftStream', streamId)
        return await this.streams.removeStreamFromSync(streamId)
    }

    async startSync(opt?: { onFailure?: (err: unknown) => void }): Promise<unknown> {
        const { onFailure } = opt ?? {}
        assert(this.userStreamId !== undefined, 'streamId must be set')
        try {
            this.streams.startSync()
            return undefined
        } catch (err) {
            this.logSync('sync failure', err)
            onFailure?.(err)
            this.emit('streamSyncActive', false)
            this.streamSyncActive = false
            return err
        }
    }

    async stopSync(): Promise<unknown> {
        return this.streams.stopSync()
    }

    emit<E extends keyof EmittedEvents>(event: E, ...args: Parameters<EmittedEvents[E]>): boolean {
        this.logEmitFromClient(event, ...args)
        return super.emit(event, ...args)
    }

    async sendMessage(
        streamId: string,
        body: string,
        mentions?: ChannelMessage_Post_Mention[],
    ): Promise<void> {
        return this.sendChannelMessage_Text(streamId, {
            content: {
                body,
                mentions: mentions ?? [],
            },
        })
    }

    async sendChannelMessage(streamId: string, payload: ChannelMessage): Promise<void> {
        const stream = this.stream(streamId)
        check(stream !== undefined, 'stream not found')
        const localId = stream.view.appendLocalEvent(payload, this)
        const message = await this.encryptMegolmEvent(payload, streamId)
        if (!message) {
            throw new Error('failed to encrypt message')
        }
        if (isChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(streamId, make_ChannelPayload_Message(message), {
                method: 'sendMessage',
                localId,
            })
        } else if (isDMChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(streamId, make_DMChannelPayload_Message(message), {
                method: 'sendMessageDM',
                localId,
            })
        } else if (isGDMChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(streamId, make_GDMChannelPayload_Message(message), {
                method: 'sendMessageGDM',
                localId,
            })
        }
    }

    async sendChannelMessage_Text(
        streamId: string,
        payload: Omit<PlainMessage<ChannelMessage_Post>, 'content'> & {
            content: PlainMessage<ChannelMessage_Post_Content_Text>
        },
    ): Promise<void> {
        const { content, ...options } = payload
        return this.sendChannelMessage(
            streamId,
            new ChannelMessage({
                payload: {
                    case: 'post',
                    value: {
                        ...options,
                        content: {
                            case: 'text',
                            value: content,
                        },
                    },
                },
            }),
        )
    }

    async sendChannelMessage_Image(
        streamId: string,
        payload: Omit<PlainMessage<ChannelMessage_Post>, 'content'> & {
            content: PlainMessage<ChannelMessage_Post_Content_Image>
        },
    ): Promise<void> {
        const { content, ...options } = payload
        return this.sendChannelMessage(
            streamId,
            new ChannelMessage({
                payload: {
                    case: 'post',
                    value: {
                        ...options,
                        content: {
                            case: 'image',
                            value: content,
                        },
                    },
                },
            }),
        )
    }

    async sendChannelMessage_GM(
        streamId: string,
        payload: Omit<PlainMessage<ChannelMessage_Post>, 'content'> & {
            content: PlainMessage<ChannelMessage_Post_Content_GM>
        },
    ): Promise<void> {
        const { content, ...options } = payload
        return this.sendChannelMessage(
            streamId,
            new ChannelMessage({
                payload: {
                    case: 'post',
                    value: {
                        ...options,
                        content: {
                            case: 'gm',
                            value: content,
                        },
                    },
                },
            }),
        )
    }

    async sendChannelMessage_EmbeddedMedia(
        streamId: string,
        payload: Omit<PlainMessage<ChannelMessage_Post>, 'content'> & {
            content: PlainMessage<ChannelMessage_Post_Content_EmbeddedMedia>
        },
    ): Promise<void> {
        const { content, ...options } = payload
        return this.sendChannelMessage(
            streamId,
            new ChannelMessage({
                payload: {
                    case: 'post',
                    value: {
                        ...options,
                        content: {
                            case: 'embeddedMedia',
                            value: content,
                        },
                    },
                },
            }),
        )
    }

    async sendChannelMessage_Media(
        streamId: string,
        payload: Omit<PlainMessage<ChannelMessage_Post>, 'content'> & {
            content: PlainMessage<ChannelMessage_Post_Content_ChunkedMedia>
        },
    ): Promise<void> {
        const { content, ...options } = payload
        return this.sendChannelMessage(
            streamId,
            new ChannelMessage({
                payload: {
                    case: 'post',
                    value: {
                        ...options,
                        content: {
                            case: 'chunkedMedia',
                            value: content,
                        },
                    },
                },
            }),
        )
    }

    async sendMediaPayload(streamId: string, data: Uint8Array, chunkIndex: number): Promise<void> {
        const payload = make_MediaPayload_Chunk({
            data: data,
            chunkIndex: chunkIndex,
        })
        return this.makeEventAndAddToStream(streamId, payload, { method: 'sendMedia' })
    }

    async sendChannelMessage_Reaction(
        streamId: string,
        payload: PlainMessage<ChannelMessage_Reaction>,
    ): Promise<void> {
        return this.sendChannelMessage(
            streamId,
            new ChannelMessage({
                payload: {
                    case: 'reaction',
                    value: new ChannelMessage_Reaction(payload),
                },
            }),
        )
    }

    async sendChannelMessage_Redaction(
        streamId: string,
        payload: PlainMessage<ChannelMessage_Redaction>,
    ): Promise<void> {
        const stream = this.stream(streamId)
        if (!stream) {
            throw new Error(`stream not found: ${streamId}`)
        }
        if (!stream.view.events.has(payload.refEventId)) {
            throw new Error(`ref event not found: ${payload.refEventId}`)
        }
        return this.sendChannelMessage(
            streamId,
            new ChannelMessage({
                payload: {
                    case: 'redaction',
                    value: new ChannelMessage_Redaction(payload),
                },
            }),
        )
    }

    async sendChannelMessage_Edit(
        streamId: string,
        refEventId: string,
        newPost: PlainMessage<ChannelMessage_Post>,
    ): Promise<void> {
        return this.sendChannelMessage(
            streamId,
            new ChannelMessage({
                payload: {
                    case: 'edit',
                    value: {
                        refEventId: refEventId,
                        post: newPost,
                    },
                },
            }),
        )
    }

    async sendChannelMessage_Edit_Text(
        streamId: string,
        refEventId: string,
        payload: Omit<PlainMessage<ChannelMessage_Post>, 'content'> & {
            content: PlainMessage<ChannelMessage_Post_Content_Text>
        },
    ): Promise<void> {
        const { content, ...options } = payload
        return this.sendChannelMessage_Edit(streamId, refEventId, {
            ...options,
            content: {
                case: 'text',
                value: content,
            },
        })
    }

    async inviteUser(streamId: string, userId: string): Promise<void> {
        await this.initStream(streamId)
        if (isSpaceStreamId(streamId)) {
            return this.makeEventAndAddToStream(
                streamId,
                make_SpacePayload_Membership({
                    op: MembershipOp.SO_INVITE,
                    userId, // TODO: USER_ID: other encoding?
                }),
                { method: 'inviteUser' },
            )
        } else if (isChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(
                streamId,
                make_ChannelPayload_Membership({
                    op: MembershipOp.SO_INVITE,
                    userId, // TODO: USER_ID: other encoding?
                }),
                { method: 'inviteUser' },
            )
        } else if (isGDMChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(
                streamId,
                make_GDMChannelPayload_Membership({
                    op: MembershipOp.SO_INVITE,
                    userId,
                }),
            )
        } else {
            throw new Error('invalid streamId')
        }
    }

    async joinStream(
        streamId: string,
        opts?: { skipWaitForMiniblockConfirmation: boolean },
    ): Promise<Stream> {
        this.logCall('joinStream', streamId)
        const stream = await this.initStream(streamId)
        if (stream.view.getMemberships().isMemberJoined(this.userId)) {
            this.logError('joinStream: user already a member', streamId)
            return stream
        }
        if (isChannelStreamId(streamId)) {
            await this.makeEventAndAddToStream(
                streamId,
                make_ChannelPayload_Membership({
                    op: MembershipOp.SO_JOIN,
                    userId: this.userId,
                }),
                { method: 'joinChannel' },
            )
        } else if (isSpaceStreamId(streamId)) {
            await this.makeEventAndAddToStream(
                streamId,
                make_SpacePayload_Membership({
                    op: MembershipOp.SO_JOIN,
                    userId: this.userId,
                }),
                { method: 'joinSpace' },
            )
        } else if (isDMChannelStreamId(streamId)) {
            await this.makeEventAndAddToStream(
                streamId,
                make_DMChannelPayload_Membership({
                    op: MembershipOp.SO_JOIN,
                    userId: this.userId,
                }),
            )
        } else if (isGDMChannelStreamId(streamId)) {
            await this.makeEventAndAddToStream(
                streamId,
                make_GDMChannelPayload_Membership({
                    op: MembershipOp.SO_JOIN,
                    userId: this.userId,
                }),
            )
        } else {
            throw new Error('invalid streamId')
        }
        if (opts?.skipWaitForMiniblockConfirmation !== true) {
            await stream.waitForMembership(MembershipOp.SO_JOIN)
        }
        return stream
    }

    async leaveStream(streamId: string): Promise<void> {
        this.logCall('leaveStream', streamId)
        if (isChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(
                streamId,
                make_ChannelPayload_Membership({
                    op: MembershipOp.SO_LEAVE,
                    userId: this.userId,
                }),
                { method: 'leaveChannel' },
            )
        } else if (isDMChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(
                streamId,
                make_DMChannelPayload_Membership({
                    op: MembershipOp.SO_LEAVE,
                    userId: this.userId,
                }),
                { method: 'leaveDMChannel' },
            )
        } else if (isGDMChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(
                streamId,
                make_GDMChannelPayload_Membership({
                    op: MembershipOp.SO_LEAVE,
                    userId: this.userId,
                }),
            )
        } else if (isSpaceStreamId(streamId)) {
            const channelIds =
                this.stream(streamId)?.view.spaceContent.spaceChannelsMetadata.keys() ?? []

            for (const channelId of channelIds) {
                await this.leaveStream(channelId)
            }

            return this.makeEventAndAddToStream(
                streamId,
                make_SpacePayload_Membership({
                    op: MembershipOp.SO_LEAVE,
                    userId: this.userId,
                }),
                { method: 'leaveSpace' },
            )
        } else {
            throw new Error('invalid streamId')
        }
    }

    async scrollback(
        streamId: string,
    ): Promise<{ terminus: boolean; firstEvent?: StreamTimelineEvent }> {
        const currentRequest = this.getScrollbackRequests.get(streamId)
        if (currentRequest) {
            return currentRequest
        }

        const _scrollback = async (): Promise<{
            terminus: boolean
            firstEvent?: StreamTimelineEvent
        }> => {
            const stream = this.stream(streamId)
            check(isDefined(stream), `stream not found: ${streamId}`)
            check(isDefined(stream.view.miniblockInfo), `stream not initialized: ${streamId}`)
            if (stream.view.miniblockInfo.terminusReached) {
                this.logCall('scrollback', streamId, 'terminus reached')
                return { terminus: true, firstEvent: stream.view.timeline.at(0) }
            }
            check(stream.view.miniblockInfo.min >= stream.view.prevSnapshotMiniblockNum)
            this.logCall('scrollback', {
                streamId,
                miniblockInfo: stream.view.miniblockInfo,
                prevSnapshotMiniblockNum: stream.view.prevSnapshotMiniblockNum,
            })
            const toExclusive = stream.view.miniblockInfo.min
            const fromInclusive = stream.view.prevSnapshotMiniblockNum
            const response = await this.rpcClient.getMiniblocksUnpacked({
                streamId,
                fromInclusive,
                toExclusive,
            })

            const eventIds = response.unpackedMiniblocks.flatMap((m) =>
                m.events.map((e) => e.hashStr),
            )
            const cleartexts = await this.persistenceStore.getCleartexts(eventIds)
            stream.prependEvents(response.unpackedMiniblocks, cleartexts, response.terminus)
            return { terminus: response.terminus, firstEvent: stream.view.timeline.at(0) }
        }

        try {
            const request = _scrollback()
            this.getScrollbackRequests.set(streamId, request)
            return await request
        } finally {
            this.getScrollbackRequests.delete(streamId)
        }
    }

    async downloadNewToDeviceMessages(): Promise<void> {
        this.logCall('downloadNewToDeviceMessages')
        check(isDefined(this.userToDeviceStreamId))
        const stream = this.stream(this.userToDeviceStreamId)
        check(isDefined(stream))
        check(isDefined(stream.view.miniblockInfo))
        if (stream.view.miniblockInfo.terminusReached) {
            return
        }
        const deviceSummary =
            stream.view.userToDeviceContent.deviceSummary[this.userDeviceKey().deviceKey]
        if (!deviceSummary) {
            return
        }
        if (deviceSummary.lowerBound < stream.view.miniblockInfo.min) {
            const toExclusive = stream.view.miniblockInfo.min
            const fromInclusive = deviceSummary.lowerBound
            const response = await this.rpcClient.getMiniblocksUnpacked({
                streamId: this.userToDeviceStreamId,
                fromInclusive,
                toExclusive,
            })

            const eventIds = response.unpackedMiniblocks.flatMap((m) =>
                m.events.map((e) => e.hashStr),
            )
            const cleartexts = await this.persistenceStore.getCleartexts(eventIds)
            stream.prependEvents(response.unpackedMiniblocks, cleartexts, response.terminus)
        }
    }

    public async downloadUserDeviceInfo(
        userIds: string[],
        forceDownload: boolean = false,
    ): Promise<UserDeviceCollection> {
        const promises = userIds.map(
            async (userId): Promise<{ userId: string; devices: UserDevice[] }> => {
                const streamId = makeUserDeviceKeyStreamId(userId)
                try {
                    if (!forceDownload) {
                        const devicesFromStore = await this.cryptoStore.getUserDevices(userId)
                        if (devicesFromStore.length > 0) {
                            return { userId, devices: devicesFromStore }
                        }
                    }
                    // return latest 10 device keys
                    const deviceLookback = 10
                    const stream = await this.getStream(streamId)
                    const userDevices = stream.userDeviceKeyContent.megolmKeys.slice(
                        -deviceLookback,
                    )
                    await this.cryptoStore.saveUserDevices(userId, userDevices)
                    return { userId, devices: userDevices }
                } catch (e) {
                    return { userId, devices: [] }
                }
            },
        )

        return (await Promise.all(promises)).reduce((acc, current) => {
            acc[current.userId] = current.devices
            return acc
        }, {} as UserDeviceCollection)
    }

    public async knownDevicesForUserId(userId: string): Promise<UserDevice[]> {
        return await this.cryptoStore.getUserDevices(userId)
    }

    async makeEventAndAddToStream(
        streamId: string,
        payload: PlainMessage<StreamEvent>['payload'],
        options: { method?: string; localId?: string } = {},
    ): Promise<void> {
        // TODO: filter this.logged payload for PII reasons
        this.logCall(
            'await makeEventAndAddToStream',
            options.method,
            streamId,
            payload,
            options.localId,
        )
        assert(this.userStreamId !== undefined, 'userStreamId must be set')

        const stream = this.streams.get(streamId)
        assert(stream !== undefined, 'unknown stream ' + streamId)

        const prevHash = stream.view.prevMiniblockHash
        assert(isDefined(prevHash), 'no prev miniblock hash for stream ' + streamId)
        await this.makeEventWithHashAndAddToStream(streamId, payload, prevHash, options.localId)
    }

    async makeEventWithHashAndAddToStream(
        streamId: string,
        payload: PlainMessage<StreamEvent>['payload'],
        prevMiniblockHash: Uint8Array,
        localId?: string,
        retryCount?: number,
    ): Promise<void> {
        const event = await makeEvent(this.signerContext, payload, prevMiniblockHash)
        const eventId = bin_toHexString(event.hash)
        if (localId) {
            const stream = this.streams.get(streamId)
            assert(stream !== undefined, 'unknown stream ' + streamId)
            stream.view.updateLocalEvent(localId, eventId, this)
        }

        try {
            await this.rpcClient.addEvent({ streamId, event })
        } catch (err) {
            // custom retry logic for addEvent
            // if we send up a stale prevMiniblockHash, the server will return a BAD_PREV_MINIBLOCK_HASH
            // error and include the expected hash in the error message
            // if we had a localEventId, pass the last id so the ui can continue to update to the latest hash
            retryCount = retryCount ?? 0
            if (errorContains(err, Err.BAD_PREV_MINIBLOCK_HASH) && retryCount < 3) {
                const expectedHash = getRpcErrorProperty(err, 'expected')
                this.logInfo(
                    'RETRYING event after BAD_PREV_MINIBLOCK_HASH response',
                    retryCount,
                    'prevHash:',
                    prevMiniblockHash,
                    'expectedHash:',
                    expectedHash,
                )
                check(isDefined(expectedHash), 'expected hash not found in error')
                await this.makeEventWithHashAndAddToStream(
                    streamId,
                    payload,
                    bin_fromHexString(expectedHash),
                    isDefined(localId) ? eventId : undefined,
                    retryCount + 1,
                )
            } else {
                throw err
            }
        }
    }

    async getStreamLastMiniblockHash(streamId: string): Promise<Uint8Array> {
        const r = await this.rpcClient.getLastMiniblockHash({ streamId })
        return r.hash
    }

    private async initCrypto(): Promise<void> {
        this.logCall('initCrypto')
        if (this.cryptoBackend) {
            this.logCall('Attempt to re-init crypto backend, ignoring')
            return
        }

        check(this.userId !== undefined, 'userId must be set to init crypto')

        await this.cryptoStore.initialize()

        const crypto = new Crypto(this, this.userId, this.cryptoStore)
        await crypto.init()
        this.cryptoBackend = crypto
        this.decryptionExtensions = new DecryptionExtensions(
            this,
            this.entitlementsDelegate,
            this.userId,
            this.userDeviceKey(),
        )
    }

    /**
     * Resets crypto backend and creates a new Olm account, uploading device keys to UserDeviceKey stream.
     */
    async resetCrypto(): Promise<void> {
        this.logCall('resetCrypto')
        if (this.userId == undefined) {
            throw new Error('userId must be set to reset crypto')
        }
        this.cryptoBackend = undefined
        await this.cryptoStore.deleteAccount(this.userId)
        await this.initCrypto()
        await this.uploadDeviceKeys()
    }

    async uploadDeviceKeys() {
        check(isDefined(this.cryptoBackend), 'crypto backend not initialized')
        this.logCall('initCrypto:: uploading device keys...')

        check(isDefined(this.userDeviceKeyStreamId))
        const stream = this.stream(this.userDeviceKeyStreamId)
        check(isDefined(stream), 'device key stream not found')

        return this.makeEventAndAddToStream(
            this.userDeviceKeyStreamId,
            make_UserDeviceKeyPayload_MegolmDevice({
                ...this.userDeviceKey(),
            }),
            { method: 'userDeviceKey' },
        )
    }

    async ackToDeviceStream() {
        check(isDefined(this.userToDeviceStreamId), 'user to device stream not found')
        check(isDefined(this.cryptoBackend), 'crypto backend not initialized')
        const toDeviceStream = this.streams.get(this.userToDeviceStreamId)
        check(isDefined(toDeviceStream), 'user to device stream not found')
        const miniblockNum = toDeviceStream?.view.miniblockInfo?.max
        check(isDefined(miniblockNum), 'miniblockNum not found')
        this.logCall('ackToDeviceStream:: acking received keys...')
        const previousAck =
            toDeviceStream.view.userToDeviceContent.deviceSummary[this.userDeviceKey().deviceKey]
        if (previousAck && previousAck.lowerBound >= miniblockNum) {
            this.logCall(
                'ackToDeviceStream:: already acked',
                previousAck,
                'miniblockNum:',
                miniblockNum,
            )
            return
        }
        await this.makeEventAndAddToStream(
            this.userToDeviceStreamId,
            make_UserToDevicePayload_Ack({
                deviceKey: this.userDeviceKey().deviceKey,
                miniblockNum,
            }),
        )
    }

    /**
     * Decrypt a ToDevice message using Olm algorithm.
     *
     */
    public async decryptOlmEvent(ciphertext: string, senderDeviceKey: string): Promise<string> {
        if (!this.cryptoBackend) {
            throw new Error('crypto backend not initialized')
        }
        return this.cryptoBackend.decryptOlmEvent(ciphertext, senderDeviceKey)
    }
    /**
     * decrypts and applies megolm event
     */
    public async decryptMegolmEvent(
        streamId: string,
        eventId: string,
        encryptedContent: EncryptedContent,
    ): Promise<void> {
        this.logCall('decryptMegolmEvent', streamId, eventId, encryptedContent)
        const stream = this.stream(streamId)
        check(isDefined(stream), 'stream not found')
        const cleartext = await this.cleartextForMegolmEvent(streamId, eventId, encryptedContent)
        const decryptedContent = toDecryptedContent(encryptedContent.kind, cleartext)
        stream.view.updateDecryptedContent(eventId, decryptedContent, this)
    }

    private async cleartextForMegolmEvent(
        streamId: string,
        eventId: string,
        encryptedContent: EncryptedContent,
    ): Promise<string> {
        const cached = await this.persistenceStore.getCleartext(eventId)
        if (cached) {
            this.logInfo('Cache hit for cleartext', eventId)
            return cached
        }
        this.logInfo('Cache miss for cleartext', eventId)

        if (!this.cryptoBackend) {
            throw new Error('crypto backend not initialized')
        }
        const cleartext = await this.cryptoBackend.decryptMegolmEvent(
            streamId,
            encryptedContent.content,
        )

        await this.persistenceStore.saveCleartext(eventId, cleartext)
        return cleartext
    }

    public hasInboundSessionKeys(streamId: string, sessionId: string): Promise<boolean> {
        return this.cryptoBackend?.olmDevice?.hasInboundSessionKeys(
            streamId,
            sessionId,
        ) as Promise<boolean>
    }

    public async importRoomKeys(streamId: string, keys: MegolmSession[]): Promise<void> {
        return this.cryptoBackend?.importRoomKeys(streamId, keys)
    }

    public async encryptAndShareMegolmSessions(
        streamId: string,
        sessions: MegolmSession[],
        toDevices: UserDeviceCollection,
    ) {
        check(isDefined(this.cryptoBackend), "crypto backend isn't initialized")
        check(sessions.length >= 0, 'no sessions to encrypt')
        check(
            new Set(sessions.map((s) => s.streamId)).size === 1,
            'sessions should all be from the same stream',
        )
        check(sessions[0].streamId === streamId, 'streamId mismatch')

        this.logCall('share', { from: this.userId, to: toDevices })
        const userDevice = this.userDeviceKey()

        const sessionIds = sessions.map((session) => session.sessionId)
        const sessionKeys = sessions.map((session) => session.sessionKey)
        const payload = new SessionKeys({
            keys: sessionKeys,
        })
        const promises = Object.entries(toDevices).map(async ([userId, deviceKeys]) => {
            try {
                const ciphertext = await this.encryptOlm(payload, deviceKeys)
                if (Object.keys(ciphertext).length === 0) {
                    this.logCall('encryptAndShareMegolmSessions: no ciphertext to send', userId)
                    return
                }
                const toStreamId: string = makeUserToDeviceStreamId(userId)
                const miniblockHash = await this.getStreamLastMiniblockHash(toStreamId)
                await this.makeEventWithHashAndAddToStream(
                    toStreamId,
                    make_UserToDevicePayload_MegolmSessions({
                        streamId,
                        senderKey: userDevice.deviceKey,
                        sessionIds: sessionIds,
                        ciphertexts: ciphertext,
                    }),
                    miniblockHash,
                )
                this.logCall("encryptAndShareMegolmSessions: sent to user's devices", userId)
            } catch (error) {
                this.logError('encryptAndShareMegolmSessions: ERROR', error)
            }
        })

        return (await Promise.all(promises)).flat()
    }

    // Encrypt event using Megolm.
    public encryptMegolmEvent(event: Message, streamId: string): Promise<EncryptedData> {
        if (!this.cryptoBackend) {
            throw new Error('crypto backend not initialized')
        }
        const cleartext = event.toJsonString()
        return this.cryptoBackend.encryptMegolmEvent(streamId, cleartext)
    }

    async encryptOlm(payload: Message, deviceKeys: UserDevice[]): Promise<Record<string, string>> {
        check(isDefined(this.cryptoBackend), 'crypto backend not initialized')

        // Don't encrypt to our own device
        return this.cryptoBackend.encryptOlm(
            payload.toJsonString(),
            deviceKeys.filter((key) => key.deviceKey !== this.userDeviceKey().deviceKey),
        )
    }

    // Used during testing
    userDeviceKey(): UserDevice {
        return {
            deviceKey: this.olmDevice.deviceCurve25519Key!,
            fallbackKey: this.olmDevice.fallbackKey.key,
        }
    }
}
