import { PlainMessage } from '@bufbuild/protobuf'
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
    MegolmSession,
    FallbackKeys,
    Key,
    SyncCookie,
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
    Err,
    OlmMessage,
    EncryptedMessageEnvelope,
} from '@river/proto'
import { Crypto, GroupEncryptionInput } from './crypto/crypto'
import { OlmDevice, IExportedDevice as IExportedOlmDevice } from './crypto/olmDevice'
import { UserDevice, UserDeviceCollection, MEGOLM_ALGORITHM } from './crypto/olmLib'
import { DLogger, dlog, dlogError } from './dlog'
import { errorContains, getRpcErrorProperty, StreamRpcClientType } from './makeStreamRpcClient'
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
    make_MediaPayload_Chunk,
    make_DMChannelPayload_Inception,
    make_DMChannelPayload_Membership,
    make_DMChannelPayload_Message,
    make_GDMChannelPayload_Inception,
    make_GDMChannelPayload_Message,
    make_GDMChannelPayload_Membership,
    make_SpacePayload_DisplayName,
    StreamTimelineEvent,
} from './types'
import { bin_fromHexString, bin_toHexString, shortenHexString } from './binary'
import { CryptoStore } from './crypto/store/cryptoStore'

import { RiverEventsV2, RiverEventV2 } from './eventV2'
import debug from 'debug'
import { Stream } from './stream'
import { Code } from '@connectrpc/connect'
import { isIConnectError } from './utils'
import { EntitlementsDelegate, RiverDecryptionExtension } from './riverDecryptionExtensions'
import { deviceKeyPayloadToUserDevice } from './clientUtils'

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

    streamSyncActive = false
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
    private readonly logInfo: DLogger

    protected exportedOlmDeviceToImport?: IExportedOlmDevice
    public pickleKey?: string
    public cryptoBackend?: Crypto
    public cryptoStore: CryptoStore

    private getStreamRequests: Map<string, Promise<StreamStateView>> = new Map()
    private syncLoop?: Promise<unknown>
    private syncAbort?: AbortController
    private entitlementsDelegate: EntitlementsDelegate
    private decryptionExtensions?: RiverDecryptionExtension

    constructor(
        signerContext: SignerContext,
        rpcClient: StreamRpcClientType,
        cryptoStore: CryptoStore,
        entitlementsDelegate: EntitlementsDelegate,
        logNamespaceFilter?: string,
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
        this.entitlementsDelegate = entitlementsDelegate
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
        this.logInfo = dlog('csb:cl:info', { defaultEnabled: true }).extend(shortId)
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
        this.decryptionExtensions?.stop()
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

    async initializeUser(): Promise<void> {
        this.logCall('initializeUser')
        assert(this.userStreamId === undefined, 'already initialized')
        await this.initCrypto()
        const userStreamId = makeUserStreamId(this.userId)
        const userDeviceKeyStreamId = makeUserDeviceKeyStreamId(this.userId)
        const userSettingsStreamId = makeUserSettingsStreamId(this.userId)

        // todo as part of HNT-2826 we should check/create all these streamson the node
        const userStream =
            (await this.getUserStream(userStreamId)) ?? (await this.createUserStream(userStreamId))
        const userDeviceKeyStream =
            (await this.getUserStream(userDeviceKeyStreamId)) ??
            (await this.createUserDeviceKeyStream(userDeviceKeyStreamId))
        const userSettingResponse =
            (await this.getUserStream(userSettingsStreamId)) ??
            (await this.createUserSettingsStream(userSettingsStreamId))

        await this.initUserDeviceKeyStream(userDeviceKeyStreamId, userDeviceKeyStream)
        await this.initUserSettingsStream(userSettingsStreamId, userSettingResponse)
        await this.initUserStream(userStreamId, userStream)
        await this.uploadDeviceKeys()
        await this.initUserJoinedStreams()
        this.decryptionExtensions?.start()
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
                }),
            ),
        ]

        return await this.rpcClient.createStream({
            events: userDeviceKeyEvents,
            streamId: userDeviceKeyStreamId,
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
                channelProperties: {
                    text: make_ChannelProperties(channelName, channelTopic).toJsonString(),
                },
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
                op: MembershipOp.SO_INVITE,
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
                    op: MembershipOp.SO_INVITE,
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

    async setDisplayName(streamId: string, displayName: string) {
        const payload = make_SpacePayload_DisplayName({ text: displayName })
        await this.makeEventAndAddToStream(streamId, payload, { method: 'displayName' })
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
        stream.view.updateDecrypted(event, this)
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
                    this.emit('streamSyncActive', true)
                    this.streamSyncActive = true

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
                            const streamAndCookie = syncedStream.stream
                            if (streamAndCookie !== undefined) {
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
                            } else {
                                this.logSync('sync RESULTS no stream', streamAndCookie)
                            }
                        }
                        this.logSync('finished syncStreams', syncPos)
                        // On sucessful sync, reset retryCount
                        retryCount = 0
                        this.syncAbort = undefined
                        this.logSync('sync ITERATION end', iteration)
                    } catch (err) {
                        this.emit('streamSyncActive', false)
                        this.streamSyncActive = false
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
                this.emit('streamSyncActive', false)
                this.streamSyncActive = false
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
        const stream = this.stream(streamId)
        check(stream !== undefined, 'stream not found')
        const localId = stream.view.appendLocalEvent(payload, this)
        const message = await this.createMegolmEncryptedEvent(payload, streamId)
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

                    // return latest 10 device keys until the below issue is complete
                    // todo: https://linear.app/hnt-labs/issue/HNT-3647/devicekey-lifecycle-hardening
                    const deviceLookback = 10

                    const stream = await this.getStream(streamId)
                    const userDevices = Array.from(
                        stream.userDeviceKeyContent.uploadedDeviceKeys.values(),
                    )
                        .flatMap((value) => value)
                        .map(deviceKeyPayloadToUserDevice)
                        .filter(isDefined)
                        .slice(-deviceLookback)

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

        if (this.userId == undefined) {
            throw new Error('userId must be set to init crypto')
        }

        // TODO: for now this just creates crypto module and uploads deviceKeys.
        // We should ensure cryptoStore is not empty, initialize room list, and set the olmVersion.
        if (this.deviceId === undefined) {
            throw new Error('deviceId must be set to init crypto')
        }

        await this.cryptoStore.initialize()

        const crypto = new Crypto(this, this.userId, this.deviceId, this.cryptoStore)
        await crypto.init({
            exportedOlmDevice: this.exportedOlmDeviceToImport,
            pickleKey: this.pickleKey,
        })
        delete this.exportedOlmDeviceToImport
        this.cryptoBackend = crypto
        this.decryptionExtensions = new RiverDecryptionExtension(this, this.entitlementsDelegate)
    }

    /**
     * Resets crypto backend and creates a new Olm account, uploading device keys to UserDeviceKey stream.
     */
    async resetCrypto(): Promise<void> {
        this.logCall('resetCrypto')
        if (this.userId == undefined) {
            throw new Error('userId must be set to reset crypto')
        }
        if (this.deviceId === undefined) {
            throw new Error('deviceId must be set to reset crypto')
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

        if (
            stream.view.userDeviceKeyContent.containsDeviceKey(
                this.userId,
                this.olmDevice.deviceCurve25519Key ?? '',
                this.olmDevice.fallbackKey.key,
            )
        ) {
            this.logCall('uploadDeviceKeys:: device keys already uploaded')
            return
        }

        return this.cryptoBackend.uploadDeviceKeys()
    }

    /**
     * Create encrypted channel event from a plain message using Megolm algorithm for a session
     * corresponding to a particular channel.
     *
     */
    async createMegolmEncryptedEvent(
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
     * Decrypt a ToDevice message using Olm algorithm.
     *
     */
    public async decryptOlmEvent(
        envelope: EncryptedMessageEnvelope,
        senderDeviceKey: string,
    ): Promise<OlmMessage> {
        if (!this.cryptoBackend) {
            throw new Error('crypto backend not initialized')
        }
        return this.cryptoBackend.decryptOlmEvent(envelope, senderDeviceKey)
    }
    /**
     * Attempts to decrypt an event
     */
    public async decryptEventIfNeeded(event: RiverEventV2): Promise<void> {
        if (!this.cryptoBackend) {
            throw new Error('crypto backend not initialized')
        }
        return this.cryptoBackend.decryptMegolmEvent(event)
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

    public async retryMegolmDecryption(eventId: string): Promise<void> {
        return this.cryptoBackend?.decryptMegolmEventWithId(eventId)
    }

    /**
     * Encrypts and sends a given object via Olm to-device messages to a given set of devices.
     */
    public async encryptAndSendToDevices(
        userDeviceInfos: UserDeviceCollection,
        message: ToDeviceMessage,
    ): Promise<void[]> {
        if (!this.cryptoBackend) {
            throw new Error('crypto backend not initialized')
        }
        const payload = new OlmMessage({ content: message })
        const senderKey = this.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('No deviceCurve25519Key found')
        }

        const promises = Object.entries(userDeviceInfos).map(async ([userId, deviceKeys]) => {
            try {
                const message = await this.encryptOlm(payload, deviceKeys)
                const streamId: string = makeUserStreamId(userId)
                const miniblockHash = await this.getStreamLastMiniblockHash(streamId)
                await this.makeEventWithHashAndAddToStream(
                    streamId,
                    make_UserPayload_ToDevice({
                        message: message,
                        senderKey,
                    }),
                    miniblockHash,
                )
                this.logCall("encryptAndSendToDevices: sent to user's devices", userId)
            } catch (error) {
                this.logError('sendToDeviceMessage: ERROR', error)
            }
        })

        return (await Promise.all(promises)).flat()
    }

    // Encrypt event using Megolm.
    public encryptMegolmEvent(input: GroupEncryptionInput): Promise<EncryptedData> {
        if (!this.cryptoBackend) {
            throw new Error('crypto backend not initialized')
        }
        return this.cryptoBackend.encryptMegolmEvent(input)
    }

    async encryptOlm(payload: OlmMessage, deviceKeys: UserDevice[]): Promise<EncryptedDeviceData> {
        if (!this.cryptoBackend) {
            throw new Error('crypto backend not initialized')
        }
        const senderKey = this.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('No deviceCurve25519Key found')
        }

        // Don't encrypt to our own device
        return this.cryptoBackend.encryptOlm(
            payload.toJsonString(),
            deviceKeys.filter((key) => key.deviceKey !== senderKey),
        )
    }

    // Used during testing
    userDeviceKey(): UserDevice {
        return {
            deviceId: this.deviceId!,
            deviceKey: this.olmDevice.deviceCurve25519Key!,
            fallbackKey: this.olmDevice.fallbackKey.key,
        }
    }
}

export interface FallbackKeyResponse {
    [deviceId: string]: FallbackKeys
}

// deviceId: algorithm
export interface IDeviceKeyRequest {
    [deviceId: string]: string
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
