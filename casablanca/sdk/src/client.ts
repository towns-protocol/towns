import { Message, PlainMessage } from '@bufbuild/protobuf'
import { datadogRum } from '@datadog/browser-rum'
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
    StreamSettings,
    ChannelMessage_Post_Content_EmbeddedMedia,
    FullyReadMarkers,
    FullyReadMarker,
    Envelope,
    Err,
    SessionKeys,
    ChannelMessage_Post_Attachment,
} from '@river/proto'
import {
    bin_fromHexString,
    bin_toHexString,
    shortenHexString,
    CryptoStore,
    IMegolmClient,
    MegolmCrypto,
    MegolmSession,
    OlmDevice,
    UserDevice,
    UserDeviceCollection,
    DLogger,
    dlog,
    dlogError,
    assert,
    isDefined,
    check,
} from '@river/mecholm'
import { errorContains, getRpcErrorProperty, StreamRpcClientType } from './makeStreamRpcClient'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
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
import { SignerContext, makeEvent, unpackMiniblock, unpackStreamResponse } from './sign'
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
    ParsedStreamResponse,
    make_GDMChannelPayload_ChannelProperties,
    ParsedMiniblock,
} from './types'

import debug from 'debug'
import { Stream } from './stream'
import { Code } from '@connectrpc/connect'
import { usernameChecksum, isIConnectError } from './utils'
import { EncryptedContent, toDecryptedContent } from './encryptedContentTypes'
import { DecryptionExtensions, EntitlementsDelegate } from './decryptionExtensions'
import { PersistenceStore } from './persistenceStore'
import { SyncState, SyncedStreams } from './syncedStreams'
import { SyncedStream } from './syncedStream'
import { SyncedStreamsExtension } from './syncedStreamsExtension'

export type EmittedEvents = StreamEvents

export class Client
    extends (EventEmitter as new () => TypedEmitter<EmittedEvents>)
    implements IMegolmClient
{
    readonly signerContext: SignerContext
    readonly rpcClient: StreamRpcClientType
    readonly userId: string
    readonly streams: SyncedStreams

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
    private readonly logDebug: DLogger

    public cryptoBackend?: MegolmCrypto
    public cryptoStore: CryptoStore

    private getStreamRequests: Map<string, Promise<StreamStateView>> = new Map()
    private getScrollbackRequests: Map<string, ReturnType<typeof this.scrollback>> = new Map()
    private entitlementsDelegate: EntitlementsDelegate
    private decryptionExtensions?: DecryptionExtensions
    private syncedStreamsExtensions?: SyncedStreamsExtension
    private persistenceStore: PersistenceStore

    constructor(
        signerContext: SignerContext,
        rpcClient: StreamRpcClientType,
        cryptoStore: CryptoStore,
        entitlementsDelegate: EntitlementsDelegate,
        logNamespaceFilter?: string,
        highPriorityStreamIds?: string[],
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
        this.logDebug = dlog('csb:cl:debug').extend(shortId)
        this.cryptoStore = cryptoStore
        this.persistenceStore = new PersistenceStore(
            `persistence-${cryptoStore.name.replace('database-', '')}`,
        )
        this.streams = new SyncedStreams(this.userId, this.rpcClient, this.persistenceStore, this)
        this.syncedStreamsExtensions = new SyncedStreamsExtension(this)
        this.syncedStreamsExtensions.setHighPriority(highPriorityStreamIds ?? [])
        this.logCall('new Client')
    }

    get streamSyncActive(): boolean {
        return this.streams.syncState === SyncState.Syncing
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
        await this.syncedStreamsExtensions?.stop()
        await this.stopSync()
    }

    stream(streamId: string): SyncedStream | undefined {
        return this.streams.get(streamId)
    }

    createSyncedStream(streamId: string): SyncedStream {
        const stream = new SyncedStream(
            this.userId,
            streamId,
            this,
            this.logEmitFromStream,
            this.persistenceStore,
        )
        this.streams.set(streamId, stream)
        return stream
    }

    private async initUserJoinedStreams() {
        assert(isDefined(this.userStreamId), 'userStreamId must be set')
        assert(isDefined(this.syncedStreamsExtensions), 'syncedStreamsExtensions must be set')
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
        for (const streamId of streamIds) {
            this.syncedStreamsExtensions.addStream(streamId)
        }
    }

    async initializeUser(): Promise<void> {
        const initializeUserStartTime = performance.now()
        this.logCall('initializeUser', this.userId)
        assert(this.userStreamId === undefined, 'already initialized')
        await this.initCrypto()

        check(isDefined(this.decryptionExtensions), 'decryptionExtensions must be defined')
        check(isDefined(this.syncedStreamsExtensions), 'syncedStreamsExtensions must be defined')
        // todo as part of HNT-2826 we should check/create all these streamson the node

        this.userStreamId = makeUserStreamId(this.userId)
        const userStream = this.createSyncedStream(this.userStreamId)
        {
            const response =
                (await this.getUserStream(this.userStreamId)) ??
                (await this.createUserStream(this.userStreamId))
            await userStream.initializeFromResponse(response)
        }

        this.userToDeviceStreamId = makeUserToDeviceStreamId(this.userId)
        const userToDeviceStream = this.createSyncedStream(this.userToDeviceStreamId)
        {
            const response =
                (await this.getUserStream(this.userToDeviceStreamId)) ??
                (await this.createUserToDeviceStream(this.userToDeviceStreamId))
            await userToDeviceStream.initializeFromResponse(response)
        }

        this.userDeviceKeyStreamId = makeUserDeviceKeyStreamId(this.userId)
        const userDeviceKeyStream = this.createSyncedStream(this.userDeviceKeyStreamId)
        {
            const response =
                (await this.getUserStream(this.userDeviceKeyStreamId)) ??
                (await this.createUserDeviceKeyStream(this.userDeviceKeyStreamId))
            await userDeviceKeyStream.initializeFromResponse(response)
        }

        this.userSettingsStreamId = makeUserSettingsStreamId(this.userId)
        const userSettingsStream = this.createSyncedStream(this.userSettingsStreamId)
        {
            const response =
                (await this.getUserStream(this.userSettingsStreamId)) ??
                (await this.createUserSettingsStream(this.userSettingsStreamId))
            await userSettingsStream.initializeFromResponse(response)
        }

        await this.initUserJoinedStreams()

        this.decryptionExtensions.start()
        this.syncedStreamsExtensions.start()
        const initializeUserEndTime = performance.now()
        const executionTime = initializeUserEndTime - initializeUserStartTime

        datadogRum.addTiming('inititalizeUser', Math.round(executionTime))
    }

    // special wrapper around rpcClient.getStream which catches NOT_FOUND errors but re-throws everything else
    private async getUserStream(streamId: string): Promise<ParsedStreamResponse | undefined> {
        try {
            const response = await this.rpcClient.getStream({ streamId })
            return unpackStreamResponse(response)
        } catch (e) {
            if (isIConnectError(e) && e.code === (Code.NotFound as number)) {
                return undefined
            } else {
                throw e
            }
        }
    }

    private async createUserStream(userStreamId: string): Promise<ParsedStreamResponse> {
        const userEvents = [
            await makeEvent(
                this.signerContext,
                make_UserPayload_Inception({
                    streamId: userStreamId,
                }),
            ),
        ]
        const response = await this.rpcClient.createStream({
            events: userEvents,
            streamId: userStreamId,
        })
        return unpackStreamResponse(response)
    }

    private async createUserDeviceKeyStream(
        userDeviceKeyStreamId: string,
    ): Promise<ParsedStreamResponse> {
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

        const response = await this.rpcClient.createStream({
            events: userDeviceKeyEvents,
            streamId: userDeviceKeyStreamId,
        })
        return unpackStreamResponse(response)
    }

    private async createUserToDeviceStream(
        userToDeviceStreamId: string,
    ): Promise<ParsedStreamResponse> {
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

        const response = await this.rpcClient.createStream({
            events: userToDeviceEvents,
            streamId: userToDeviceStreamId,
        })
        return unpackStreamResponse(response)
    }

    private async createUserSettingsStream(
        userSettingsStreamId: string,
    ): Promise<ParsedStreamResponse> {
        const userSettingsEvents = [
            await makeEvent(
                this.signerContext,
                make_UserSettingsPayload_Inception({
                    streamId: userSettingsStreamId,
                }),
            ),
        ]

        const response = await this.rpcClient.createStream({
            events: userSettingsEvents,
            streamId: userSettingsStreamId,
        })
        return unpackStreamResponse(response)
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

        const unpackedResponse = unpackStreamResponse(response)
        const stream = this.createSyncedStream(streamId)
        await stream.initializeFromResponse(unpackedResponse)
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

    async updateGDMChannelProperties(streamId: string, channelName: string, channelTopic: string) {
        this.logCall('updateGDMChannelProperties', streamId, channelName, channelTopic)
        assert(isGDMChannelStreamId(streamId), 'streamId must be a valid GDM stream id')
        check(isDefined(this.cryptoBackend))

        const channelProps = make_ChannelProperties(channelName, channelTopic).toJsonString()
        const encryptedData = await this.cryptoBackend.encryptMegolmEvent(streamId, channelProps)

        const event = make_GDMChannelPayload_ChannelProperties(encryptedData)
        return this.makeEventAndAddToStream(streamId, event, {
            method: 'updateGDMChannelProperties',
        })
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

    async isUsernameAvailable(streamId: string, username: string): Promise<boolean> {
        const stream = this.streams.get(streamId)
        check(isDefined(stream), 'stream not found')
        return (
            stream.view.getUserMetadata()?.usernames.cleartextUsernameAvailable(username) ?? false
        )
    }

    async waitForStream(streamId: string): Promise<Stream> {
        this.logCall('waitForStream', streamId)
        let stream = this.stream(streamId)
        if (stream !== undefined && stream.view.isInitialized) {
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
            const unpackedResponse = unpackStreamResponse(response)
            const streamView = new StreamStateView(this.userId, streamId)
            streamView.initialize(
                unpackedResponse.streamAndCookie.nextSyncCookie,
                unpackedResponse.streamAndCookie.events,
                unpackedResponse.snapshot,
                unpackedResponse.miniblocks,
                unpackedResponse.prevSnapshotMiniblockNum,
                undefined,
                undefined,
            )
            return streamView
        } catch (err) {
            this.logCall('getStream', streamId, 'ERROR', err)
            throw err
        }
    }

    async initStream(streamId: string, forceDownload: boolean = true): Promise<Stream> {
        try {
            this.logCall('initStream', streamId)
            const stream = this.stream(streamId)
            if (stream) {
                if (stream.view.isInitialized) {
                    this.logCall('initStream', streamId, 'already initialized')
                    return stream
                } else {
                    return this.waitForStream(streamId)
                }
            } else {
                const stream = this.createSyncedStream(streamId)
                if (forceDownload || !(await stream.initializeFromPersistence())) {
                    this.logCall('initStream', streamId)
                    const response = await this.rpcClient.getStream({ streamId })
                    const unpacked = unpackStreamResponse(response)
                    await stream.initializeFromResponse(unpacked)
                }
                if (!stream.view.syncCookie) {
                    throw new Error('Sync cookie not set')
                }
                try {
                    await this.streams.addStreamToSync(stream.view.syncCookie)
                } catch (err) {
                    if (!forceDownload && errorContains(err, Err.BAD_SYNC_COOKIE)) {
                        this.logError('Bad sync cookie', streamId)
                        await this.streams.removeStreamFromSync(streamId)
                        return await this.initStream(streamId, true)
                    } else {
                        this.logError('addStreamToSync failed', err)
                    }
                }
                return stream
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
            await this.streams.startSync()
            return undefined
        } catch (err) {
            this.logSync('sync failure', err)
            onFailure?.(err)
            this.emit('streamSyncActive', false)
            return err
        }
    }

    async stopSync() {
        await this.streams.stopSync()
    }

    emit<E extends keyof EmittedEvents>(event: E, ...args: Parameters<EmittedEvents[E]>): boolean {
        this.logEmitFromClient(event, ...args)
        return super.emit(event, ...args)
    }

    async sendMessage(
        streamId: string,
        body: string,
        mentions?: ChannelMessage_Post_Mention[],
        attachments: ChannelMessage_Post_Attachment[] = [],
    ): Promise<void> {
        return this.sendChannelMessage_Text(streamId, {
            content: {
                body,
                mentions: mentions ?? [],
                attachments: attachments,
            },
        })
    }

    async sendChannelMessage(streamId: string, payload: ChannelMessage): Promise<void> {
        const stream = this.stream(streamId)
        check(stream !== undefined, 'stream not found')
        const localId = stream.view.appendLocalEvent(payload, this)
        const cleartext = payload.toJsonString()
        const message = await this.encryptMegolmEvent(payload, streamId)
        if (!message) {
            throw new Error('failed to encrypt message')
        }
        if (isChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(streamId, make_ChannelPayload_Message(message), {
                method: 'sendMessage',
                localId,
                cleartext: cleartext,
            })
        } else if (isDMChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(streamId, make_DMChannelPayload_Message(message), {
                method: 'sendMessageDM',
                localId,
                cleartext: cleartext,
            })
        } else if (isGDMChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(streamId, make_GDMChannelPayload_Message(message), {
                method: 'sendMessageGDM',
                localId,
                cleartext: cleartext,
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

    async removeUser(streamId: string, userId: string): Promise<void> {
        this.logCall('removeUser', streamId, userId)
        if (isGDMChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(
                streamId,
                make_GDMChannelPayload_Membership({
                    op: MembershipOp.SO_LEAVE,
                    userId,
                }),
            )
        } else {
            throw new Error('invalid streamId')
        }
    }

    async getMiniblocks(
        streamId: string,
        fromInclusive: bigint,
        toExclusive: bigint,
    ): Promise<{ miniblocks: ParsedMiniblock[]; terminus: boolean }> {
        const cachedMiniblocks: ParsedMiniblock[] = []
        try {
            for (let i = toExclusive - 1n; i >= fromInclusive; i = i - 1n) {
                const miniblock = await this.persistenceStore.getMiniblock(streamId, i)
                if (miniblock) {
                    cachedMiniblocks.push(miniblock)
                    toExclusive = i
                } else {
                    break
                }
            }
            cachedMiniblocks.reverse()
        } catch (error) {
            this.logError('error getting miniblocks', error)
        }

        if (toExclusive === fromInclusive) {
            return {
                miniblocks: cachedMiniblocks,
                terminus: toExclusive === 0n,
            }
        }

        const response = await this.rpcClient.getMiniblocks({
            streamId,
            fromInclusive,
            toExclusive,
        })

        const unpackedMiniblocks: ParsedMiniblock[] = []
        for (const miniblock of response.miniblocks) {
            const unpackedMiniblock = unpackMiniblock(miniblock)
            unpackedMiniblocks.push(unpackedMiniblock)
            await this.persistenceStore.saveMiniblock(streamId, unpackedMiniblock)
        }
        return {
            terminus: response.terminus,
            miniblocks: [...unpackedMiniblocks, ...cachedMiniblocks],
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
            const response = await this.getMiniblocks(streamId, fromInclusive, toExclusive)
            const eventIds = response.miniblocks.flatMap((m) => m.events.map((e) => e.hashStr))
            const cleartexts = await this.persistenceStore.getCleartexts(eventIds)
            stream.prependEvents(response.miniblocks, cleartexts, response.terminus)
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

    /**
     * Get the list of active devices for all users in the room
     *
     *
     * @returns Promise which resolves to `null`, or an array whose
     *     first element is a {@link DeviceInfoMap} indicating
     *     the devices that messages should be encrypted to, and whose second
     *     element is a map from userId to deviceId to data indicating the devices
     *     that are in the room but that have been blocked.
     */
    async getDevicesInStream(stream_id: string): Promise<UserDeviceCollection> {
        let stream: StreamStateView | undefined
        stream = this.stream(stream_id)?.view
        if (!stream) {
            stream = await this.getStream(stream_id)
        }
        if (!stream) {
            this.logError(`stream for room ${stream_id} not found`)
            return {}
        }
        const members = Array.from(stream.getUsersEntitledToKeyExchange())
        this.logCall(
            `Encrypting for users (shouldEncryptForInvitedMembers:`,
            members.map((u) => `${u} (${MembershipOp[MembershipOp.SO_JOIN]})`),
        )
        return await this.downloadUserDeviceInfo(members)
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
            const response = await this.getMiniblocks(
                this.userToDeviceStreamId,
                fromInclusive,
                toExclusive,
            )
            const eventIds = response.miniblocks.flatMap((m) => m.events.map((e) => e.hashStr))
            const cleartexts = await this.persistenceStore.getCleartexts(eventIds)
            stream.prependEvents(response.miniblocks, cleartexts, response.terminus)
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
        options: { method?: string; localId?: string; cleartext?: string } = {},
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
        await this.makeEventWithHashAndAddToStream(
            streamId,
            payload,
            prevHash,
            options.localId,
            options.cleartext,
        )
    }

    async makeEventWithHashAndAddToStream(
        streamId: string,
        payload: PlainMessage<StreamEvent>['payload'],
        prevMiniblockHash: Uint8Array,
        localId?: string,
        cleartext?: string,
        retryCount?: number,
    ): Promise<void> {
        const event = await makeEvent(this.signerContext, payload, prevMiniblockHash)
        const eventId = bin_toHexString(event.hash)
        if (localId) {
            // when we have a localId, we need to update the local event with the eventId
            const stream = this.streams.get(streamId)
            assert(stream !== undefined, 'unknown stream ' + streamId)
            stream.view.updateLocalEvent(localId, eventId, this)
        }

        if (cleartext) {
            // if we have cleartext, save it so we don't have to re-decrypt it later
            await this.persistenceStore.saveCleartext(eventId, cleartext)
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
                    cleartext,
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

        const crypto = new MegolmCrypto(this, this.cryptoStore)
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
            this.logDebug('Cache hit for cleartext', eventId)
            return cached
        }
        this.logDebug('Cache miss for cleartext', eventId)

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
                this.logCall("encryptAndShareMegolmSessions: sent to user's devices", {
                    toStreamId,
                    deviceKeys: deviceKeys.map((d) => d.deviceKey).join(','),
                })
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
            } catch (error) {
                this.logError('encryptAndShareMegolmSessions: ERROR', error)
                return undefined
            }
        })

        await Promise.all(promises)
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
