import { PartialMessage, PlainMessage } from '@bufbuild/protobuf'
import {
    Payload,
    StreamAndCookie,
    StreamKind,
    MembershipOp,
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
} from '@towns/proto'
import debug from 'debug'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { throwWithCode } from './check'
import {
    isChannelStreamId,
    isSpaceStreamId,
    makeUniqueChannelStreamId,
    makeUniqueSpaceStreamId,
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
    makeInceptionPayload,
    makeJoinableStreamPayload,
    makeMessagePayload,
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
    syncCookie?: Uint8Array

    constructor(
        streamId: string,
        inceptionEvent: ParsedEvent | undefined,
        clientEmitter: TypedEmitter<StreamEvents>,
        logEmitFromStream: debug.Debugger,
    ) {
        super()
        this.streamId = streamId
        this.clientEmitter = clientEmitter
        this.logEmitFromStream = logEmitFromStream
        this.rollup = new StreamStateView(streamId, inceptionEvent)
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
    userStreamId?: string
    readonly streams: Map<string, Stream> = new Map()
    stopSyncResolve?: (value: string) => void

    readonly logCall: debug.Debugger
    readonly logSync: debug.Debugger
    readonly logEmitFromStream: debug.Debugger
    readonly logEmitFromClient: debug.Debugger
    readonly logEvent: debug.Debugger

    constructor(
        signerContext: SignerContext,
        rpcClient: StreamRpcClientType,
        logNamespaceFilter?: string,
    ) {
        super()
        if (logNamespaceFilter) {
            debug.enable(logNamespaceFilter)
        }
        this.signerContext = signerContext
        this.rpcClient = rpcClient
        this.userId = userIdFromAddress(signerContext.creatorAddress)
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

    async createNewUser(): Promise<void> {
        this.logCall('createNewUser')
        assert(this.userStreamId === undefined, 'streamId must not be set')
        const streamId = makeUserStreamId(this.userId)

        const events = [
            makeEvent(
                this.signerContext,
                makeInceptionPayload({
                    streamId,
                    streamKind: StreamKind.SK_USER,
                }),
                [],
            ),
        ]
        const { syncCookie } = await this.rpcClient.createStream({
            events,
        })

        return this.initUserStream(
            streamId,
            new StreamAndCookie({ events, nextSyncCookie: syncCookie }),
        )
    }

    async loadExistingUser(): Promise<void> {
        this.logCall('loadExistingUser')
        assert(this.userStreamId === undefined, 'streamId must not be set')
        const streamId = makeUserStreamId(this.userId)

        const userStream = await this.rpcClient.getStream({ streamId })
        assert(userStream.stream !== undefined, 'got bad user stream')
        return this.initUserStream(streamId, userStream.stream)
    }

    async createSpace(spaceId?: string): Promise<{ streamId: string }> {
        spaceId = spaceId ?? makeUniqueSpaceStreamId()
        this.logCall('createSpace', spaceId)
        assert(this.userStreamId !== undefined, 'streamId must be set')
        assert(isSpaceStreamId(spaceId), 'spaceId must be a valid streamId')

        // create utf8 encoder
        const streamId = spaceId
        const inceptionEvent = makeEvent(
            this.signerContext,
            makeInceptionPayload({
                streamId,
                streamKind: StreamKind.SK_SPACE,
            }),
            [],
        )
        const joinEvent = makeEvent(
            this.signerContext,
            makeJoinableStreamPayload({
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

        const inceptionEvent = makeEvent(
            this.signerContext,
            makeInceptionPayload({
                streamId: channelId,
                streamKind: StreamKind.SK_CHANNEL,
                spaceId,
            }),
            [],
        )
        const joinEvent = makeEvent(
            this.signerContext,
            makeJoinableStreamPayload({
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
            const syncPos: PartialMessage<SyncPos>[] = []
            this.streams.forEach((stream: Stream) => {
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
        payload: PartialMessage<ChannelMessage>['payload'],
    ): Promise<void> {
        const channelMessage = new ChannelMessage({ payload: payload })
        return this.makeEventAndAddToStream(
            streamId,
            makeMessagePayload({
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
        return this.makeEventAndAddToStream(
            streamId,
            makeJoinableStreamPayload({
                op: MembershipOp.SO_INVITE,
                userId, // TODO: USER_ID: other encoding?
            }),
            'inviteUser',
        )
    }

    // TODO: is it possible to join a space?
    async joinChannel(streamId: string): Promise<void> {
        this.logCall('joinChannel', streamId)
        await this.initStream(streamId)
        return this.makeEventAndAddToStream(
            streamId,
            makeJoinableStreamPayload({
                op: MembershipOp.SO_JOIN,
                userId: this.userId,
            }),
            'joinChannel',
        )
    }

    async makeEventAndAddToStream(
        streamId: string,
        payload: Payload | PartialMessage<Payload>,
        method?: string,
    ): Promise<void> {
        // TODO: filter this.logged payload for PII reasons
        this.logCall('makeEventAndAddToStream', method, streamId, payload)
        assert(this.userStreamId !== undefined, 'userStreamId must be set')

        const stream = this.streams.get(streamId)
        assert(stream !== undefined, 'unknown stream ' + streamId)

        const prevHashes = Array.from(stream.rollup.leafEventHashes.values())
        assert(prevHashes.length > 0, 'no prev hashes for stream ' + streamId)
        // TODO: should rollup now reference this event's hash?
        const event = makeEvent(this.signerContext, payload, prevHashes)

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
}
