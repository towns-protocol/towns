import { PlainMessage } from '@bufbuild/protobuf'
import { Permission } from '@river/web3'
import {
    ToDeviceOp,
    KeyResponseKind,
    MegolmSession,
    ToDeviceMessage,
    UserPayload_ToDevice,
    OlmMessage,
    KeySolicitation,
    StreamEvent,
} from '@river/proto'
import throttle from 'lodash/throttle'
import type { DebouncedFunc } from 'lodash'
import { isChannelStreamId, isDMChannelStreamId, isGDMChannelStreamId, isUserStreamId } from './id'
import { MEGOLM_ALGORITHM } from './crypto/olmLib'
import { RiverEventV2 } from './eventV2'
import { Client } from './client'
import { IEventOlmDecryptionResult } from './crypto/crypto'
import {
    make_ChannelPayload_KeySolicitation,
    make_ChannelPayload_Fulfillment,
    make_DmChannelPayload_KeySolicitation,
    make_DmChannelPayload_Fulfillment,
    make_GdmChannelPayload_KeySolicitation,
    make_GdmChannelPayload_Fulfillment,
    make_ToDevice_KeyResponse,
} from './types'
import { isTestEnv } from './utils'
import { bin_fromString } from './binary'
import { dlog, dlogError } from './dlog'

const logLog = dlog('csb:rde:log', { defaultEnabled: isTestEnv() })
const logInfo = dlog('csb:rde:info', { defaultEnabled: true })
const logWarn = dlog('csb:rde:warn', { defaultEnabled: true })
const logError = dlogError('csb:rde:error')

const console = {
    log: logLog,
    info: logInfo,
    warn: logWarn,
    error: logError,
}

/// control the number of outgoing room key requests for events that failed to decrypt
const MAX_CONCURRENT_ROOM_KEY_REQUESTS = 2
/// how many events to include in the same to-device message
const MAX_EVENTS_PER_REQUEST = 64
/// time betwen debounced calls to look for keys
const TIME_BETWEEN_LOOKING_FOR_KEYS_MS = 500
/// time between processing to-device events
const DELAY_BETWEEN_PROCESSING_TO_DEVICE_EVENTS_MS = 10
// max time to wait before sending a key fulfillment
const MAX_WAIT_TIME_FOR_KEY_FULFILLMENT_MS = 5000

type MegolmSessionData = MegolmSession
type OlmDecryptedMessage = OlmMessage
export interface EntitlementsDelegate {
    isEntitled(
        spaceId: string | undefined,
        channelId: string | undefined,
        user: string,
        permission: Permission,
    ): Promise<boolean>
}

interface KeyResponseBase {
    streamId: string
}

interface KeyResponse_RoomNotFound extends KeyResponseBase {
    kind: KeyResponseKind.KRK_CHANNEL_NOT_FOUND
}

interface KeyResponse_KeysNotFound extends KeyResponseBase {
    kind: KeyResponseKind.KRK_KEYS_NOT_FOUND
}

interface KeyResponse_KeysFound extends KeyResponseBase {
    kind: KeyResponseKind.KRK_KEYS_FOUND
    sessions?: MegolmSession[]
}

type KeyResponsePayload =
    | KeyResponse_RoomNotFound
    | KeyResponse_KeysNotFound
    | KeyResponse_KeysFound

interface KeyRequestRecord {
    timestamp: number
    error?: Error
    response: KeyResponsePayload[]
}

interface RoomRecord {
    decryptionFailures: RiverEventV2[]
    isEntitled?: boolean
    spaceId?: string
    channelId?: string
    lastRequestAt?: number
    requestingFrom?: string
    requests: Record<string, KeyRequestRecord>
}

interface EventOlmDecryptionResult extends IEventOlmDecryptionResult {
    senderUserId: string
}

interface EventKeySolicitation {
    event: KeySolicitation
    eventHash: string
    streamId: string
    senderUserId: string
}

export class RiverDecryptionExtension {
    roomRecords: Record<string, RoomRecord> = {}
    private client: Client
    private delegate: EntitlementsDelegate
    private userId: string
    private accountAddress: string
    // todo: remove processor map related to to-device events HNT-2868
    private receivedToDeviceEventQueue: ProcessingQueue<EventOlmDecryptionResult>
    private receivedToDeviceProcessorMap: Record<
        string,
        (event: OlmDecryptedMessage, senderId: string, senderCurve25519Key: string) => Promise<void>
    >
    private receivedKeySolicitationEventQueue: ProcessingQueue<EventKeySolicitation>
    private receivedKeySolicitationProcessor: (
        event: KeySolicitation,
        fromUserId: string,
        streamId: string,
        eventHash: string,
    ) => Promise<void>
    private throttledStartLookingForKeys: DebouncedFunc<() => void> | null = null
    private clientRunning = true

    constructor(client: Client, delegate: EntitlementsDelegate) {
        this.client = client
        this.delegate = delegate
        this.userId = getOrThrow(this.client.userId, 'CDE::constructor - no userId')
        // todo: this will likely change soon as userId will not always be 1-1 with
        // account address
        this.accountAddress = this.userId

        // mapping of event type to processors
        this.receivedToDeviceProcessorMap = {
            [ToDeviceOp[ToDeviceOp.TDO_KEY_RESPONSE]]: (e, s) => {
                return this.onKeyResponse(e, s)
            },
        }

        this.receivedToDeviceEventQueue = new ProcessingQueue<EventOlmDecryptionResult>({
            process: (event) => {
                return this.processToDeviceEvent(event)
            },
            delayMs: DELAY_BETWEEN_PROCESSING_TO_DEVICE_EVENTS_MS,
        })

        this.receivedKeySolicitationProcessor = (e, s, t, u) => {
            return this.onKeySolicitation(e, s, t, u)
        }

        this.receivedKeySolicitationEventQueue = new ProcessingQueue<EventKeySolicitation>({
            process: (event) => {
                return this.processKeySolicitationEvent(event)
            },
            delayMs: DELAY_BETWEEN_PROCESSING_TO_DEVICE_EVENTS_MS,
        })

        this.throttledStartLookingForKeys = throttle(
            () => {
                void this.startLookingForKeys()
            },
            TIME_BETWEEN_LOOKING_FOR_KEYS_MS,
            {
                leading: true,
            },
        )
        if (!client.cryptoEnabled) {
            throw new Error('CDE::constructor - client crypto not initialized')
        }

        // listen for key responses
        client.on('toDeviceMessage', this.onToDeviceEvent)

        // listen for key solicitations for streams
        client.on('keySolicitationMessage', this.onKeySolicitationEvent)

        // listen for new channel message events
        client.on('channelNewMessage', this.onChannelEvent)

        // listen for roster changes
        client.on('streamNewUserJoined', this.onNewUserJoinedEvent)

        // todo: listen for device update events

        // listen for decryption events
        client.on('eventDecrypted', this.onDecryptedEvent)
    }

    public stop(): void {
        this.throttledStartLookingForKeys?.cancel()
        this.throttledStartLookingForKeys = null
        // stop listening for key requests
        this.client.off('toDeviceMessage', this.onToDeviceEvent)
        this.client.off('keySolicitationMessage', this.onKeySolicitationEvent)
        this.client.off('channelNewMessage', this.onChannelEvent)
        this.client.off('streamNewUserJoined', this.onNewUserJoinedEvent)
        this.client.off('eventDecrypted', this.onDecryptedEvent)
        this.receivedToDeviceProcessorMap = {}
        this.receivedToDeviceEventQueue.stop()
        this.receivedKeySolicitationEventQueue.stop()
    }

    private async processKeySolicitationEvent(event: EventKeySolicitation): Promise<void> {
        // check that event has not already been fulfilled by someone else
        if (this.keySolicitationFulfilled(event.streamId, event.eventHash, event.event.sessionId)) {
            console.log(
                `CDE::processKeySolicitationEvent - event already fulfilled`,
                event.streamId,
                event.eventHash,
            )
            return
        }
        // call processor
        const processor = this.receivedKeySolicitationProcessor
        if (!processor) {
            throw new Error(
                `CDE::processKeySolicitationEvent - no processor found for event ${event.eventHash}`,
            )
        }
        await processor(event.event, event.senderUserId, event.streamId, event.eventHash)
    }

    private async processToDeviceEvent(event: EventOlmDecryptionResult): Promise<void> {
        const content = event.clearEvent
        const op = content.content?.payload.case
        if (!op) {
            throw new Error(
                'CDE::processToDeviceEvent - no op found - is this not a toDevice event?',
            )
        }
        let toDeviceOp: string | undefined
        switch (op) {
            case 'request':
                toDeviceOp = ToDeviceOp[ToDeviceOp.TDO_KEY_REQUEST]
                break
            case 'response':
                toDeviceOp = ToDeviceOp[ToDeviceOp.TDO_KEY_RESPONSE]
                break
            default:
                break
        }
        if (!toDeviceOp) {
            throw new Error(`CDE::processToDeviceEvent - no toDeviceOp found for event ${op}`)
        }
        const processor = this.receivedToDeviceProcessorMap[toDeviceOp]
        if (!processor) {
            throw new Error(
                `CDE::processToDeviceEvent - no processor found for event ${toDeviceOp}`,
            )
        }

        await processor(content, event.senderUserId, event.senderCurve25519Key ?? '')
    }

    private onDecryptedEvent = (event: RiverEventV2, err: Error | undefined) => {
        try {
            const streamId = event.getStreamId()
            if (!streamId) {
                throw new Error('CDE::onDecryptionSuccess- no streamId found')
            }
            if (!event.isDecryptionFailure()) {
                this.client.updateDecryptedStream(streamId, event)
                return
            }
            if (isUserStreamId(streamId)) {
                console.log(
                    'CDE::onDecryptionFailure - decryption failure for user stream event, not going to start looking for keys',
                    {
                        eventId: event.getId() ?? '',
                        sender: event.getSender(),
                        err: err,
                        streamId,
                    },
                )
                return
            }

            const stream = this.client.stream(streamId)?.view
            if (!stream) {
                throw new Error(`CDE::onDecryptionFailure - stream not found locally ${streamId}`)
            }
            const spaceId =
                stream.contentKind === 'channelContent' ? stream.channelContent.spaceId : undefined

            const channelId = event.getChannelId()
            if (!channelId) {
                console.log(
                    'CDE::onDecryptionFailure - missing channelId, not going to start looking for keys',
                    {
                        eventId: event.getId() ?? '',
                        err: err,
                        channelId: channelId,
                        spaceId: spaceId,
                    },
                )
                return
            }

            if (!this.roomRecords[channelId]) {
                this.roomRecords[channelId] = {
                    decryptionFailures: [],
                    channelId,
                    spaceId,
                    requests: {},
                }
            }
            const roomRecord = this.roomRecords[channelId]
            if (!roomRecord.decryptionFailures.some((e) => e.getId() === event.getId())) {
                roomRecord.decryptionFailures.push(event)
            }
            if (this.throttledStartLookingForKeys) {
                this.throttledStartLookingForKeys()
            }
        } catch (e) {
            console.error('CDE::onDecryptedEvent - error decrypting event', e)
        }
    }

    private onChannelEvent = (_streamId: string, event: RiverEventV2) => {
        ;(async () => {
            console.log('CDE::onChannelEvent - new channel event for streamId', _streamId)
            if (event.shouldAttemptDecryption()) {
                try {
                    await this.client.decryptEventIfNeeded(event)
                } catch (e) {
                    console.error('error decrypting channel event', e)
                }
            }
        })().catch((e) => {
            console.error('CDE::onChannelEvent - error decrypting event', e)
        })
    }

    private onKeySolicitationEvent = (
        streamId: string,
        event: KeySolicitation,
        eventHash: string,
        senderUserId: string,
    ) => {
        if (!eventHash) {
            throw new Error('CDE::onKeySolicitationEvent - no event hash found')
        }
        const keySolicitationEvent: EventKeySolicitation = {
            event,
            eventHash,
            streamId,
            senderUserId,
        }
        this.receivedKeySolicitationEventQueue.enqueue(keySolicitationEvent)
    }

    private onToDeviceEvent = (
        _streamId: string,
        event: UserPayload_ToDevice,
        senderUserId: string,
    ) => {
        ;(async () => {
            const op = event.op
            if (!op) {
                throw new Error('CDE::onToDeviceEvent - no event type found')
            }
            if (!Object.keys(this.receivedToDeviceProcessorMap).includes(ToDeviceOp[op])) {
                throw new Error(
                    `CDE::onToDeviceEvent - no processor found for event with op ${ToDeviceOp[op]}`,
                )
            }
            const intendedDeviceKey = event.deviceKey
            if (intendedDeviceKey !== this.client.olmDevice.deviceCurve25519Key) {
                // not intended for this device, not attempting to decrypt',
                return
            }
            try {
                const clear = await this.client.decryptOlmEvent(event, senderUserId)
                const senderCurve25519Key = event.senderKey
                this.receivedToDeviceEventQueue.enqueue({
                    ...clear,
                    senderUserId,
                    senderCurve25519Key,
                })
            } catch (e) {
                console.error(
                    `CDE::onToDeviceEvent error decrypting to-device event for device key ${event.deviceKey}, 
                    current device key ${this.client.olmDevice.deviceCurve25519Key}`,
                    e,
                )
                return
            }
        })().catch((e) => {
            console.error('CDE::onToDeviceEvent - error decrypting event', e)
        })
    }

    private onNewUserJoinedEvent = () => {
        if (this.throttledStartLookingForKeys) {
            this.throttledStartLookingForKeys()
        }
    }

    private async startLookingForKeys() {
        if (!this.clientRunning) {
            console.log('CDE:startLookingForKeys client not running')
            return
        }

        await this.checkSelfIsEntitled()

        this.cleanseSuccessfullyDecryptedRooms()

        // filter out in progress or empty entires, sort by priority
        const rooms = Object.entries(this.roomRecords)
            // add channelId to streamRecord
            .map(([channelId, streamRecord]) => {
                return { ...streamRecord, channelId }
            })
            // filter out rooms that we're not entitled to
            .filter((roomRecord) => roomRecord.isEntitled === true)
            // filter out rooms that have no events to look for keys for
            .filter((roomRecord) => roomRecord.decryptionFailures.length > 0)
            // sort by priority
            .sort((a, b) => {
                return (a.lastRequestAt ?? 0) - (b.lastRequestAt ?? 0)
            })

        console.log(
            `CDE::startLookingForKeys, found ${rooms.length} unstarted rooms with decryption failures`,
            { rooms: rooms.map((r) => r.channelId) },
        )

        for (const room of rooms) {
            if (this.currentlyRequestingCount() >= MAX_CONCURRENT_ROOM_KEY_REQUESTS) {
                console.log('CDE::startLookingForKeys - max concurrent requests')
                break
            }
            // todo: HNT-2868 remove _startLookingForkeys in favor of _askStreamForKeys which is more efficient
            // since the request happens against the stream not every members' devices.
            await this._askStreamForKeys(room.channelId)
        }
    }

    private currentlyRequestingCount(): number {
        return Object.values(this.roomRecords).filter(
            (roomRecord) => roomRecord.requestingFrom !== undefined,
        ).length
    }

    private async checkSelfIsEntitled(): Promise<void> {
        // make sure we're entitled to the space prior to requesting keys]
        for (const [roomId, roomRecord] of Object.entries(this.roomRecords)) {
            if (roomRecord.isEntitled === undefined) {
                const spaceId = roomRecord.spaceId
                roomRecord.isEntitled = await this.delegate.isEntitled(
                    spaceId,
                    roomId,
                    this.accountAddress,
                    Permission.Read,
                )
            }
        }
    }

    private cleanseSuccessfullyDecryptedRooms() {
        // filter out any successful decryption events
        // filter out any successful decryption events
        Object.entries(this.roomRecords).forEach(([roomId, roomRecord]) => {
            const failingCount = roomRecord.decryptionFailures.length
            const stillFailing = roomRecord.decryptionFailures.filter((e) =>
                e.isDecryptionFailure(),
            )
            if (failingCount !== stillFailing.length) {
                console.log('CDE::startLookingForKeys - successfully decrypted events', {
                    roomId: roomId,
                    prevFailingCount: failingCount,
                    newFailingCount: stillFailing.length,
                })
                roomRecord.decryptionFailures = stillFailing
            }
        })
    }

    private async _askStreamForKeys(streamId: string) {
        const roomRecord = this.roomRecords[streamId]
        if (!roomRecord) {
            throw new Error('CDE::_askStreamForKeys - room record not found')
        }
        const hasStream = this.client.streams.has(streamId)
        if (!hasStream) {
            throw new Error('CDE::_askRoomForKeys - room not found')
        }
        if (!roomRecord.decryptionFailures.length) {
            console.log(`CDE::_askRoomForKeys - no decryption failures for`, { streamId })
            return
        }
        const now = Date.now()
        roomRecord.lastRequestAt = now
        roomRecord.requests = {
            ...(roomRecord.requests ?? {}),
            [streamId]: { timestamp: now, response: [] },
        }

        const unknownSessionIds: [senderKey: string, sessionId: string][] =
            roomRecord.decryptionFailures.map((event) => {
                const wireContent = event.getWireContent()
                return [wireContent.senderKey ?? '', wireContent.sessionId ?? '']
            })
        const allSharedHistorySessions: [senderKey: string, sessionId: string][] | undefined =
            await this.client.cryptoBackend?.olmDevice?.getSharedHistoryInboundGroupSessions(
                streamId,
            )

        const ourDeviceKey = this.client.olmDevice.deviceCurve25519Key
        if (!ourDeviceKey) {
            throw new Error('CDE::_askRoomForKeys - our device key not found')
        }
        const knownSessions =
            allSharedHistorySessions?.map(([_senderKey, sessionId]) => sessionId) ?? []

        let request: PlainMessage<StreamEvent>['payload']
        // for each room, ask for all missing sessionIds sequentially to stream
        const requests: Promise<void>[] = []
        for (const unknownSessionAndSender of unknownSessionIds) {
            const unknownSessionRequested = unknownSessionAndSender[1]
            const stream = this.client.streams.get(streamId)
            if (!stream) {
                console.log("CDE::_askRoomForKeys - stream doesn't exist")
                return
            }
            if (!stream?.view.userIsEntitledToKeyExchange(this.client.userId)) {
                console.log(
                    'CDE::_askForRoomKeys - user is not a memeber of the room and cannot request keys',
                )
                return
            }

            if (isChannelStreamId(streamId)) {
                const keySolicitations = stream.view.channelContent.keySolicitations
                // todo jterzis: add restart criteria based on eventNum returned from miniblock in the case that
                // a fulfillment didn't return the correct session key
                if (keySolicitations.hasKeySolicitation(ourDeviceKey, unknownSessionRequested)) {
                    return
                }

                request = make_ChannelPayload_KeySolicitation({
                    sessionId: unknownSessionRequested,
                    algorithm: MEGOLM_ALGORITHM,
                    senderKey: ourDeviceKey,
                    knownSessionIds:
                        knownSessions.length < MAX_EVENTS_PER_REQUEST ? knownSessions : [],
                })
            } else if (isDMChannelStreamId(streamId)) {
                const keySolicitations = stream.view.dmChannelContent.keySolicitations
                if (keySolicitations.hasKeySolicitation(ourDeviceKey, unknownSessionRequested)) {
                    return
                }
                request = make_DmChannelPayload_KeySolicitation({
                    sessionId: unknownSessionRequested,
                    algorithm: MEGOLM_ALGORITHM,
                    senderKey: ourDeviceKey,
                    knownSessionIds:
                        knownSessions.length < MAX_EVENTS_PER_REQUEST ? knownSessions : [],
                })
            } else if (isGDMChannelStreamId(streamId)) {
                const keySolicitations = stream.view.gdmChannelContent.keySolicitations
                if (keySolicitations.hasKeySolicitation(ourDeviceKey, unknownSessionRequested)) {
                    return
                }
                request = make_GdmChannelPayload_KeySolicitation({
                    sessionId: unknownSessionRequested,
                    algorithm: MEGOLM_ALGORITHM,
                    senderKey: ourDeviceKey,
                    knownSessionIds:
                        knownSessions.length < MAX_EVENTS_PER_REQUEST ? knownSessions : [],
                })
            } else {
                throw new Error('CDE::_askRoomForKeys - unknown stream type')
            }
            requests.push(this.client.makeEventAndAddToStream(streamId, request))
        }
        await Promise.all(requests)
    }

    private async onKeySolicitation(
        event: KeySolicitation,
        fromUserId: string,
        streamId: string,
        eventHash: string,
    ) {
        // todo: allow for sending key requests for multiple sessionIds at once
        const { sessionId, knownSessionIds, senderKey } = event

        // don't process key solicitations from our device
        if (senderKey == this.client.olmDevice.deviceCurve25519Key) {
            console.log('CDE::onKeySolicitation: request from our own device, skipping.')
            return
        }

        // todo: support multiple stream types not just channel streams
        const stream = this.client.streams.get(streamId)
        if (!stream) {
            console.error('CDE::onKeyRequest - no stream found for streamId', { streamId })
            return
        }

        const spaceId =
            stream.view.contentKind === 'channelContent'
                ? stream.view.channelContent.spaceId
                : undefined

        if (!spaceId && stream.view.contentKind === 'channelContent') {
            console.log('CDE::onKeyRequest - no spaceId found for streamId', { streamId })
        }

        if (senderKey === this.client.olmDevice.deviceCurve25519Key) {
            // todo: in production we should ignore key requests from ourself
            console.log('CDE::onKeySolicitation: request from self.')
        }
        const requestedSessions: [streamId: string, sessionId: string][] = [[streamId, sessionId]]
        console.log('CDE::onKeySolicitation recieved', {
            spaceId,
            streamId,
            fromUserId,
            senderKey,
            sessionId,
        })

        const hasStream = this.client.streams.has(streamId)
        if (!hasStream) {
            throw new Error('CDE::_onKeySolicitation - room not found')
        }

        if (!stream?.view.userIsEntitledToKeyExchange(fromUserId)) {
            console.log(`CDE::_onKeySolicitation - not a stream member asking for keys`, {
                streamId,
                fromUserId,
            })
            return
        }

        // check with the space contract to see if this user is entitled
        const isEntitled = await this.delegate.isEntitled(
            spaceId,
            streamId,
            fromUserId,
            Permission.Read,
        )

        if (!isEntitled) {
            console.warn('CDE::onKeySolicitation - key sharing request from unentitled user', {
                spaceId,
                streamId,
                from: fromUserId,
            })
            return
        }
        if (!senderKey) {
            console.warn(
                'CDE::onKeySolicitation - got key sharing request with no sender key found',
            )
            return
        }

        // download key for user to DeviceList
        await this.client.downloadKeys([fromUserId])

        const deviceInfo = this.client.deviceList?.getDeviceByIdentityKey(
            MEGOLM_ALGORITHM,
            senderKey,
        )

        if (!deviceInfo) {
            console.warn(
                'CDE::onKeySolicitation - got key sharing request with no device info found',
            )
            return
        }

        const encryptAndRespondWith = async (response: ToDeviceMessage) => {
            const devicesInfo = [{ userId: fromUserId, deviceInfo }]
            return this.client.encryptAndSendToDevices(devicesInfo, response)
        }

        const getUniqueUnknownSharedHistorySessions = async (channelId: string) => {
            if (knownSessionIds) {
                const allSharedHistorySessions =
                    await this.client.cryptoBackend?.olmDevice.getSharedHistoryInboundGroupSessions(
                        channelId,
                    )
                return (
                    allSharedHistorySessions?.filter(
                        ([_streamId, sessionId]) => !knownSessionIds?.includes(sessionId),
                    ) ?? []
                )
            }
            return []
        }

        // Set a timeout — we don't want all channel members to simultaneously respond to the key request
        const waitTime =
            isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId)
                ? 0
                : isTestEnv()
                ? 100
                : Math.random() * MAX_WAIT_TIME_FOR_KEY_FULFILLMENT_MS
        console.log('CDE::onKeySolicitation waiting for', waitTime, 'ms')
        await new Promise((resolve) => setTimeout(resolve, waitTime))

        // Last minute check to make sure noone else has responded to the key solicitation
        const fulfilled = this.keySolicitationFulfilled(streamId, eventHash, sessionId)
        if (fulfilled) {
            console.log('CDE::onKeySolicitation - key request already fulfilled for session', {
                sessionId,
                streamId,
                eventHash,
            })
            return
        }

        const sharedHistorySessions = await getUniqueUnknownSharedHistorySessions(streamId)

        console.log('CDE::onKeySolicitation requested', {
            streamId,
            requestedSessions: requestedSessions?.length,
            knownSessionIds: knownSessionIds?.length,
            mySessions: sharedHistorySessions.length,
        })

        const uniqueRequestedSessions = (requestedSessions ?? []).filter(
            (x) => !sharedHistorySessions.some((y) => x[1] === y[1]),
        )

        const allRequestedSessions = sharedHistorySessions.concat(uniqueRequestedSessions)
        console.log('CDE::onKeySolicitation all requested sessions', { allRequestedSessions })

        const exportedSessions: MegolmSessionData[] = []

        for (const [streamId, sessionId] of allRequestedSessions) {
            const sessionData = await this.client.cryptoStore.getEndToEndInboundGroupSession(
                streamId,
                sessionId,
            )
            if (!sessionData || !this.client.cryptoBackend) {
                continue
            }

            if (sessionData.stream_id === streamId) {
                const sess = this.client.cryptoBackend?.olmDevice.exportInboundGroupSession(
                    streamId,
                    sessionId,
                    sessionData,
                )
                delete sess.first_known_index
                sess.algorithm = MEGOLM_ALGORITHM
                exportedSessions.push(
                    new MegolmSession({
                        streamId: sess.stream_id,
                        sessionId: sess.session_id,
                        sessionKey: sess.session_key,
                        algorithm: sess.algorithm,
                    }),
                )
            } else {
                console.error('CDE::onKeySolicitation got key sharing request for wrong room', {
                    streamId,
                    fromUserId,
                    sessionId,
                })
            }
        }

        console.info('CDE::onKeySolicitation responding to key request', {
            fromUserId,
            toUserId: fromUserId,
            streamId,
            knownSessionIds: knownSessionIds?.length,
            requestedSessions: requestedSessions?.length,
            numSessionsLookedUp: allRequestedSessions.length,
            exportedSessions: exportedSessions.length,
        })

        if (!exportedSessions.length) {
            console.info('CDE::onKeySolicitation got key sharing request for unknown room', {
                streamId,
            })
            const response = new ToDeviceMessage(
                make_ToDevice_KeyResponse({
                    streamId,
                    sessions: [],
                    kind: KeyResponseKind.KRK_KEYS_NOT_FOUND,
                }),
            )
            await encryptAndRespondWith(response)
            return
        }
        const response = new ToDeviceMessage(
            make_ToDevice_KeyResponse({
                kind: KeyResponseKind.KRK_KEYS_FOUND,
                streamId,
                sessions: exportedSessions,
            }),
        )
        await encryptAndRespondWith(response)
        let fulfillment: PlainMessage<StreamEvent>['payload']
        if (isChannelStreamId(streamId)) {
            fulfillment = make_ChannelPayload_Fulfillment({
                originHash: bin_fromString(eventHash),
                sessionIds: exportedSessions.map((s) => s.sessionId),
                algorithm: event.algorithm,
            })
        } else if (isDMChannelStreamId(streamId)) {
            fulfillment = make_DmChannelPayload_Fulfillment({
                originHash: bin_fromString(eventHash),
                sessionIds: exportedSessions.map((s) => s.sessionId),
                algorithm: event.algorithm,
            })
        } else if (isGDMChannelStreamId(streamId)) {
            fulfillment = make_GdmChannelPayload_Fulfillment({
                originHash: bin_fromString(eventHash),
                sessionIds: exportedSessions.map((s) => s.sessionId),
                algorithm: event.algorithm,
            })
        } else {
            throw new Error('CDE::_onKeySolicitation - unknown stream type')
        }
        // send fulfillment to channel stream
        await this.client.makeEventAndAddToStream(streamId, fulfillment)
    }

    private async onKeyResponse(event: OlmDecryptedMessage, senderId: string) {
        const clear_content = event['content']
        if (!clear_content) {
            throw new Error(
                'CDE::onKeyRespone - no parsed content found in event, did decryption fail?',
            )
        }
        if (clear_content.payload.case !== 'response') {
            console.error('CDE::onKeyResponse - not a key response')
            return
        }

        switch (clear_content.payload.value.kind) {
            case KeyResponseKind.KRK_CHANNEL_NOT_FOUND:
                break
            case KeyResponseKind.KRK_KEYS_NOT_FOUND:
                break
            case KeyResponseKind.KRK_KEYS_FOUND:
                {
                    const { streamId, sessions: responseSessions } = clear_content.payload.value

                    if (!streamId) {
                        console.warn('CDE::onKeyResponse - no streamId found', { streamId })
                        return
                    }
                    let streamRecord = this.roomRecords[streamId]
                    if (!streamRecord) {
                        streamRecord = {
                            decryptionFailures: [],
                            channelId: streamId,
                            spaceId: streamId,
                            requests: {},
                        }
                        console.warn('CDE::onKeyResponse - room record not found', { streamId })
                    }
                    if (!streamRecord.requests?.[streamId]) {
                        console.warn('CDE::onKeyResponse - no request found for streamId', {
                            senderId,
                            streamId,
                        })
                        streamRecord.requests = {
                            ...(streamRecord.requests ?? {}),
                            [streamId]: { timestamp: Date.now(), response: [] },
                        }
                    }
                    streamRecord.requests[streamId].response.push({
                        kind: clear_content.payload.value.kind,
                        sessions: responseSessions,
                        streamId,
                    })
                    this.roomRecords[streamId] = streamRecord

                    // great, the sender had keys for us
                    if (responseSessions) {
                        const sessions: MegolmSession[] = []
                        // loop over everything we got back
                        for (const content of responseSessions) {
                            // see if we still need the key as there's no point in importing it twice
                            const event = this.roomRecords[streamId]?.decryptionFailures.find(
                                (e) => e.getWireContent().sessionId === content.sessionId,
                            )

                            if (event) {
                                if (event.isDecryptionFailure()) {
                                    sessions.push(content)
                                }
                            } else {
                                // if we aren't tracking this event, check if we
                                // are missing keys for it
                                const hasKeys = await this.client.hasInboundSessionKeys(
                                    content.streamId,
                                    content.sessionId,
                                )
                                if (!hasKeys) {
                                    sessions.push(content)
                                }
                            }
                        }

                        // if we found some new keys, import them
                        if (!sessions.length) {
                            console.log('CDE::onKeyResponse - no new keys needed')
                        } else {
                            console.log('CDE:importSessionKeys', {
                                inPayload: sessions.length,
                                needed: sessions.length,
                                senderId,
                            })
                            await this.client.importRoomKeys(streamId, sessions)
                        }
                    }
                    await Promise.all([
                        streamRecord.decryptionFailures.map((e) => e.getDecryptionPromise()),
                    ])

                    // clear any request to this user and start looking for keys again
                    console.log('CDE::onKeyResponse - complete', {
                        kind: clear_content.payload.value.kind,
                        senderId,
                        streamId,
                    })
                    this.clearKeyRequest(streamId)
                }
                break
            default:
                console.log(
                    `CDE::onKeyResponse - unknown response kind', ${clear_content.payload.value.kind}, ${senderId}`,
                )
        }
    }

    keySolicitationFulfilled(streamId: string, originHash: string, sessionId: string): boolean {
        // We should already be subscribing to this stream — it's the only way
        // we could've gotten the key solicitation event in the first place.
        const stream = this.client.streams.get(streamId)
        if (!stream) {
            throw new Error('CDE::keySolicitationFulfilled - stream not found')
        }

        if (isChannelStreamId(streamId)) {
            const sessions =
                stream.view.channelContent.keySolicitations.fulfilledSessions(originHash)
            return sessions?.includes(sessionId) ?? false
        } else if (isDMChannelStreamId(streamId)) {
            const sessions =
                stream.view.dmChannelContent.keySolicitations.fulfilledSessions(originHash)
            return sessions?.includes(sessionId) ?? false
        } else if (isGDMChannelStreamId(streamId)) {
            const sessions =
                stream.view.gdmChannelContent.keySolicitations.fulfilledSessions(originHash)
            return sessions?.includes(sessionId) ?? false
        } else {
            throw new Error('CDE::keySolicitationFulfilled - unknown stream type')
        }
    }

    private clearKeyRequest(streamId: string, error?: Error): void {
        console.log('CDE:clearKeyRequest', { streamId, error })
        const streamRecord = this.roomRecords[streamId]
        if (!streamRecord || !streamRecord.requests?.[streamId]) {
            return
        }
        if (this.throttledStartLookingForKeys) {
            this.throttledStartLookingForKeys()
        }
    }
}

class ProcessingQueue<TItem> {
    private running = true
    private processFn: (item: TItem) => Promise<void>
    private delayMs: number
    private queue: TItem[] = []
    private processing = false
    private timeout: NodeJS.Timeout | undefined

    constructor(params: { process: (item: TItem) => Promise<void>; delayMs: number }) {
        this.processFn = params.process
        this.delayMs = params.delayMs
    }

    public enqueue(item: TItem) {
        if (this.running) {
            this.queue.push(item)
            this.process()
        } else {
            console.warn('ProcessingQueue::enqueue called when not running')
        }
    }

    public stop() {
        if (this.timeout) {
            clearTimeout(this.timeout)
        }
        if (this.queue.length > 0) {
            console.warn('ProcessingQueue::stop called with items still queued', this.queue.length)
        }
        this.queue = []
        this.running = false
    }

    private process() {
        if (this.processing || !this.running) {
            return
        }
        const item = this.queue.shift()
        if (item) {
            this.processing = true
            this.processFn(item)
                .catch((e) => {
                    console.error('ProcessingQueue::process error processing item', e)
                })
                .finally(() => {
                    this.processing = false
                    this.timeout = setTimeout(() => {
                        this.timeout = undefined
                        this.process()
                    }, this.delayMs)
                })
        }
    }
}
function getOrThrow<T>(x: T | undefined | null, message: string): T {
    if (x === undefined || x === null) {
        throw new Error(message)
    }
    return x
}
