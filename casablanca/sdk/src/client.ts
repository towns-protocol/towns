import { PlainMessage } from '@bufbuild/protobuf'
import {
    StreamAndCookie,
    MembershipOp,
    ToDeviceOp,
    SyncPos,
    ChannelMessage_Post_Mention,
    ChannelMessage,
    ChannelMessage_Post,
    ChannelMessage_Post_Content_Text,
    ChannelMessage_Post_Content_Image,
    ChannelMessage_Post_Content_GM,
    ChannelMessage_Post_Content_BlockTxn,
    ChannelMessage_Reaction,
    ChannelMessage_Redaction,
    StreamEvent,
    UserDeviceKeyPayload_UserDeviceKey,
} from '@towns/proto'
import { Crypto } from './crypto'
import debug from 'debug'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { isDefined, throwWithCode } from './check'
import {
    isChannelStreamId,
    isSpaceStreamId,
    makeUniqueChannelStreamId,
    makeUniqueSpaceStreamId,
    makeUserDeviceKeyStreamId,
    makeUserStreamId,
    userIdFromAddress,
} from './id'
import { SignerContext, makeEvent, unpackEnvelope, unpackEnvelopes } from './sign'
import { StreamRpcClientType } from './streamRpcClient'
import { StreamEvents, StreamStateView } from './streams'
import {
    ParsedEvent,
    bin_equal,
    bin_toBase64,
    IDeviceKeys,
    IFallbackKey,
    make_UserDeviceKeyPayload_UserDeviceKey,
    make_UserDeviceKeyPayload_Inception,
    make_ChannelPayload_Inception,
    make_ChannelPayload_Membership,
    make_ChannelPayload_Message,
    make_SpacePayload_Inception,
    make_SpacePayload_Membership,
    make_UserPayload_Inception,
    make_UserPayload_ToDevice,
} from './types'

function assert(condition: any, message?: string): asserts condition {
    if (!condition) {
        console.error('assertion failed: ', message ?? '')
        throw new Error(message)
    }
}

export class Stream extends (EventEmitter as new () => TypedEmitter<StreamEvents>) {
    readonly streamId: string
    readonly clientEmitter: TypedEmitter<StreamEvents>
    readonly logEmitFromStream: debug.Debugger
    readonly rollup: StreamStateView
    readonly foreignUserStream: boolean
    syncCookie?: Uint8Array

    constructor(
        streamId: string,
        inceptionEvent: ParsedEvent | undefined,
        clientEmitter: TypedEmitter<StreamEvents>,
        logEmitFromStream: debug.Debugger,
        foreignUserStream?: boolean,
    ) {
        super()
        this.streamId = streamId
        this.clientEmitter = clientEmitter
        this.logEmitFromStream = logEmitFromStream
        this.rollup = new StreamStateView(streamId, inceptionEvent)
        this.foreignUserStream = foreignUserStream ?? false
    }

    /**
     * NOTE: Separating initial rollup from the constructor allows consumer to subscribe to events
     * on the new stream event and still access this object through Client.streams.
     * @param events
     * @param emitter
     */
    addEvents(streamAndCookie: StreamAndCookie, init?: boolean): void {
        // TODO: perhaps here save rollup and emit events only if rollup is successful
        assert(
            bin_equal(this.syncCookie, streamAndCookie.originalSyncCookie),
            'syncCookie mismatch',
        )
        const events = unpackEnvelopes(streamAndCookie.events)
        this.rollup.addEvents(events, this, init)
        this.syncCookie = streamAndCookie.nextSyncCookie
    }

    emit<E extends keyof StreamEvents>(event: E, ...args: Parameters<StreamEvents[E]>): boolean {
        this.logEmitFromStream(event, ...args)
        this.clientEmitter.emit(event, ...args)
        return super.emit(event, ...args)
    }
}

export class Client extends (EventEmitter as new () => TypedEmitter<StreamEvents>) {
    readonly signerContext: SignerContext
    readonly rpcClient: StreamRpcClientType
    readonly userId: string
    readonly deviceId: string | undefined
    userStreamId?: string
    userDeviceKeyStreamId?: string
    readonly streams: Map<string, Stream> = new Map()
    stopSyncResolve?: (value: string) => void

    readonly logCall: debug.Debugger
    readonly logSync: debug.Debugger
    readonly logEmitFromStream: debug.Debugger
    readonly logEmitFromClient: debug.Debugger
    readonly logEvent: debug.Debugger

    private cryptoBackend?: Crypto

    constructor(
        signerContext: SignerContext,
        rpcClient: StreamRpcClientType,
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
        this.signerContext = signerContext
        this.rpcClient = rpcClient
        this.userId = userIdFromAddress(signerContext.creatorAddress)
        // TODO: tighten deviceId type and validate as we do with userId
        this.deviceId = signerContext.deviceId
        this.logCall = debug('csb:client:call').extend(this.userId)
        this.logSync = debug('csb:client:sync').extend(this.userId)
        this.logEmitFromStream = debug('csb:client:emit:stream').extend(this.userId)
        this.logEmitFromClient = debug('csb:client:emit:client').extend(this.userId)
        this.logEvent = debug('csb:client:event').extend(this.userId)

        this.logCall('new Client')
    }

    async stop(): Promise<void> {
        this.logCall('stop')
        this.stopSyncIfStarted()
        // TODO: close rpcClient
        // await this.rpcClient.close()
    }

    stream(streamId: string): Stream | undefined {
        return this.streams.get(streamId)
    }

    private async initUserStream(
        userStreamId: string,
        streamAndCookie: StreamAndCookie,
    ): Promise<void> {
        assert(this.userStreamId === undefined, 'streamId must not be set')
        this.userStreamId = userStreamId

        const stream = new Stream(
            userStreamId,
            unpackEnvelope(streamAndCookie.events[0]),
            this,
            this.logEmitFromStream,
        )
        this.streams.set(userStreamId, stream)
        stream.addEvents(streamAndCookie, true)

        stream.on('userJoinedStream', (s) => void this.onJoinedStream(s))
        stream.on('userLeftStream', (s) => void this.onLeftStream(s))

        return Promise.all(
            Array.from(stream.rollup.userJoinedStreams).map((streamId) =>
                this.initStream(streamId),
            ),
        ).then(() => {})
    }

    private async initUserDeviceKeyStream(
        userDeviceKeyStreamId: string,
        streamAndCookie: StreamAndCookie,
    ): Promise<void> {
        assert(this.userDeviceKeyStreamId === undefined, 'streamId must not be set')
        this.userDeviceKeyStreamId = userDeviceKeyStreamId

        const stream = new Stream(
            userDeviceKeyStreamId,
            unpackEnvelope(streamAndCookie.events[0]),
            this,
            this.logEmitFromStream,
        )
        this.streams.set(userDeviceKeyStreamId, stream)
        stream.addEvents(streamAndCookie, true)
    }

    async createNewUser(): Promise<void> {
        this.logCall('createNewUser')
        assert(this.userStreamId === undefined, 'streamId must not be set')
        const userStreamId = makeUserStreamId(this.userId)
        const userDeviceKeyStreamId = makeUserDeviceKeyStreamId(this.userId)

        const userEvents = [
            await makeEvent(
                this.signerContext,
                make_UserPayload_Inception({
                    streamId: userStreamId,
                }),
                [],
            ),
        ]
        const { syncCookie: userSyncCookie } = await this.rpcClient.createStream({
            events: userEvents,
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

        const { syncCookie: userDeviceKeySyncCookie } = await this.rpcClient.createStream({
            events: userDeviceKeyEvents,
        })

        await this.initUserDeviceKeyStream(
            userDeviceKeyStreamId,
            new StreamAndCookie({
                events: userDeviceKeyEvents,
                nextSyncCookie: userDeviceKeySyncCookie,
            }),
        )

        return this.initUserStream(
            userStreamId,
            new StreamAndCookie({ events: userEvents, nextSyncCookie: userSyncCookie }),
        )
    }

    async loadExistingUser(): Promise<void> {
        this.logCall('loadExistingUser')
        assert(this.userStreamId === undefined, 'streamId must not be set')
        const userStreamId = makeUserStreamId(this.userId)
        const userDeviceKeyStreamId = makeUserDeviceKeyStreamId(this.userId)

        // init userDeviceKeyStream
        const userDeviceKeyStream = await this.rpcClient.getStream({
            streamId: userDeviceKeyStreamId,
        })
        assert(userDeviceKeyStream.stream !== undefined, 'got bad user device key stream')
        await this.initUserDeviceKeyStream(userDeviceKeyStreamId, userDeviceKeyStream.stream)

        // init userStream
        const userStream = await this.rpcClient.getStream({ streamId: userStreamId })
        assert(userStream.stream !== undefined, 'got bad user stream')
        return this.initUserStream(userStreamId, userStream.stream)
    }

    async loadExistingForeignUser(userId: string): Promise<void> {
        // loads user stream for a foreign user without listeners
        this.logCall('loadExistingForeignUser', userId)
        assert(this.userId !== userId, 'userId must be different from current user')
        const streamId = makeUserStreamId(userId)
        if (this.streams.has(streamId)) {
            return
        }

        const userStream = await this.rpcClient.getStream({ streamId })
        assert(userStream.stream !== undefined, 'got bad user stream')
        const streamAndCookie = userStream.stream
        const stream = new Stream(
            streamId,
            unpackEnvelope(streamAndCookie.events[0]),
            this,
            this.logEmitFromStream,
            true,
        )
        this.streams.set(streamId, stream)
        // add init events
        stream.addEvents(streamAndCookie, true)
    }

    async createSpace(spaceId?: string): Promise<{ streamId: string }> {
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
        })

        return { streamId: streamId }
    }

    async createChannel(spaceId: string, channelId?: string): Promise<{ streamId: string }> {
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
        })

        return { streamId: channelId }
    }

    async waitForStream(streamId: string): Promise<Stream> {
        this.logCall('waitForStream', streamId)
        let stream = this.stream(streamId)
        if (stream !== undefined) {
            this.logCall('waitForStream: stream already initialized', streamId)
            return stream
        }
        let resolve: () => void
        const done = new Promise<void>((res) => {
            resolve = res
        })
        const handler = (newStreamId: string) => {
            this.logCall('waitForStream: got streamInitialized', newStreamId)
            if (newStreamId === streamId) {
                this.off('streamInitialized', handler)
                resolve()
                return
            }
            this.logCall('waitForStream: waiting for ', streamId, ' got ', newStreamId)
        }
        this.on('streamInitialized', handler)
        await done
        stream = this.stream(streamId)
        if (!stream) {
            throw new Error(`Stream ${streamId} not found after waiting`)
        }
        return stream
    }

    private async initStream(streamId: string): Promise<void> {
        try {
            this.logCall('initStream', streamId)
            if (this.streams.get(streamId) === undefined) {
                const streamContent = await this.rpcClient.getStream({ streamId })
                if (this.streams.get(streamId) === undefined) {
                    assert(streamContent.stream !== undefined, 'got bad stream')
                    this.logCall('initStream', streamContent.stream)
                    const stream = new Stream(
                        streamId,
                        unpackEnvelope(streamContent.stream.events[0]), // TODO: minor optimization: unpacks first event twice: here and below in addEvents
                        this,
                        this.logEmitFromStream,
                    )
                    this.streams.set(streamId, stream)
                    stream.addEvents(streamContent.stream, true)
                    // Blip sync here to make sure it also monitors new stream
                    this.blipSync()
                } else {
                    this.logCall('initStream', streamId, 'RACE: already initialized')
                }
            } else {
                this.logCall('initStream', streamId, 'already initialized')
            }
        } catch (err) {
            this.logCall('initStream', streamId, 'ERROR', err)
            throw err
        }
    }

    private onJoinedStream = (streamId: string): Promise<void> => {
        this.logEvent('onJoinedStream', streamId)
        return this.initStream(streamId)
    }

    private onLeftStream = async (streamId: string): Promise<void> => {
        this.logEvent('onLeftStream', streamId)
        // TODO: implement
    }

    async startSync(_timeoutMs?: number): Promise<void> {
        this.logSync('sync START')
        assert(this.stopSyncResolve === undefined, 'sync already started')
        assert(this.userStreamId !== undefined, 'streamId must be set')
        let stop = new Promise<string>((resolve) => {
            this.stopSyncResolve = resolve
        })
        let iteration = 0

        while (this.stopSyncResolve !== undefined) {
            this.logSync('sync ITERATION', iteration++)
            const syncPos: PlainMessage<SyncPos>[] = []
            this.streams.forEach((stream: Stream) => {
                // TODO: jterzis as an optimization in the future,
                // prune foreign user streams that are created to send
                // to_device messages.
                const syncCookie = stream.syncCookie
                if (syncCookie !== undefined) {
                    syncPos.push({
                        streamId: stream.streamId,
                        syncCookie,
                    })
                    this.logSync(
                        'sync CALL',
                        'stream=',
                        stream.streamId,
                        'syncCookie=',
                        bin_toBase64(syncCookie),
                    )
                }
            })
            assert(syncPos.length > 0, 'TODO: hande this case')
            const sync = await Promise.race([
                (async () => {
                    this.logSync('starting syncStreams', syncPos)

                    const sync = this.rpcClient.syncStreams({
                        syncPos,
                        timeoutMs: 29000, // TODO: from config
                    })
                    this.logSync('started syncStreams', syncPos)
                    const syncedStreams = []
                    for await (const syncedStream of sync) {
                        syncedStreams.push(syncedStream)
                    }
                    this.logSync('finished syncStreams', syncPos)
                    return syncedStreams
                })(),
                stop,
            ])
            this.logSync('sync PROMISE resolved', typeof sync)
            if (typeof sync === 'string') {
                if (sync === 'cancel') {
                    this.logSync('sync CANCEL')
                    this.stopSyncResolve = undefined
                    break
                } else if (sync === 'blip') {
                    this.logSync('sync BLIP')
                    stop = new Promise<string>((resolve) => {
                        this.stopSyncResolve = resolve
                    })
                    // TODO: cancel previous RPC call
                    continue
                } else {
                    throwWithCode('sync got unknown string result ' + sync)
                }
            } else {
                this.logSync('sync RESULTS received response', sync)
                if (
                    sync.length === 0 ||
                    sync.reduce((prevTotal, stream) => stream.streams.length + prevTotal, 0) === 0
                ) {
                    this.logSync(
                        'sync RESULTS for stream empty',
                        'originalSyncCookies=',
                        syncPos
                            .map((s) => (s.syncCookie ? bin_toBase64(s.syncCookie) : '[undefined]'))
                            .join(', '),
                    )
                } else {
                    sync.forEach((sync) =>
                        sync.streams.forEach((streamAndCookie) => {
                            const streamId = streamAndCookie.streamId
                            this.logSync(
                                'sync RESULTS for stream',
                                streamId,
                                'events=',
                                streamAndCookie.events.length,
                                'nextSyncCookie=',
                                bin_toBase64(streamAndCookie.nextSyncCookie),
                                'originalSyncCookie=',
                                bin_toBase64(streamAndCookie.originalSyncCookie),
                            )
                            const stream = this.streams.get(streamId)
                            if (stream === undefined) {
                                this.logSync('sync got stream', streamId, 'NOT FOUND')
                                throwWithCode("Sync got stream that wasn't requested")
                            }
                            stream.addEvents(streamAndCookie)
                        }),
                    )
                }
                this.logSync('sync RESULTS processed from response')
            }
        }
        this.logSync('sync END')
    }

    stopSync(): void {
        this.logSync('sync STOP CALLED')
        assert(this.stopSyncResolve !== undefined, 'sync not started')
        this.stopSyncResolve('cancel')
        this.stopSyncResolve = undefined
        this.logSync('sync STOP DONE')
    }

    stopSyncIfStarted(): void {
        this.logSync('sync STOP IF STARTED CALLED')
        if (this.stopSyncResolve !== undefined) {
            this.stopSyncResolve('cancel')
            this.stopSyncResolve = undefined
            this.logSync('sync STOP DONE')
        } else {
            this.logSync('sync NOT STARTED')
        }
    }

    blipSync(): void {
        this.logSync('sync BLIP CALLED')
        if (this.stopSyncResolve === undefined) {
            this.logSync("sync CAN'T BLIP - NOT STARTED OR NOT YET RESTARTED")
            return
        }
        this.stopSyncResolve('blip')
        this.stopSyncResolve = undefined
        this.logSync('sync BLIP DONE')
    }

    emit<E extends keyof StreamEvents>(event: E, ...args: Parameters<StreamEvents[E]>): boolean {
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

    async sendChannelMessage(
        streamId: string,
        payload: PlainMessage<ChannelMessage>['payload'],
    ): Promise<void> {
        const channelMessage = new ChannelMessage({ payload: payload })
        return this.makeEventAndAddToStream(
            streamId,
            make_ChannelPayload_Message({
                text: channelMessage.toJsonString(),
            }),
            'sendMessage',
        )
    }

    async sendChannelMessage_Text(
        streamId: string,
        payload: Omit<PlainMessage<ChannelMessage_Post>, 'content'> & {
            content: PlainMessage<ChannelMessage_Post_Content_Text>
        },
    ): Promise<void> {
        const { content, ...options } = payload
        return this.sendChannelMessage(streamId, {
            case: 'post',
            value: {
                ...options,
                content: {
                    case: 'text',
                    value: content,
                },
            },
        })
    }

    async sendChannelMessage_Image(
        streamId: string,
        payload: Omit<PlainMessage<ChannelMessage_Post>, 'content'> & {
            content: PlainMessage<ChannelMessage_Post_Content_Image>
        },
    ): Promise<void> {
        const { content, ...options } = payload
        return this.sendChannelMessage(streamId, {
            case: 'post',
            value: {
                ...options,
                content: {
                    case: 'image',
                    value: content,
                },
            },
        })
    }

    async sendChannelMessage_GM(
        streamId: string,
        payload: Omit<PlainMessage<ChannelMessage_Post>, 'content'> & {
            content: PlainMessage<ChannelMessage_Post_Content_GM>
        },
    ): Promise<void> {
        const { content, ...options } = payload
        return this.sendChannelMessage(streamId, {
            case: 'post',
            value: {
                ...options,
                content: {
                    case: 'gm',
                    value: content,
                },
            },
        })
    }

    async sendChannelMessage_BlockTxn(
        streamId: string,
        payload: Omit<PlainMessage<ChannelMessage_Post>, 'content'> & {
            content: PlainMessage<ChannelMessage_Post_Content_BlockTxn>
        },
    ): Promise<void> {
        const { content, ...options } = payload
        return this.sendChannelMessage(streamId, {
            case: 'post',
            value: {
                ...options,
                content: {
                    case: 'blockTxn',
                    value: content,
                },
            },
        })
    }

    async sendChannelMessage_Reaction(
        streamId: string,
        payload: PlainMessage<ChannelMessage_Reaction>,
    ): Promise<void> {
        return this.sendChannelMessage(streamId, {
            case: 'reaction',
            value: new ChannelMessage_Reaction(payload),
        })
    }

    async sendChannelMessage_Redaction(
        streamId: string,
        payload: PlainMessage<ChannelMessage_Redaction>,
    ): Promise<void> {
        return this.sendChannelMessage(streamId, {
            case: 'redaction',
            value: new ChannelMessage_Redaction(payload),
        })
    }

    async sendChannelMessage_Edit(
        streamId: string,
        refEventId: string,
        newPost: PlainMessage<ChannelMessage_Post>,
    ): Promise<void> {
        return this.sendChannelMessage(streamId, {
            case: 'edit',
            value: {
                refEventId: refEventId,
                post: newPost,
            },
        })
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
        if (isSpaceStreamId(streamId)) {
            return this.makeEventAndAddToStream(
                streamId,
                make_SpacePayload_Membership({
                    op: MembershipOp.SO_INVITE,
                    userId, // TODO: USER_ID: other encoding?
                }),
                'inviteUser',
            )
        } else if (isChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(
                streamId,
                make_ChannelPayload_Membership({
                    op: MembershipOp.SO_INVITE,
                    userId, // TODO: USER_ID: other encoding?
                }),
                'inviteUser',
            )
        } else {
            throw new Error('invalid streamId')
        }
    }

    async joinStream(streamId: string): Promise<void> {
        this.logCall('joinStream', streamId)
        await this.initStream(streamId)
        if (isChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(
                streamId,
                make_ChannelPayload_Membership({
                    op: MembershipOp.SO_JOIN,
                    userId: this.userId,
                }),
                'joinChannel',
            )
        } else if (isSpaceStreamId(streamId)) {
            return this.makeEventAndAddToStream(
                streamId,
                make_SpacePayload_Membership({
                    op: MembershipOp.SO_JOIN,
                    userId: this.userId,
                }),
                'joinSpace',
            )
        } else {
            throw new Error('invalid streamId')
        }
    }

    async sendToDevicesMessage(userId: string, event: object): Promise<void[]> {
        const streamId: string = makeUserStreamId(userId)
        await this.loadExistingForeignUser(userId)
        // retrieve all device_ids of a user
        const deviceIds = this.getStoredDevicesForUser(userId)
        // todo: this should use client protobuf not JSON and be encrypted
        const encoder = new TextEncoder()
        const envelope = encoder.encode(JSON.stringify(event))
        return Promise.all(
            deviceIds.map((deviceId) => {
                this.logCall(`toDevice ${deviceId}, streamId ${streamId}, userId ${userId}`)
                return this.makeEventAndAddToStream(
                    streamId,
                    make_UserPayload_ToDevice({
                        op: ToDeviceOp.TDO_TO_DEVICE,
                        // todo: this should use client protobuf not JSON
                        value: envelope,
                        deviceId: deviceId,
                    }),
                    'toDevice',
                )
            }),
        )
    }

    async sendToDeviceMessage(userId: string, deviceId: string, event: object): Promise<void> {
        const streamId: string = makeUserStreamId(userId)
        await this.loadExistingForeignUser(userId)
        // assert device_id belongs to user
        const deviceIds = this.getStoredDevicesForUser(userId)
        assert(deviceIds.includes(deviceId))
        this.logCall(`toDevice ${deviceId}, streamId ${streamId}, userId ${userId}`)
        // todo: this should use client protobuf not JSON and be encrypted
        const encoder = new TextEncoder()
        const envelope = encoder.encode(JSON.stringify(event))
        return this.makeEventAndAddToStream(
            streamId,
            make_UserPayload_ToDevice({
                op: ToDeviceOp.TDO_TO_DEVICE,
                value: envelope,
                deviceId: deviceId,
            }),
            'toDevice',
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
        return this.makeEventAndAddToStream(
            streamId,
            make_UserDeviceKeyPayload_UserDeviceKey({
                userId: userId,
                deviceKeys: { deviceId: deviceId, algorithms: [], keys: {}, signatures: {} },
                fallbackKeys: { algoKeyId: {} },
            }),
            'userDeviceKey',
        )
    }
    /**
     * Download device keys for a list of users asynchronously.
     *
     * @param userIds - list of userIds to sync userDeviceKey streams for deviceKeys
     * @returns a promise that resolves to a map from userId to a map from deviceId to deviceInfo.
     * Additionally, returns map of userIds to error for
     */
    async downloadKeysForUsers(userIds: string[]): Promise<IDownloadKeyResponse> {
        const streamIds: { [userId: string]: string } = userIds.reduce(
            (map: { [userId: string]: string }, userId) => {
                map[userId] = makeUserDeviceKeyStreamId(userId)
                return map
            },
            {},
        )
        // streams have either already been added to client or should be fetched/added from rpcServer
        const promises: Promise<IDownloadKeyResponse>[] = []
        Object.keys(streamIds).forEach((userId: string) => {
            const streamId: string = streamIds[userId]
            promises.push(
                (async (): Promise<IDownloadKeyResponse> => {
                    try {
                        await this.initStream(streamId)
                        // jterzis: should we add a wait timeout here to allow the stateView to be built from stream events
                        // if it's initting for the first time ?
                        // build response
                        const stream: Stream | undefined = this.streams.get(streamId)
                        const response: IDownloadKeyResponse = {
                            device_keys: {},
                        }
                        const userDeviceKeyPaylaod: UserDeviceKeyPayload_UserDeviceKey[] =
                            Array.from((stream as Stream).rollup.uploadedDeviceKeys.values())[0]
                        const deviceKeys: DeviceKeys[] = userDeviceKeyPaylaod
                            .filter(
                                (v): v is UserDeviceKeyPayload_UserDeviceKey =>
                                    v.deviceKeys !== undefined,
                            )
                            .map((v) => v.deviceKeys as unknown as DeviceKeys)
                        // push all known device keys for all devices of user
                        response.device_keys[userId] = deviceKeys
                        return Promise.resolve(response)
                    } catch (e) {
                        // return error in response
                        const response: IDownloadKeyResponse = {
                            failures: { [userId]: { error: e } },
                            device_keys: {},
                        }
                        return Promise.resolve(response)
                    }
                })(),
            )
        })
        const results = await Promise.all(promises)
        const mergedResults: IDownloadKeyResponse = results.reduce(
            (acc, currentResult) => {
                return {
                    failures: { ...acc.failures, ...currentResult.failures },
                    device_keys: { ...acc.device_keys, ...currentResult.device_keys },
                }
            },
            { failures: {}, device_keys: {} },
        )
        return mergedResults
    }

    public getStoredDevicesForUser(userId: string): string[] {
        this.logCall('getStoredDevicesForUser', userId)
        // TODO: Implement
        return [userId]
    }

    async makeEventAndAddToStream(
        streamId: string,
        payload: PlainMessage<StreamEvent>['payload'],
        method?: string,
    ): Promise<void> {
        // TODO: filter this.logged payload for PII reasons
        this.logCall('await makeEventAndAddToStream', method, streamId, payload)
        assert(this.userStreamId !== undefined, 'userStreamId must be set')

        const stream = this.streams.get(streamId)
        assert(stream !== undefined, 'unknown stream ' + streamId)

        const prevHashes = Array.from(stream.rollup.leafEventHashes.values())
        assert(prevHashes.length > 0, 'no prev hashes for stream ' + streamId)
        // TODO: should rollup now reference this event's hash?
        const event = await makeEvent(this.signerContext, payload, prevHashes)

        await this.rpcClient.addEvent({
            streamId,
            event,
        })
    }

    async getStreamSyncCookie(
        streamId: string,
    ): Promise<{ eventCount: number; syncCookie: Uint8Array }> {
        this.logCall('getStreamSyncCookie', streamId)
        try {
            const streamContent = await this.rpcClient.getStream({ streamId })
            return {
                eventCount: streamContent.stream?.events?.length ?? 0,
                syncCookie: streamContent.stream?.nextSyncCookie ?? new Uint8Array(8),
            }
        } catch (e) {
            this.logCall('getStreamSyncCookie', streamId, 'ERROR', e)
            throw e
        }
    }

    async initCrypto(): Promise<void> {
        this.logCall('initCrypto')
        if (this.cryptoBackend) {
            console.warn('Attempt to re-init crypto backend, ignoring')
            return
        }

        // TODO: for now this just creates crypto module and uploads deviceKeys.
        // We should ensure cryptoStore is not empty, initialize room list, and set the olmVersion.
        if (this.deviceId === undefined) {
            throw new Error('deviceId must be set to init crypto')
        }

        const crypto = new Crypto(this, this.userId, this.deviceId)
        this.cryptoBackend = crypto
        // TODO: register event handlers once crypto module is successfully initiatilized
        this.logCall('initCrypto:: uploading device keys...')
        return this.cryptoBackend.uploadDeviceKeys()
    }
}

export interface DeviceKeys {
    [deviceId: string]: IDeviceKeys & {
        unsigned?: {
            device_display_name: string
        }
    }
}

export interface IDownloadKeyResponse {
    failures?: { [userId: string]: object }
    device_keys: { [userId: string]: DeviceKeys[] }
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
