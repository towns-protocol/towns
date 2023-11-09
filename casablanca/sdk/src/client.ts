import { PlainMessage } from '@bufbuild/protobuf'
import {
    MembershipOp,
    ToDeviceOp,
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
    MegolmSession,
    FallbackKeys,
    Key,
    SyncCookie,
    DeviceKeys,
    UserPayload_ToDevice,
    EncryptedDeviceData,
    ToDeviceMessage,
    EncryptedData,
    GetStreamResponse,
    CreateStreamResponse,
    StreamSettings,
    ChannelMessage_Post_Content_EmbeddedMedia,
    FullyReadMarkers,
    FullyReadMarker,
    Envelope,
} from '@river/proto'
import {
    Crypto,
    EncryptionInput,
    GroupEncryptionInput,
    IEventOlmDecryptionResult,
} from './crypto/crypto'
import { OlmDevice, IExportedDevice as IExportedOlmDevice } from './crypto/olmDevice'
import { DeviceInfoMap, DeviceList, IOlmDevice } from './crypto/deviceList'
import { DLogger, dlog, dlogError } from './dlog'
import { StreamRpcClientType } from './makeStreamRpcClient'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { assert, check, hasElements, isDefined, throwWithCode } from './check'
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
    userIdFromAddress,
} from './id'
import { SignerContext, makeEvent, unpackStreamResponse } from './sign'
import { StreamEvents } from './streamEvents'
import { StreamStateView } from './streamStateView'
import {
    IDeviceKeys,
    IFallbackKey,
    make_UserDeviceKeyPayload_UserDeviceKey,
    make_UserDeviceKeyPayload_Inception,
    make_ChannelPayload_Inception,
    make_ChannelProperties,
    make_ChannelPayload_Membership,
    make_ChannelPayload_Message,
    make_SpacePayload_Inception,
    make_SpacePayload_Membership,
    make_UserPayload_Inception,
    make_UserPayload_ToDevice,
    IDeviceKeySignatures,
    make_SpacePayload_Channel,
    make_UserSettingsPayload_FullyReadMarkers,
    make_UserSettingsPayload_Inception,
    make_MediaPayload_Inception,
    ParsedEvent,
    make_MediaPayload_Chunk,
    make_DMChannelPayload_Inception,
    make_DMChannelPayload_Membership,
    make_DMChannelPayload_Message,
    make_GDMChannelPayload_Inception,
    make_GDMChannelPayload_Message,
    make_GDMChannelPayload_Membership,
} from './types'
import { shortenHexString } from './binary'
import { CryptoStore } from './crypto/store/base'
import { DeviceInfo } from './crypto/deviceInfo'
import { IDecryptOptions, RiverEventsV2, RiverEventV2 } from './eventV2'
import debug from 'debug'
import { MEGOLM_ALGORITHM } from './crypto/olmLib'
import { Stream } from './stream'
import { Code } from '@connectrpc/connect'
import { isIConnectError } from './utils'

const enum AbortReason {
    SHUTDOWN = 'SHUTDOWN',
    BLIP = 'BLIP',
}

interface IExportedDevice {
    olmDevice: IExportedOlmDevice
    userId: string
    deviceId: string
}

export type EmittedEvents = StreamEvents & RiverEventsV2

export class Client extends (EventEmitter as new () => TypedEmitter<EmittedEvents>) {
    readonly signerContext: SignerContext
    readonly rpcClient: StreamRpcClientType
    readonly userId: string
    readonly deviceId: string | undefined
    userStreamId?: string
    userSettingsStreamId?: string
    userDeviceKeyStreamId?: string
    readonly streams: Map<string, Stream> = new Map()

    private readonly logCall: DLogger
    private readonly logSync: DLogger
    private readonly logEmitFromStream: DLogger
    private readonly logEmitFromClient: DLogger
    private readonly logEvent: DLogger
    private readonly logError: DLogger

    protected exportedOlmDeviceToImport?: IExportedOlmDevice
    public pickleKey?: string
    public cryptoStore?: CryptoStore
    public cryptoBackend?: Crypto
    private syncLoop?: Promise<unknown>
    private syncAbort?: AbortController

    constructor(
        signerContext: SignerContext,
        rpcClient: StreamRpcClientType,
        logNamespaceFilter?: string,
        cryptoStore?: CryptoStore,
        olmDeviceToImport?: IExportedDevice,
        pickleKey?: string,
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
        this.signerContext = signerContext
        this.rpcClient = rpcClient
        if (olmDeviceToImport) {
            this.deviceId = olmDeviceToImport.deviceId
            this.userId = olmDeviceToImport.userId
            // will be used during crypto async init
            this.exportedOlmDeviceToImport = olmDeviceToImport.olmDevice
        } else {
            this.userId = userIdFromAddress(signerContext.creatorAddress)
            // TODO: tighten deviceId type and validate as we do with userId
            this.deviceId = signerContext.deviceId
            if (pickleKey) {
                this.pickleKey = pickleKey
            }
        }
        const shortId = shortenHexString(
            this.userId.startsWith('0x') ? this.userId.slice(2) : this.userId,
        )
        this.logCall = dlog('csb:cl:call').extend(shortId)
        this.logSync = dlog('csb:cl:sync').extend(shortId)
        this.logEmitFromStream = dlog('csb:cl:stream').extend(shortId)
        this.logEmitFromClient = dlog('csb:cl:emit').extend(shortId)
        this.logEvent = dlog('csb:cl:event').extend(shortId)
        this.logError = dlogError('csb:cl:error').extend(shortId)

        this.cryptoStore = cryptoStore
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
        const { streamAndCookie, snapshot, miniblocks, prevSnapshotMiniblockNum } =
            unpackStreamResponse(response)

        const stream = new Stream(
            this.userId,
            userStreamId,
            snapshot,
            prevSnapshotMiniblockNum,
            this,
            this.logEmitFromStream,
        )
        this.streams.set(userStreamId, stream)
        stream.initialize(streamAndCookie, snapshot, miniblocks)

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
        const { streamAndCookie, snapshot, miniblocks, prevSnapshotMiniblockNum } =
            unpackStreamResponse(response)

        const stream = new Stream(
            this.userId,
            userSettingsStreamId,
            snapshot,
            prevSnapshotMiniblockNum,
            this,
            this.logEmitFromStream,
        )
        this.streams.set(userSettingsStreamId, stream)
        stream.initialize(streamAndCookie, snapshot, miniblocks)
    }

    private async initUserDeviceKeyStream(
        userDeviceKeyStreamId: string,
        response: GetStreamResponse | CreateStreamResponse,
    ): Promise<void> {
        assert(this.userDeviceKeyStreamId === undefined, 'streamId must not be set')
        this.userDeviceKeyStreamId = userDeviceKeyStreamId
        const { streamAndCookie, snapshot, miniblocks, prevSnapshotMiniblockNum } =
            unpackStreamResponse(response)

        const stream = new Stream(
            this.userId,
            userDeviceKeyStreamId,
            snapshot,
            prevSnapshotMiniblockNum,
            this,
            this.logEmitFromStream,
        )
        this.streams.set(userDeviceKeyStreamId, stream)
        stream.initialize(streamAndCookie, snapshot, miniblocks)
    }

    async createNewUser(): Promise<void> {
        this.logCall('createNewUser')
        assert(this.userStreamId === undefined, 'streamId must not be set')
        const userStreamId = makeUserStreamId(this.userId)
        const userDeviceKeyStreamId = makeUserDeviceKeyStreamId(this.userId)
        const userSettingsStreamId = makeUserSettingsStreamId(this.userId)

        const userEvents = [
            await makeEvent(
                this.signerContext,
                make_UserPayload_Inception({
                    streamId: userStreamId,
                }),
                [],
            ),
        ]
        const userResponse = await this.rpcClient.createStream({
            events: userEvents,
            streamId: userStreamId,
        })

        const userDeviceKeyEvents = [
            await makeEvent(
                this.signerContext,
                make_UserDeviceKeyPayload_Inception({
                    streamId: userDeviceKeyStreamId,
                    userId: this.userId,
                }),
                [],
            ),
        ]

        const deviceResponse = await this.rpcClient.createStream({
            events: userDeviceKeyEvents,
            streamId: userDeviceKeyStreamId,
        })

        const userSettingsEvents = [
            await makeEvent(
                this.signerContext,
                make_UserSettingsPayload_Inception({
                    streamId: userSettingsStreamId,
                }),
                [],
            ),
        ]

        const userSettingResponse = await this.rpcClient.createStream({
            events: userSettingsEvents,
            streamId: userSettingsStreamId,
        })

        await this.initUserDeviceKeyStream(userDeviceKeyStreamId, deviceResponse)
        await this.initUserSettingsStream(userSettingsStreamId, userSettingResponse)
        await this.initUserStream(userStreamId, userResponse)
    }

    async loadExistingUser(): Promise<void> {
        this.logCall('loadExistingUser')
        assert(this.userStreamId === undefined, 'streamId must not be set')
        const userStreamId = makeUserStreamId(this.userId)
        const userDeviceKeyStreamId = makeUserDeviceKeyStreamId(this.userId)
        const userSettingsStreamId = makeUserSettingsStreamId(this.userId)

        // init userDeviceKeyStream
        const userDeviceKeyStream = await this.rpcClient.getStream({
            streamId: userDeviceKeyStreamId,
        })
        assert(userDeviceKeyStream.stream !== undefined, 'got bad user device key stream')
        await this.initUserDeviceKeyStream(userDeviceKeyStreamId, userDeviceKeyStream)

        // init userStream
        const userStream = await this.rpcClient.getStream({ streamId: userStreamId })
        assert(userStream.stream !== undefined, 'got bad user stream')

        const userSettingsStream = await this.rpcClient.getStream({
            streamId: userSettingsStreamId,
        })
        assert(userSettingsStream.stream !== undefined, 'got bad user settings stream')
        await this.initUserSettingsStream(userSettingsStreamId, userSettingsStream)

        return this.initUserStream(userStreamId, userStream)
    }

    async loadExistingForeignUser(userId: string): Promise<void> {
        // loads user stream for a foreign user without listeners
        this.logCall('loadExistingForeignUser', userId)

        const streamId = makeUserStreamId(userId)
        if (this.streams.has(streamId)) {
            return
        }

        assert(this.userId !== userId, 'userId must be different from current user')

        const response = await this.rpcClient.getStream({ streamId })
        const { streamAndCookie, snapshot, miniblocks, prevSnapshotMiniblockNum } =
            unpackStreamResponse(response)
        const stream = new Stream(
            this.userId,
            streamId,
            snapshot,
            prevSnapshotMiniblockNum,
            this,
            this.logEmitFromStream,
            true,
        )
        this.streams.set(streamId, stream)
        // add init events
        stream.initialize(streamAndCookie, snapshot, miniblocks)
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
            [],
        )
        const joinEvent = await makeEvent(
            this.signerContext,
            make_SpacePayload_Membership({
                userId: this.userId,
                op: MembershipOp.SO_JOIN,
            }),
            [inceptionEvent.hash],
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
                channelProperties: {
                    text: make_ChannelProperties(channelName, channelTopic).toJsonString(),
                },
                settings: streamSettings,
            }),
            [],
        )
        const joinEvent = await makeEvent(
            this.signerContext,
            make_ChannelPayload_Membership({
                userId: this.userId,
                op: MembershipOp.SO_JOIN,
            }),
            [inceptionEvent.hash],
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
            [inceptionEvent.hash],
        )

        const inviteEvent = await makeEvent(
            this.signerContext,
            make_DMChannelPayload_Membership({
                userId: userId,
                op: MembershipOp.SO_INVITE,
            }),
            [joinEvent.hash],
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
            [events[events.length - 1].hash],
        )
        events.push(joinEvent)

        for (const userId of userIds) {
            const inviteEvent = await makeEvent(
                this.signerContext,
                make_GDMChannelPayload_Membership({
                    userId: userId,
                    op: MembershipOp.SO_INVITE,
                }),
                [events[events.length - 1].hash],
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
            [],
        )

        const response = await this.rpcClient.createStream({
            events: [inceptionEvent],
            streamId: streamId,
        })
        const { streamAndCookie, snapshot, miniblocks, prevSnapshotMiniblockNum } =
            unpackStreamResponse(response)
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
        stream.initialize(streamAndCookie, snapshot, miniblocks)
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

        const channelPropertiesToUpdate = {
            text: make_ChannelProperties(channelName, channelTopic).toJsonString(),
            algorithm: '',
            senderKey: '',
            deviceId: '',
        }

        return this.makeEventAndAddToStream(
            spaceId, // we send events to the stream of the space where updated channel belongs to
            make_SpacePayload_Channel({
                op: ChannelOp.CO_UPDATED,
                channelId: channelId,
                channelProperties: channelPropertiesToUpdate,
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
                content: {
                    text: fullyReadMarkersContent.toJsonString(),
                },
            }),
            { method: 'sendFullyReadMarker' },
        )
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

    public updateDecryptedStream(streamId: string, event: RiverEventV2): void {
        const stream = this.stream(streamId)
        if (stream === undefined) {
            throw new Error(`Stream ${streamId} not found`)
        }
        stream.updateDecrypted(event)
    }

    async getStream(streamId: string): Promise<StreamStateView> {
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
            streamView.initialize(streamAndCookie, snapshot, miniblocks, undefined)
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
                const response = await this.rpcClient.getStream({ streamId })
                const previousStream = this.stream(streamId)
                if (previousStream) {
                    this.logCall('initStream', streamId, 'RACE: already initialized')
                    return previousStream
                } else {
                    const { streamAndCookie, snapshot, miniblocks, prevSnapshotMiniblockNum } =
                        unpackStreamResponse(response)
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
                    stream.initialize(streamAndCookie, snapshot, miniblocks)
                    // Blip sync here to make sure it also monitors new stream
                    this.blipSync()
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
        // TODO: implement
    }

    async startSync(opt?: { onFailure?: (err: unknown) => void }): Promise<void> {
        const { onFailure } = opt ?? {}
        this.logSync('sync START')
        assert(this.userStreamId !== undefined, 'streamId must be set')

        this.syncLoop = (async (): Promise<unknown> => {
            this.logSync('sync syncLoop started')
            try {
                let iteration = 0
                let running = true
                let retryCount = 0
                while (running) {
                    const abortController = new AbortController()
                    this.syncAbort = abortController

                    this.logSync('sync ITERATION start', iteration++)
                    const syncPos: PlainMessage<SyncCookie>[] = []
                    this.streams.forEach((stream: Stream) => {
                        // TODO: jterzis as an optimization in the future,
                        // prune foreign user streams that are created to send
                        // to_device messages.
                        const syncCookie = stream.view.syncCookie
                        if (syncCookie !== undefined) {
                            syncPos.push(syncCookie)
                            this.logSync(
                                'sync CALL',
                                'stream=',
                                stream.streamId,
                                'syncCookie=',
                                syncCookie,
                            )
                        }
                    })

                    assert(syncPos.length > 0, 'TODO: hande this case')
                    try {
                        this.logSync('starting syncStreams', syncPos)

                        const sync = this.rpcClient.syncStreams(
                            {
                                syncPos,
                            },
                            {
                                signal: abortController.signal,
                            },
                        )
                        this.logSync('called syncStreams', { syncPos, sync })
                        for await (const syncedStream of sync) {
                            this.logSync('got syncStreams', syncedStream)
                            syncedStream.streams.forEach((streamAndCookie) => {
                                const streamId = streamAndCookie.nextSyncCookie?.streamId || ''
                                this.logSync(
                                    'sync RESULTS for stream',
                                    streamId,
                                    'events=',
                                    streamAndCookie.events.length,
                                    'nextSyncCookie=',
                                    streamAndCookie.nextSyncCookie,
                                    'startSyncCookie=',
                                    streamAndCookie.startSyncCookie,
                                )
                                const stream = this.streams.get(streamId)
                                if (stream === undefined) {
                                    this.logSync('sync got stream', streamId, 'NOT FOUND')
                                    throwWithCode("Sync got stream that wasn't requested")
                                }
                                stream.appendEvents(streamAndCookie)
                            })
                        }
                        this.logSync('finished syncStreams', syncPos)
                        // On sucessful sync, reset retryCount
                        retryCount = 0
                        this.syncAbort = undefined
                        this.logSync('sync ITERATION end', iteration)
                    } catch (err) {
                        switch (abortController.signal.reason) {
                            case AbortReason.SHUTDOWN:
                                running = false
                                break
                            case AbortReason.BLIP:
                                this.logSync('caught BLIP')
                                break
                            default: {
                                this.logSync('sync error', err)
                                retryCount++
                                if (retryCount > 5) {
                                    throw err
                                }
                                const delay = 2 ** retryCount * 100
                                this.logSync('sync error, retrying in', delay, 'ms')
                                await new Promise<void>((resolve) => {
                                    let abortListener: (() => void) | undefined = undefined
                                    const timout = setTimeout(() => {
                                        if (abortListener) {
                                            abortController.signal.removeEventListener(
                                                'abort',
                                                abortListener,
                                            )
                                        }
                                        resolve()
                                    }, delay)
                                    abortListener = () => {
                                        clearTimeout(timout)
                                        resolve()
                                    }
                                    abortController.signal.addEventListener('abort', abortListener)
                                })
                                if (abortController.signal.reason === AbortReason.SHUTDOWN) {
                                    running = false
                                }
                                break
                            }
                        }
                    }
                    this.logSync('sync RESULTS processed from response')
                }
            } catch (err) {
                this.logSync('sync failure', err)
                onFailure?.(err)
                return err
            }
            return undefined
        })()
        this.logSync('sync END')
    }

    async stopSync(): Promise<unknown> {
        let err: unknown = undefined
        this.logSync('sync STOP CALLED')
        if (this.syncAbort) {
            this.syncAbort.abort(AbortReason.SHUTDOWN)
            this.syncAbort = undefined
            err = await this.syncLoop
            this.syncLoop = undefined
        } else {
            this.logSync('sync STOP: no sync running')
        }
        this.logSync('sync STOP DONE')
        return err
    }

    blipSync(): void {
        this.logSync('sync BLIP CALLED')
        if (this.syncAbort) {
            this.syncAbort.abort(AbortReason.BLIP)
            this.syncAbort = undefined
        } else {
            this.logSync('sync BLIP: no sync running')
        }
        this.logSync('sync BLIP DONE')
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
        const message = await this.createMegolmEncryptedEvent(payload, streamId)
        if (!message) {
            throw new Error('failed to encrypt message')
        }
        if (isChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(streamId, make_ChannelPayload_Message(message), {
                method: 'sendMessage',
            })
        } else if (isDMChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(streamId, make_DMChannelPayload_Message(message), {
                method: 'sendMessageDM',
            })
        } else if (isGDMChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(streamId, make_GDMChannelPayload_Message(message), {
                method: 'sendMessageGDM',
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
        const ref = stream.view.events.get(payload.refEventId)
        if (!ref) {
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

    async scrollback(streamId: string): Promise<{ terminus: boolean; firstEvent?: ParsedEvent }> {
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
        const response = await this.rpcClient.getMiniblocks({
            streamId,
            fromInclusive,
            toExclusive,
        })
        stream.prependEvents(response.miniblocks, response.terminus)
        return { terminus: response.terminus, firstEvent: stream.view.timeline.at(0) }
    }

    async sendToDevicesMessage(
        userId: string,
        event: EncryptedDeviceData,
        type: ToDeviceOp | string,
    ): Promise<void[]> {
        const op: ToDeviceOp =
            typeof type == 'string' ? ToDeviceOp[type as keyof typeof ToDeviceOp] : type
        assert(op !== undefined, 'invalid to device op')
        const senderKey = this.cryptoBackend?.deviceKeys[`curve25519:${this.deviceId}`]
        if (!senderKey) {
            this.logCall('no sender key')
        }
        const streamId: string = makeUserStreamId(userId)
        await this.loadExistingForeignUser(userId)
        // retrieve all device keys of a user
        const deviceInfoMap = await this.getStoredDevicesForUser(userId)
        // encrypt event contents and encode ciphertext
        const envelope = event
        const deviceIds = Array.from(deviceInfoMap.keys()).filter(
            (deviceId) => deviceId !== this.deviceId,
        )

        const promiseArray = deviceIds.map((userId) => {
            const devicesForUser = deviceInfoMap.get(userId)
            if (!devicesForUser) {
                this.logCall(`no devices for user ${userId}`)
                return
            }
            Array.from(devicesForUser.keys()).map((deviceId) => {
                const curve25519deviceKeyArr = DeviceInfo.getCurve25519KeyFromUserId(
                    userId,
                    deviceInfoMap,
                    false,
                    deviceId,
                )
                if (!curve25519deviceKeyArr || curve25519deviceKeyArr?.length == 0) {
                    this.logCall(`no device key for user ${userId}`)
                    return
                }
                this.logCall(`toDevice ${deviceId}, streamId ${streamId}, userId ${userId}`)
                return this.makeEventAndAddToStream(
                    streamId,
                    make_UserPayload_ToDevice({
                        // key request or response
                        op,
                        // todo: this should be encrypted with olm session
                        message: envelope,
                        // deviceKey is curve25519 id key of recipient device
                        deviceKey: curve25519deviceKeyArr[0].key,
                        // senderKey is curve25519 id key of sender device
                        senderKey: senderKey ?? '',
                    }),
                    { method: 'toDevice' },
                )
            })
        })
        return Promise.all(promiseArray.flat())
    }

    async encryptAndSendToDevicesMessage(
        userId: string,
        event: ToDeviceMessage,
        type: ToDeviceOp | string,
    ): Promise<void[]> {
        const op: ToDeviceOp =
            typeof type == 'string' ? ToDeviceOp[type as keyof typeof ToDeviceOp] : type
        assert(op !== undefined, 'invalid to device op')
        const senderKey = this.cryptoBackend?.deviceKeys[`curve25519:${this.deviceId}`]
        if (!senderKey) {
            this.logCall('no sender key')
        }
        const streamId: string = makeUserStreamId(userId)
        await this.loadExistingForeignUser(userId)
        // retrieve all device keys of a user
        const deviceInfoMap = await this.getStoredDevicesForUser(userId)
        // encrypt event contents and encode ciphertext
        const envelope = await this.createOlmEncryptedEvent(event, userId)
        const promiseArray = Array.from(deviceInfoMap.keys()).map((userId) => {
            const devicesForUser = deviceInfoMap.get(userId)
            if (!devicesForUser) {
                this.logCall(`no devices for user ${userId}`)
                return
            }
            Array.from(devicesForUser.keys()).map((deviceId) => {
                const curve25519deviceKeyArr = DeviceInfo.getCurve25519KeyFromUserId(
                    userId,
                    deviceInfoMap,
                    false,
                    deviceId,
                )
                if (!curve25519deviceKeyArr || curve25519deviceKeyArr?.length == 0) {
                    this.logCall(`no device key for user ${userId}`)
                    return
                }
                this.logCall(`toDevice ${deviceId}, streamId ${streamId}, userId ${userId}`)
                return this.makeEventAndAddToStream(
                    streamId,
                    make_UserPayload_ToDevice({
                        // key request or response
                        op,
                        // todo: this should be encrypted with olm session
                        message: envelope,
                        // deviceKey is curve25519 id key of recipient device
                        deviceKey: curve25519deviceKeyArr[0].key,
                        // senderKey is curve25519 id key of sender device
                        senderKey: senderKey ?? '',
                    }),
                    { method: 'toDevice' },
                )
            })
        })
        return Promise.all(promiseArray.flat())
    }

    async encryptAndSendToDeviceMessage(
        userId: string,
        event: ToDeviceMessage,
        type: ToDeviceOp | string,
    ): Promise<void> {
        const op: ToDeviceOp =
            typeof type == 'string' ? ToDeviceOp[type as keyof typeof ToDeviceOp] : type
        const senderKey = this.cryptoBackend?.deviceKeys[`curve25519:${this.deviceId}`]
        assert(senderKey !== undefined, 'no sender key')
        const streamId: string = makeUserStreamId(userId)
        await this.loadExistingForeignUser(userId)
        const deviceInfoMap = await this.getStoredDevicesForUser(userId)
        const envelope = await this.createOlmEncryptedEvent(event, userId)
        const deviceKeyArr = DeviceInfo.getCurve25519KeyFromUserId(userId, deviceInfoMap)
        if (!deviceKeyArr || deviceKeyArr.length == 0) {
            throw new Error('no device keys found for target to-device user ' + userId)
        }
        // by default we retrieve the first curve25519 match when sending to a single device
        // of a user
        // todo: this will change when we support multiple devices per user
        // see: https://linear.app/hnt-labs/issue/HNT-1839/multi-device-support-in-todevice-transport
        const deviceKey = deviceKeyArr[0]
        this.logCall(`toDevice ${deviceKey.deviceId}, streamId ${streamId}, userId ${userId}`)
        // encrypt event contents and encode ciphertext
        return this.makeEventAndAddToStream(
            streamId,
            make_UserPayload_ToDevice({
                // key request or response
                op,
                message: envelope,
                // deviceKey is curve25519 id key of recipient device
                deviceKey: deviceKey.key,
                // senderKey is curve25519 id key of sender device
                senderKey: senderKey ?? '',
                // todo: point to origin event for key responses
            }),
            { method: 'toDevice' },
        )
    }

    async sendToDeviceMessage(
        userId: string,
        event: EncryptedDeviceData,
        type: ToDeviceOp | string,
    ): Promise<void> {
        const op: ToDeviceOp =
            typeof type == 'string' ? ToDeviceOp[type as keyof typeof ToDeviceOp] : type
        const senderKey = this.cryptoBackend?.deviceKeys[`curve25519:${this.deviceId}`]
        assert(senderKey !== undefined, 'no sender key')
        const streamId: string = makeUserStreamId(userId)
        await this.loadExistingForeignUser(userId)
        // assert device_id belongs to user
        const deviceInfoMap = await this.getStoredDevicesForUser(userId)
        const deviceKeyArr = DeviceInfo.getCurve25519KeyFromUserId(userId, deviceInfoMap)
        if (!deviceKeyArr || deviceKeyArr.length == 0) {
            throw new Error('no device keys found for target to-device user ' + userId)
        }
        // by default we retrieve the first curve25519 match when sending to a single device
        // of a user
        // todo: this will change when we support multiple devices per user
        // see: https://linear.app/hnt-labs/issue/HNT-1839/multi-device-support-in-todevice-transport
        const deviceKey = deviceKeyArr[0]
        this.logCall(`toDevice ${deviceKey.deviceId}, streamId ${streamId}, userId ${userId}`)
        // encrypt event contents and encode ciphertext
        return this.makeEventAndAddToStream(
            streamId,
            make_UserPayload_ToDevice({
                // key request or response
                op,
                message: event,
                // deviceKey is curve25519 id key of recipient device
                deviceKey: deviceKey.key,
                // senderKey is curve25519 id key of sender device
                senderKey: senderKey ?? '',
                // todo: point to origin event for key responses
            }),
            { method: 'toDevice' },
        )
    }

    async uploadKeysRequest(content: IUploadKeysRequest): Promise<void> {
        const userId: string = content.user_id
        const deviceId: string = content.device_id
        const streamId: string = makeUserDeviceKeyStreamId(userId)
        // TODO: assert device_id belongs to user
        // const deviceIds = this.getStoredDevicesForUser(userId)
        // TODO: check for fallbackKeys in arguments and ensure upload
        // of actual keys, algorithms.
        let fallbackKeys: Record<string, PlainMessage<Key>> = {}
        if (content?.fallback_keys) {
            fallbackKeys = Object.fromEntries(
                Object.entries(content.fallback_keys).map(([key, value]) => {
                    const newValue = {
                        key: value.key,
                        signatures: value.signatures as IDeviceKeySignatures,
                    }
                    return [key, newValue]
                }),
            )
        }
        return this.makeEventAndAddToStream(
            streamId,
            make_UserDeviceKeyPayload_UserDeviceKey({
                userId: userId,
                deviceKeys: {
                    deviceId: deviceId,
                    algorithms: content.device_keys?.algorithms ?? [],
                    keys: content.device_keys?.keys ?? {},
                    signatures: content.device_keys?.signatures ?? {},
                },
                fallbackKeys: { algoKeyId: fallbackKeys },
            }),
            { method: 'userDeviceKey' },
        )
    }

    /**
     * Download device keys for a list of users asynchronously.
     *
     * @param userIds - map of userIds to deviceIds to algorithms to download keys for.
     * If deviceIds are empty, all device keys for a user will be downloaded.
     * @param downloadFallbackKeys - whether to download fallback keys associated with a user's devices.
     * @returns a promise that resolves to a map from userId to a map from deviceId to deviceInfo.
     * Additionally, returns map of userIds to error for
     */
    async downloadKeysForUsers(
        request: IDownloadKeyRequest,
        returnFallbackKeys?: boolean,
    ): Promise<IDownloadKeyResponse> {
        // streams have either already been added to client or should be fetched/added from rpcServer
        const promises = Object.keys(request).map((userId) => {
            const streamId: string = makeUserDeviceKeyStreamId(userId)
            return (async () => {
                try {
                    const stream = await this.getStream(streamId)
                    const response: IDownloadKeyResponse = {
                        device_keys: {},
                        fallback_keys: {},
                    }
                    // 06/02/23 note: for now there's a one to one mapping between userIds - deviceIds, which is why
                    // we return the latest UserDeviceKey event for each user from their stream. This won't hold in the future
                    // as user's will eventually have multiple devices per user, each with a different deviceId.

                    const devicesFlat = Array.from(
                        stream.userDeviceKeyContent.uploadedDeviceKeys.values(),
                    ).flatMap((value) => value)

                    // return latest device key
                    const payload = devicesFlat[devicesFlat.length - 1]

                    if (!returnFallbackKeys) {
                        if (isDefined(payload.deviceKeys)) {
                            // push all known device keys for all devices of user
                            if (!response.device_keys[userId]) {
                                response.device_keys[userId] = []
                            }
                            response.device_keys[userId].push(payload.deviceKeys)
                        }
                    } else {
                        const fallbackKeys: FallbackKeyResponse[] = []
                        if (payload.deviceKeys?.deviceId && payload.fallbackKeys) {
                            fallbackKeys.push({
                                [payload.deviceKeys.deviceId]: payload.fallbackKeys,
                            })
                        }
                        // push all known device keys for all devices of user
                        if (fallbackKeys.length > 0) {
                            if (response.fallback_keys) {
                                response.fallback_keys[userId] = fallbackKeys
                            }
                        }
                    }
                    return response
                } catch (e) {
                    // return error in response
                    const response: IDownloadKeyResponse = {
                        failures: { [userId]: { error: <Error>e } },
                        device_keys: {},
                        fallback_keys: {},
                    }
                    return response
                }
            })()
        })
        const results = await Promise.all(promises)
        const mergedResults: IDownloadKeyResponse = results.reduce(
            (acc, currentResult) => {
                return {
                    failures: { ...acc.failures, ...currentResult.failures },
                    device_keys: { ...acc.device_keys, ...currentResult.device_keys },
                    fallback_keys: { ...acc.fallback_keys, ...currentResult.fallback_keys },
                }
            },
            { failures: {}, device_keys: {}, fallback_keys: {} },
        )
        return mergedResults
    }

    public async getStoredDevicesForUser(userId: string): Promise<DeviceInfoMap> {
        this.logCall('getStoredDevicesForUser', userId)
        try {
            const response = await this.downloadKeys([userId])
            if (response) {
                return response
            }
        } catch (e) {
            this.logCall('error downloading keys for user', userId, e)
        }
        return new Map<string, Map<string, DeviceInfo>>()
    }

    async makeEventAndAddToStream(
        streamId: string,
        payload: PlainMessage<StreamEvent>['payload'],
        options: { method?: string } = {},
    ): Promise<void> {
        // TODO: filter this.logged payload for PII reasons
        this.logCall('await makeEventAndAddToStream', options.method, streamId, payload)
        assert(this.userStreamId !== undefined, 'userStreamId must be set')

        const stream = this.streams.get(streamId)
        assert(stream !== undefined, 'unknown stream ' + streamId)

        const prevHashes = Array.from(stream.view.leafEventHashes.values())
        assert(prevHashes.length > 0, 'no prev hashes for stream ' + streamId)
        // TODO: should rollup now reference this event's hash?
        const event = await makeEvent(this.signerContext, payload, prevHashes)

        await this.rpcClient.addEvent({
            streamId,
            event,
        })
    }

    async initCrypto(): Promise<void> {
        this.logCall('initCrypto')
        if (this.cryptoBackend) {
            this.logCall('Attempt to re-init crypto backend, ignoring')
            return
        }

        if (!this.cryptoStore) {
            throw new Error('cryptoStore must be set to init crypto')
        }

        this.logCall('Crypto: starting up crypto store.')
        await this.cryptoStore.startup()

        if (this.userId == undefined) {
            throw new Error('userId must be set to init crypto')
        }

        // TODO: for now this just creates crypto module and uploads deviceKeys.
        // We should ensure cryptoStore is not empty, initialize room list, and set the olmVersion.
        if (this.deviceId === undefined) {
            throw new Error('deviceId must be set to init crypto')
        }

        const crypto = new Crypto(this, this.userId, this.deviceId, this.cryptoStore)
        await crypto.init({
            exportedOlmDevice: this.exportedOlmDeviceToImport,
            pickleKey: this.pickleKey,
        })
        delete this.exportedOlmDeviceToImport
        // todo set olmVersion

        // todo: register event handlers

        this.cryptoBackend = crypto
        // TODO: register event handlers once crypto module is successfully initiatilized
        this.logCall('initCrypto:: uploading device keys...')
        return this.cryptoBackend.uploadDeviceKeys()
    }

    /**
     * Create encrypted channel event from a plain message using Megolm algorithm for a session
     * corresponding to a particular channel.
     *
     */
    private async createMegolmEncryptedEvent(
        event: ChannelMessage,
        channelId: string,
    ): Promise<EncryptedData | undefined> {
        // encrypt event contents and encode ciphertext
        const input = { content: event, recipient: { streamId: channelId } }
        let encryptedEvent: EncryptedData
        try {
            encryptedEvent = await this.encryptMegolmEvent(input)
        } catch (e) {
            this.logCall('createMegolmEncryptedEvent: ERROR', e)
            throw e
        }
        const senderKey = this.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('createMegolmEncryptedEvent: no sender key')
        }
        const { text: ciphertext, sessionId: session_id } = encryptedEvent
        const result = ciphertext
            ? new EncryptedData({
                  senderKey,
                  sessionId: session_id,
                  text: ciphertext,
                  algorithm: MEGOLM_ALGORITHM,
              })
            : undefined
        return result
    }

    /**
     * Create encrypted to device event from a plain message using Olm algorithm for each user's devices
     * and return ciphertext.
     *
     */
    public async createOlmEncryptedEvent(
        event: ToDeviceMessage,
        recipientUserId: string,
    ): Promise<EncryptedDeviceData> {
        // encrypt event contents and encode ciphertext

        let encryptedData: EncryptedDeviceData
        try {
            encryptedData = await this.encryptOlmEvent({
                content: event,
                recipient: { userIds: [recipientUserId] },
            })
        } catch (e) {
            this.logCall('createEncryptedCipherFromEvent: ERROR', e)
            throw e
        }
        return encryptedData
    }

    /**
     * Decrypt a ToDevice message using Olm algorithm.
     *
     */
    public async decryptOlmEvent(
        event: UserPayload_ToDevice,
        senderUserId: string,
    ): Promise<IEventOlmDecryptionResult> {
        if (!this.cryptoBackend) {
            throw new Error('crypto backend not initialized')
        }
        return this.cryptoBackend.decryptOlmEvent(event, senderUserId)
    }
    /**
     * Attempts to decrypt an event
     */
    public async decryptEventIfNeeded(
        event: RiverEventV2,
        options?: IDecryptOptions,
    ): Promise<void> {
        if (event.shouldAttemptDecryption()) {
            if (!this.cryptoBackend) {
                throw new Error('crypto backend not initialized')
            }
            await event.attemptDecryption(this.cryptoBackend, options)
        }

        if (event.isBeingDecrypted()) {
            const promise = event.getDecryptionPromise()
            if (promise) {
                return promise
            }
        }
        return Promise.resolve()
    }

    public hasInboundSessionKeys(streamId: string, sessionId: string): Promise<boolean> {
        return this.cryptoBackend?.olmDevice?.hasInboundSessionKeys(
            streamId,
            sessionId,
        ) as Promise<boolean>
    }

    public async importRoomKeys(
        streamId: string,
        keys: MegolmSession[],
        opts?: object,
    ): Promise<void> {
        return this.cryptoBackend?.importRoomKeys(streamId, keys, opts)
    }

    public downloadKeys(
        userIds: string[],
        forceDownload?: boolean,
    ): Promise<DeviceInfoMap> | undefined {
        return this.cryptoBackend?.deviceList.downloadKeys(userIds, !!forceDownload)
    }

    get deviceList(): DeviceList | undefined {
        return this.cryptoBackend?.deviceList
    }

    /**
     * Encrypts and sends a given object via Olm to-device messages to a given set of devices.
     */
    public async encryptAndSendToDevices(
        userDeviceInfoArr: IOlmDevice[],
        payload: ToDeviceMessage,
    ): Promise<void> {
        if (!this.cryptoBackend) {
            throw new Error('crypto backend not initialized')
        }
        return this.cryptoBackend.encryptAndSendToDevices(userDeviceInfoArr, payload)
    }

    // Encrypt event using Olm.
    public encryptOlmEvent(input: EncryptionInput): Promise<EncryptedDeviceData> {
        if (!this.cryptoBackend) {
            throw new Error('crypto backend not initialized')
        }
        return this.cryptoBackend.encryptOlmEvent(input.content, input.recipient)
    }

    // Encrypt event using Megolm.
    public encryptMegolmEvent(input: GroupEncryptionInput): Promise<EncryptedData> {
        if (!this.cryptoBackend) {
            throw new Error('crypto backend not initialized')
        }
        return this.cryptoBackend.encryptMegolmEvent(input)
    }
}
export interface FallbackKeyResponse {
    [deviceId: string]: FallbackKeys
}

// deviceId: algorithm
export interface IDeviceKeyRequest {
    [deviceId: string]: string
}

export interface IDownloadKeyRequest {
    [userId: string]: IDeviceKeyRequest
}

export interface IDownloadKeyResponse {
    failures?: Record<string, object>
    device_keys: Record<string, DeviceKeys[]>
    fallback_keys?: Record<string, FallbackKeyResponse[]>
}

export interface IKeysUploadResponse {
    fallback_key_counts: {
        [algorithm: string]: number
    }
}

export interface IUploadKeysRequest {
    user_id: string
    device_id: string
    device_keys?: Required<IDeviceKeys>
    fallback_keys?: Record<string, IFallbackKey>
}
