import {
    FullEvent,
    isChannelStreamId,
    isSpaceStreamId,
    makeEvent,
    makeUniqueChannelStreamId,
    makeUniqueSpaceStreamId,
    makeUserStreamId,
    Payload,
    SignerContext,
    StreamAndCookie,
    StreamEvents,
    StreamKind,
    StreamStateView,
    SyncPos,
    ZionServiceInterface,
} from '@zion/core'
import debug from 'debug'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'

const logCall = debug('zion:client:call')
const logSync = debug('zion:client:sync')
const logEmitFromStream = debug('zion:client:emit:stream')
const logEmitFromClient = debug('zion:client:emit:client')
const logEvent = debug('zion:client:event')

function assert(condition: any, message?: string): asserts condition {
    if (!condition) {
        throw new Error(message)
    }
}

export class Stream extends (EventEmitter as new () => TypedEmitter<StreamEvents>) {
    readonly streamId: string
    syncCookie?: string
    readonly clientEmitter: TypedEmitter<StreamEvents>
    rollup: StreamStateView

    constructor(
        streamId: string,
        inceptionEvent: FullEvent | undefined,
        clientEmitter: TypedEmitter<StreamEvents>,
    ) {
        super()
        this.streamId = streamId
        this.clientEmitter = clientEmitter
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
        assert(this.syncCookie === streamAndCookie.originalSyncCookie, 'syncCookie mismatch')
        this.rollup.addEvents(streamAndCookie.events, this, init)
        this.syncCookie = streamAndCookie.syncCookie
    }

    emit<E extends keyof StreamEvents>(event: E, ...args: Parameters<StreamEvents[E]>): boolean {
        logEmitFromStream(event, ...args)
        this.clientEmitter.emit(event, ...args)
        return super.emit(event, ...args)
    }
}

export class Client extends (EventEmitter as new () => TypedEmitter<StreamEvents>) {
    readonly signerContext: SignerContext
    readonly rpcClient: ZionServiceInterface
    userStreamId?: string
    readonly streams: { [streamId: string]: Stream } = {}
    stopSyncResolve?: (value: string) => void

    constructor(signerContext: SignerContext, rpcClient: ZionServiceInterface) {
        super()
        this.signerContext = signerContext
        this.rpcClient = rpcClient
        logCall('new Client', this.address)
    }

    async stop(): Promise<void> {
        logCall('stop', this.address)
        this.stopSyncIfStarted()
        if (this.rpcClient.hasOwnProperty('rpcClient')) {
            await (this.rpcClient as any).close()
        }
    }

    get address(): string {
        return this.signerContext.creatorAddress
    }

    stream(streamId: string): Stream | undefined {
        return this.streams[streamId]
    }

    private async initUserStream(
        streamId: string,
        streamAndCookie: StreamAndCookie,
    ): Promise<void> {
        assert(this.userStreamId === undefined, 'streamId must not be set')
        this.userStreamId = streamId

        const stream = new Stream(streamId, streamAndCookie.events[0], this)
        this.streams[streamId] = stream
        stream.addEvents(streamAndCookie)

        stream.on('userJoinedStream', this.onJoinedStream)
        stream.on('userLeftStream', this.onLeftStream)

        return Promise.all(
            Array.from(stream.rollup.userJoinedStreams).map((streamId) =>
                this.initStream(streamId),
            ),
        ).then(() => {})
    }

    async createNewUser(): Promise<void> {
        logCall('createNewUser', this.address)
        assert(this.userStreamId === undefined, 'streamId must not be set')
        const streamId = makeUserStreamId(this.address)

        const events = [
            makeEvent(
                this.signerContext,
                {
                    kind: 'inception',
                    streamId,
                    data: { streamKind: StreamKind.User },
                },
                [],
            ),
        ]
        const { syncCookie } = await this.rpcClient.createUser({
            events,
        })

        return this.initUserStream(streamId, { events, syncCookie })
    }

    async loadExistingUser(): Promise<void> {
        logCall('loadExistingUser', this.address)
        assert(this.userStreamId === undefined, 'streamId must not be set')
        const streamId = makeUserStreamId(this.address)

        const userStream = await this.rpcClient.getEventStream({ streamId })

        return this.initUserStream(streamId, userStream)
    }

    async createSpace(spaceId?: string): Promise<{ streamId: string }> {
        spaceId = spaceId ?? makeUniqueSpaceStreamId()
        logCall('createSpace', this.address, spaceId)
        assert(this.userStreamId !== undefined, 'streamId must be set')
        assert(isSpaceStreamId(spaceId), 'spaceId must be a valid streamId')

        const inceptionEvent = makeEvent(
            this.signerContext,
            {
                kind: 'inception',
                streamId: spaceId,
                data: { streamKind: StreamKind.Space },
            },
            [],
        )
        const joinEvent = makeEvent(
            this.signerContext,
            {
                kind: 'join',
                userId: this.address,
            },
            [inceptionEvent.hash],
        )

        await this.rpcClient.createSpace({
            events: [inceptionEvent, joinEvent],
        })

        return { streamId: spaceId! }
    }

    async createChannel(spaceId: string, channelId?: string): Promise<{ streamId: string }> {
        channelId = channelId ?? makeUniqueChannelStreamId()
        logCall('createChannel', this.address, channelId, spaceId)
        assert(this.userStreamId !== undefined, 'userStreamId must be set')
        assert(isChannelStreamId(channelId), 'channelId must be a valid streamId')

        const inceptionEvent = makeEvent(
            this.signerContext,
            {
                kind: 'inception',
                streamId: channelId,
                data: { streamKind: StreamKind.Channel, spaceId },
            },
            [],
        )
        const joinEvent = makeEvent(
            this.signerContext,
            {
                kind: 'join',
                userId: this.address,
            },
            [inceptionEvent.hash],
        )

        await this.rpcClient.createChannel({
            events: [inceptionEvent, joinEvent],
        })

        return { streamId: channelId! }
    }

    async waitForStream(streamId: string): Promise<Stream> {
        let stream = this.stream(streamId)
        if (stream !== undefined) {
            return stream
        }
        let resolve: () => void
        const done = new Promise<void>((res) => {
            resolve = res
        })
        const handler = (newStreamId: string) => {
            if (newStreamId === streamId) {
                this.off('streamInitialized', handler)
                resolve()
            }
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
        logCall('initStream', this.address, streamId)
        if (this.streams[streamId] === undefined) {
            const streamContent = await this.rpcClient.getEventStream({ streamId })
            if (this.streams[streamId] === undefined) {
                const stream = new Stream(streamId, streamContent.events[0], this)
                this.streams[streamId] = stream
                stream.addEvents(streamContent, true)
            } else {
                logCall('initStream', this.address, streamId, 'RACE: already initialized')
            }
        } else {
            logCall('initStream', this.address, streamId, 'already initialized')
        }
    }

    private onJoinedStream = async (streamId: string): Promise<void> => {
        logEvent('onJoinedStream', this.address, streamId)
        return this.initStream(streamId)
    }

    private onLeftStream = async (streamId: string): Promise<void> => {
        logEvent('onLeftStream', this.address, streamId)
        // TODO: implement
    }

    async startSync(timeoutMs?: number): Promise<void> {
        logSync('sync START', this.address)
        assert(this.stopSyncResolve === undefined, 'sync already started')
        assert(this.userStreamId !== undefined, 'streamId must be set')
        const stop = new Promise<string>((resolve) => {
            this.stopSyncResolve = resolve
        })

        while (this.stopSyncResolve !== undefined) {
            const syncPositions: SyncPos[] = []
            for (const streamId in this.streams) {
                const syncCookie = this.streams[streamId].syncCookie
                if (syncCookie !== undefined) {
                    syncPositions.push({
                        streamId,
                        syncCookie,
                    })
                }
            }
            logSync('sync CALL', this.address, 'numStreams=', syncPositions.length)
            const sync = await Promise.race([
                this.rpcClient.syncStreams({
                    syncPositions,
                    timeoutMs: timeoutMs ?? 29000, // TODO: from config
                }),
                stop,
            ])
            if (typeof sync === 'string') {
                logSync('sync CANCEL', this.address)
                this.stopSyncResolve = undefined
                break
            }
            logSync('sync RESULTS', this.address)
            Object.entries(sync.streams).forEach(([streamId, streamAndCookie]) => {
                logSync(
                    'sync got stream',
                    this.address,
                    streamId,
                    'events=',
                    streamAndCookie.events.length,
                    'syncCookie=',
                    streamAndCookie.syncCookie,
                    'originalSyncCookie=',
                    streamAndCookie.originalSyncCookie,
                )
                const stream = this.streams[streamId]
                if (stream === undefined) {
                    return
                }
                stream.addEvents(streamAndCookie)
            })
        }
        logSync('sync END', this.address)
    }

    stopSync(): void {
        logSync('sync STOP CALLED', this.address)
        assert(this.stopSyncResolve !== undefined, 'sync not started')
        this.stopSyncResolve('cancel')
        this.stopSyncResolve = undefined
        logSync('sync STOP DONE', this.address)
    }

    stopSyncIfStarted(): void {
        logSync('sync STOP IF STARTED CALLED', this.address)
        if (this.stopSyncResolve !== undefined) {
            this.stopSyncResolve('cancel')
            this.stopSyncResolve = undefined
            logSync('sync STOP DONE', this.address)
        } else {
            logSync('sync NOT STARTED', this.address)
        }
    }

    emit<E extends keyof StreamEvents>(event: E, ...args: Parameters<StreamEvents[E]>): boolean {
        logEmitFromClient(event, ...args)
        return super.emit(event, ...args)
    }

    async sendMessage(streamId: string, text: string): Promise<void> {
        return this.makeEventAndAddToStream(
            streamId,
            {
                kind: 'message',
                text,
            },
            'sendMessage',
        )
    }

    async inviteUser(streamId: string, userId: string): Promise<void> {
        return this.makeEventAndAddToStream(streamId, { kind: 'invite', userId }, 'inviteUser')
    }

    // TODO: is it possible to join a space?
    async joinChannel(streamId: string): Promise<void> {
        logCall('joinChannel', this.address, streamId)
        await this.initStream(streamId)
        return this.makeEventAndAddToStream(
            streamId,
            { kind: 'join', userId: this.signerContext.creatorAddress },
            'joinChannel',
        )
    }

    async makeEventAndAddToStream(
        streamId: string,
        payload: Payload,
        method?: string,
    ): Promise<void> {
        // TODO: filter logged payload for PII reasons
        logCall('makeEventAndAddToStream', this.address, method, streamId, payload)
        assert(this.userStreamId !== undefined, 'userStreamId must be set')

        const stream = this.streams[streamId]
        assert(stream !== undefined, 'unknown stream ' + streamId)

        // TODO: should rollup now refernce this event's hash?
        const event = makeEvent(
            this.signerContext,
            payload,
            Array.from(stream.rollup.leafEventHashes),
        )

        await this.rpcClient.addEvent({
            streamId,
            event,
        })
    }
}
