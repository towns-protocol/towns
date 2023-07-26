import { PlainMessage } from '@bufbuild/protobuf'
import {
    StreamAndCookie,
    MembershipOp,
    ToDeviceOp,
    ChannelOp,
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
    MegolmSession,
    FallbackKeys,
    Key,
    SyncCookie,
    DeviceKeys,
    UserPayload_ToDevice,
    EncryptedDeviceData,
    EncryptedMessageEnvelope,
    FullyReadMarkerContent,
} from '@towns/proto'

import { Crypto } from './crypto/crypto'
import { OlmDevice, IExportedDevice as IExportedOlmDevice } from './crypto/olmDevice'
import { DeviceInfoMap, DeviceList, IOlmDevice } from './crypto/deviceList'
import { DLogger, dlog } from './dlog'
import { StreamRpcClientType } from './makeStreamRpcClient'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { check, hasElements, isDefined, throwWithCode } from './check'
import {
    StreamPrefix,
    isChannelStreamId,
    isSpaceStreamId,
    isUserStreamId,
    makeUniqueChannelStreamId,
    makeUniqueSpaceStreamId,
    makeUserDeviceKeyStreamId,
    makeUserSettingsStreamId,
    makeUserStreamId,
    userIdFromAddress,
} from './id'
import { SignerContext, makeEvent, unpackEnvelope } from './sign'
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
    getToDeviceWirePayloadContent,
    make_UserSettingsPayload_FullyReadMarker,
    make_UserSettingsPayload_Inception,
} from './types'
import { shortenHexString } from './binary'
import { CryptoStore } from './crypto/store/base'
import { DeviceInfo } from './crypto/deviceInfo'
import { IDecryptOptions, RiverEvent } from './event'
import debug from 'debug'
import { OLM_ALGORITHM } from './crypto/olmLib'
import { Stream } from './stream'

const log = dlog('csb:client')

function assert(condition: boolean, message: string): asserts condition {
    if (!condition) {
        log('assertion failed: ', message)
        throw new Error(message)
    }
}

const enum AbortReason {
    SHUTDOWN = 'SHUTDOWN',
    BLIP = 'BLIP',
}

interface IExportedDevice {
    olmDevice: IExportedOlmDevice
    userId: string
    deviceId: string
}

export class Client extends (EventEmitter as new () => TypedEmitter<StreamEvents>) {
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

    protected exportedOlmDeviceToImport?: IExportedOlmDevice
    public pickleKey?: string
    protected cryptoStore?: CryptoStore
    private cryptoBackend?: Crypto
    private syncLoop?: Promise<undefined | unknown>
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
        stream.update(streamAndCookie, true)

        stream.on('userJoinedStream', (s) => void this.onJoinedStream(s))
        stream.on('userLeftStream', (s) => void this.onLeftStream(s))

        return Promise.all(
            Array.from(stream.view.userJoinedStreams).map((streamId) => this.initStream(streamId)),
        ).then(() => {})
    }

    private async initUserSettingsStream(
        userSettingsStreamId: string,
        streamAndCookie: StreamAndCookie,
    ): Promise<void> {
        assert(this.userSettingsStreamId === undefined, 'streamId must not be set')
        this.userSettingsStreamId = userSettingsStreamId

        const stream = new Stream(
            userSettingsStreamId,
            unpackEnvelope(streamAndCookie.events[0]),
            this,
            this.logEmitFromStream,
        )
        this.streams.set(userSettingsStreamId, stream)
        stream.update(streamAndCookie, true)
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
        stream.update(streamAndCookie, true)
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
        })

        if (deviceResponse.stream) {
            await this.initUserDeviceKeyStream(userDeviceKeyStreamId, deviceResponse.stream)
        } else {
            throw new Error('deviceResponse.stream is undefined')
        }

        if (userSettingResponse.stream) {
            await this.initUserSettingsStream(userSettingsStreamId, userSettingResponse.stream)
        } else {
            throw new Error('userSettingResponse.stream is undefined')
        }

        if (userResponse.stream) {
            return this.initUserStream(userStreamId, userResponse.stream)
        } else {
            throw new Error('userResponse.stream is undefined')
        }
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
        await this.initUserDeviceKeyStream(userDeviceKeyStreamId, userDeviceKeyStream.stream)

        // init userStream
        const userStream = await this.rpcClient.getStream({ streamId: userStreamId })
        assert(userStream.stream !== undefined, 'got bad user stream')

        const userSettingsStream = await this.rpcClient.getStream({
            streamId: userSettingsStreamId,
        })
        assert(userSettingsStream.stream !== undefined, 'got bad user settings stream')
        await this.initUserSettingsStream(userSettingsStreamId, userSettingsStream.stream)

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
        stream.update(streamAndCookie, true)
    }

    async createSpace(
        spaceId: string | undefined,
        metadata: { name: string },
    ): Promise<{ streamId: string }> {
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
                name: metadata.name,
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

    async createChannel(
        spaceId: string,
        channelName: string,
        channelTopic: string,
        channelId?: string,
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
            'updateChannel',
        )
    }

    async sendFullyReadMarker(channelId: string, fullyReadMarkerContent: FullyReadMarkerContent) {
        this.logCall('sendFullyReadMarker', channelId, fullyReadMarkerContent)

        if (!isDefined(this.userSettingsStreamId)) {
            throw Error('userSettingsStreamId is not defined')
        }

        return this.makeEventAndAddToStream(
            this.userSettingsStreamId,
            make_UserSettingsPayload_FullyReadMarker({
                channelStreamId: channelId,
                content: {
                    text: fullyReadMarkerContent.toJsonString(),
                },
            }),
            'sendFullyReadMarker',
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

    private async getStream(streamId: string): Promise<StreamStateView> {
        try {
            this.logCall('getStream', streamId)
            const streamContent = await this.rpcClient.getStream({ streamId })
            this.logCall('getStream', streamContent.stream)
            check(
                isDefined(streamContent.stream) && hasElements(streamContent.stream?.events),
                'got bad stream',
            )
            const inception = unpackEnvelope(streamContent.stream.events[0])
            const stream = new StreamStateView(streamId, inception)
            stream.update(streamContent.stream)
            return stream
        } catch (err) {
            this.logCall('getStream', streamId, 'ERROR', err)
            throw err
        }
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
                    stream.update(streamContent.stream, true)
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

    async startSync(opt?: { onFailure?: (err: unknown) => void }): Promise<void> {
        const { onFailure } = opt ?? {}
        this.logSync('sync START')
        assert(this.userStreamId !== undefined, 'streamId must be set')

        this.syncLoop = (async (): Promise<undefined | unknown> => {
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
                        this.logSync('started syncStreams', syncPos)
                        for await (const syncedStream of sync) {
                            this.logSync('got syncStreams', syncedStream)
                            syncedStream.streams.forEach((streamAndCookie) => {
                                const streamId = streamAndCookie.streamId
                                this.logSync(
                                    'sync RESULTS for stream',
                                    streamId,
                                    'events=',
                                    streamAndCookie.events.length,
                                    'nextSyncCookie=',
                                    streamAndCookie.nextSyncCookie,
                                    'originalSyncCookie=',
                                    streamAndCookie.originalSyncCookie,
                                )
                                const stream = this.streams.get(streamId)
                                if (stream === undefined) {
                                    this.logSync('sync got stream', streamId, 'NOT FOUND')
                                    throwWithCode("Sync got stream that wasn't requested")
                                }
                                stream.update(streamAndCookie)
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

    async stopSync(): Promise<unknown | undefined> {
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
        const stream = this.stream(streamId)
        if (!stream) {
            throw new Error(`stream not found: ${streamId}`)
        }
        const ref = stream.view.events.get(payload.refEventId)
        if (!ref) {
            throw new Error(`ref event not found: ${payload.refEventId}`)
        }
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
        await this.initStream(streamId)
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

    async leaveStream(streamId: string): Promise<void> {
        this.logCall('leaveStream', streamId)
        if (isChannelStreamId(streamId)) {
            return this.makeEventAndAddToStream(
                streamId,
                make_ChannelPayload_Membership({
                    op: MembershipOp.SO_LEAVE,
                    userId: this.userId,
                }),
                'leaveChannel',
            )
        } else if (isSpaceStreamId(streamId)) {
            return this.makeEventAndAddToStream(
                streamId,
                make_SpacePayload_Membership({
                    op: MembershipOp.SO_LEAVE,
                    userId: this.userId,
                }),
                'leaveSpace',
            )
        } else {
            throw new Error('invalid streamId')
        }
    }

    async sendToDevicesMessage(
        userId: string,
        event: object,
        type: ToDeviceOp | string,
    ): Promise<void[]> {
        const op: ToDeviceOp =
            typeof type == 'string' ? ToDeviceOp[type as keyof typeof ToDeviceOp] : type
        assert(op !== undefined, 'invalid to device op')
        if (isUserStreamId(userId)) {
            userId = userId.slice(StreamPrefix.User.length)
        }
        const senderKey = this.cryptoBackend?.deviceKeys[`curve25519:${this.deviceId}`]
        if (!senderKey) {
            this.logCall('no sender key')
        }
        const streamId: string = makeUserStreamId(userId)
        await this.loadExistingForeignUser(userId)
        // retrieve all device keys of a user
        const deviceInfoMap = await this.getStoredDevicesForUser(userId)
        // encrypt event contents and encode ciphertext
        const envelope = await this.createOlmEncryptedCipherFromEvent(event, userId)
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
                    'toDevice',
                )
            })
        })
        return Promise.all(promiseArray.flat())
    }

    async sendToDeviceMessage(
        userId: string,
        event: object,
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
        const deviceKey = deviceKeyArr[0]
        this.logCall(`toDevice ${deviceKey.deviceId}, streamId ${streamId}, userId ${userId}`)
        // encrypt event contents and encode ciphertext
        const envelope = await this.createOlmEncryptedCipherFromEvent(event, userId)
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
            'userDeviceKey',
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
                    // as user's will eventually have multiple devices per user.
                    const payload = Array.from(stream.uploadedDeviceKeys.values())[0]

                    if (!returnFallbackKeys) {
                        const deviceKeys = payload.map((v) => v.deviceKeys).filter(isDefined)
                        // push all known device keys for all devices of user
                        response.device_keys[userId] = deviceKeys
                    } else {
                        const fallbackKeys = payload
                            .map((v) => {
                                if (v.deviceKeys?.deviceId && v.fallbackKeys) {
                                    const entry: FallbackKeyResponse = {
                                        [v.deviceKeys.deviceId]: v.fallbackKeys,
                                    }
                                    return entry
                                }
                                return undefined
                            })
                            .filter(isDefined)
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
                        failures: { [userId]: { error: e } },
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
        method?: string,
    ): Promise<void> {
        // TODO: filter this.logged payload for PII reasons
        this.logCall('await makeEventAndAddToStream', method, streamId, payload)
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
     * Creates an Event from a toDevice payload and attempts to decrypt it.
     */
    public async createDecryptToDeviceEvent(
        payload: UserPayload_ToDevice,
        senderUserId: string,
    ): Promise<RiverEvent> {
        const content = getToDeviceWirePayloadContent(payload)
        const toDevicePayload = make_UserPayload_ToDevice({
            deviceKey: payload.deviceKey,
            senderKey: payload.senderKey,
            op: payload.op,
            message: content,
        })

        const event = new RiverEvent({
            payload: {
                parsed_event: toDevicePayload,
                creator_user_id: senderUserId,
            },
        })
        try {
            await this.decryptEventIfNeeded(event)
        } catch (e) {
            this.logCall('error decrypting to-device event', e)
        }
        return event
    }

    /**
     * Create encrypted event from an object using Olm algorithm for each user's devices
     * and return ciphertext.
     *
     */
    public async createOlmEncryptedCipherFromEvent(
        event: object,
        recipientUserId: string,
    ): Promise<PlainMessage<EncryptedDeviceData>> {
        // encrypt event contents and encode ciphertext
        const content = {
            ['payload']: {
                sender: this.userId,
                content: event,
            },
            ['algorithm']: OLM_ALGORITHM,
        }
        const riverEvent = new RiverEvent({ content: content, sender: this.userId })
        try {
            await this.encryptEvent(riverEvent, [recipientUserId])
        } catch (e) {
            this.logCall('createEncryptedCipherFromEvent: ERROR', e)
            throw e
        }
        // todo: HNT-1800 -  tighted getWireContent to return EncryptedMessageEnvelope
        // for Olm encrypted messages
        const ciphertext: { [key: string]: PlainMessage<EncryptedMessageEnvelope> } =
            riverEvent.getWireContent().ciphertext
        return { ciphertext: ciphertext }
    }

    /**
     * Attempts to decrypt an event
     */
    public async decryptEventIfNeeded(event: RiverEvent, options?: IDecryptOptions): Promise<void> {
        if (event.shouldAttemptDecryption() || options?.forceRedecryptIfUntrusted) {
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

    public hasInboundSessionKeys(
        channelId: string,
        senderKey: string,
        sessionId: string,
    ): Promise<boolean> {
        return this.cryptoBackend?.olmDevice?.hasInboundSessionKeys(
            channelId,
            senderKey,
            sessionId,
        ) as Promise<boolean>
    }

    public importRoomKeys(_keys: MegolmSession[], _opts?: object): Promise<void> | undefined {
        // todo: implement on crypto module
        return
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
    public encryptAndSendToDevices(
        userDeviceInfoArr: IOlmDevice[],
        payload: object,
        type?: ToDeviceOp,
    ): Promise<void> {
        if (!this.cryptoBackend) {
            throw new Error('crypto backend not initialized')
        }
        return this.cryptoBackend.encryptAndSendToDevices(userDeviceInfoArr, payload, type)
    }

    public encryptEvent(event: RiverEvent, userIds: string[]): Promise<void> {
        if (!this.cryptoBackend) {
            throw new Error('crypto backend not initialized')
        }
        return this.cryptoBackend.encryptEvent(event, userIds)
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
