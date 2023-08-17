import { Permission } from '../web3/ContractTypes'
import {
    Client as CasablancaClient,
    RiverEvent,
    ParsedEvent,
    DeviceInfo,
    make_ToDevice_KeyResponse,
    EncryptedEventStreamTypes,
    make_ToDevice_KeyRequest,
    IndexedDBCryptoStore,
} from '@river/sdk'
import { ToDeviceOp, KeyResponseKind, MegolmSession, ToDeviceMessage } from '@river/proto'
import { MEGOLM_ALGORITHM } from '@river/sdk'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { Room } from '../../types/zion-types'
import { RoomIdentifier } from '../../types/room-identifier'
import { SpaceProtocol } from '../ZionClientTypes'
import throttle from 'lodash/throttle'
// eslint-disable-next-line lodash/import-scope
import type { DebouncedFunc } from 'lodash'
import uniq from 'lodash/uniq'
import { PlainMessage } from '@bufbuild/protobuf'

/// control the number of outgoing room key requests for events that failed to decrypt
const MAX_CONCURRENT_ROOM_KEY_REQUESTS = 2
/// how long to wait for a response to a room key request
const KEY_REQUEST_TIMEOUT_MS = 3000
/// how many events to include in the same to-device message
const MAX_EVENTS_PER_REQUEST = 64
/// time betwen debounced calls to look for keys
const TIME_BETWEEN_LOOKING_FOR_KEYS_MS = 250
/// time before we bug a user again for keys
const TIME_BETWEEN_USER_KEY_REQUESTS_MS = 1000 * 60 * 5
/// time between processing to-device events
const DELAY_BETWEEN_PROCESSING_TO_DEVICE_EVENTS_MS = 10

type MegolmSessionData = PlainMessage<MegolmSession>
export interface DecryptionExtensionDelegate {
    isEntitled(
        spaceId: string,
        channelId: string | undefined,
        user: string,
        permission: Permission,
    ): Promise<boolean>
    getRoomData(roomId: RoomIdentifier): Room | undefined
}

interface KeyResponseBase {
    spaceId: string
    channelId?: string
}

interface KeyResponse_RoomNotFound extends KeyResponseBase {
    kind: KeyResponseKind.KRK_CHANNEL_NOT_FOUND
}

interface KeyResponse_KeysNotFound extends KeyResponseBase {
    kind: KeyResponseKind.KRK_KEYS_NOT_FOUND
}

interface KeyResponse_KeysFound extends KeyResponseBase {
    kind: KeyResponseKind.KRK_KEYS_FOUND
    sessions?: MegolmSessionData[]
}

type KeyResponsePayload =
    | KeyResponse_RoomNotFound
    | KeyResponse_KeysNotFound
    | KeyResponse_KeysFound

interface KeyRequestRecord {
    timestamp: number
    toDeviceIds: string[]
    error?: Error
    response?: KeyResponsePayload
}

interface RoomRecord {
    decryptionFailures: RiverEvent[]
    isEntitled?: boolean
    spaceId: string
    channelId?: string
    timer?: NodeJS.Timeout
    lastRequestAt?: number
    requestingFrom?: string
    requests?: Record<string, KeyRequestRecord>
}

enum DecryptionExtensionEvents {
    toDeviceMessage = 'toDeviceMessage',
}

type DecryptionExtensionEventHandlerMap = {
    [DecryptionExtensionEvents.toDeviceMessage]: (
        streamId: string,
        deviceId: string,
        op: ToDeviceOp,
        value: ParsedEvent,
    ) => void
}

export class RiverDecryptionExtension extends (EventEmitter as new () => TypedEmitter<DecryptionExtensionEventHandlerMap>) {
    roomRecords: Record<string, RoomRecord> = {}
    private client: CasablancaClient
    private delegate: DecryptionExtensionDelegate
    private userId: string
    private accountAddress: string
    private receivedToDeviceEventQueue: ProcessingQueue<RiverEvent>
    private receivedToDeviceProcessorMap: Record<
        string,
        (event: RiverEvent, senderId: string) => Promise<void>
    >
    private throttledStartLookingForKeys: DebouncedFunc<() => void> | null = null
    private clientRunning = true

    constructor(client: CasablancaClient, delegate: DecryptionExtensionDelegate) {
        super()
        this.client = client
        this.delegate = delegate
        this.userId = getOrThrow(this.client.userId, 'CDE::constructor - no userId')
        // todo: this will likely change soon as userId will not always be 1-1 with
        // account address
        this.accountAddress = this.userId

        // mapping of event type to processors
        this.receivedToDeviceProcessorMap = {
            [ToDeviceOp[ToDeviceOp.TDO_KEY_REQUEST]]: (e, s) => {
                return this.onKeyRequest(e, s)
            },
            [ToDeviceOp[ToDeviceOp.TDO_KEY_RESPONSE]]: (e, s) => {
                return this.onKeyResponse(e, s)
            },
        }

        this.receivedToDeviceEventQueue = new ProcessingQueue<RiverEvent>({
            process: (event) => {
                return this.processToDeviceEvent(event)
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

        // listen for key requests
        client.on('toDeviceMessage', this.onToDeviceEvent)

        // listen for channel message events

        // todo: listen for timeline events instead
        client.on('channelNewMessage', this.onChannelEvent)

        // todo: listen for device update events

        // listen for decryption events
        client.on('eventDecrypted', this.onDecryptedEvent)
    }

    public stop(): void {
        this.throttledStartLookingForKeys?.cancel()
        this.throttledStartLookingForKeys = null
        // stop listening for key requests
        this.client.off('toDeviceMessage', this.onToDeviceEvent)
        this.client.off('channelNewMessage', this.onChannelEvent)
        this.client.off('eventDecrypted', this.onDecryptedEvent)
        this.receivedToDeviceProcessorMap = {}
        this.receivedToDeviceEventQueue.stop()
    }

    private async processToDeviceEvent(event: RiverEvent): Promise<void> {
        if (event.getStreamType() !== EncryptedEventStreamTypes.ToDevice) {
            throw new Error(`CDE:processToDeviceEvent - wrong stream type`)
        }

        const content = event.getWireContentToDevice()
        const toDeviceOp = content.content.op
        if (!toDeviceOp) {
            throw new Error(
                'CDE::processToDeviceEvent - no op found - is this not a toDevice event?',
            )
        }
        const processor = this.receivedToDeviceProcessorMap[toDeviceOp]
        if (!processor) {
            throw new Error(
                `CDE::processToDeviceEvent - no processor found for event ${toDeviceOp}`,
            )
        }
        if (!event.event.sender) {
            throw new Error('CDE::processToDeviceEvent - no sender found')
        }

        await processor(event, event.event.sender)
    }

    private onDecryptedEvent = (riverEvent: object, err: Error | undefined) => {
        // note: this cast while not ideal is to get around recursive reference compiler error,
        // see: HNT-1885
        const event = riverEvent as RiverEvent
        if (!event.isDecryptionFailure()) {
            const streamId = event.getStreamId()
            if (!streamId) {
                throw new Error('CDE::onDecryptionSuccess- no streamId found')
            }
            this.client.updateDecryptedStream(streamId, event)
            return
        }
        const channelId = event.getChannelId()
        const spaceId = event.getSpaceId()
        if (!channelId || !spaceId) {
            console.log(
                'CDE::onDecryptionFailure - missing channelId, not going to start looking for keys',
                {
                    eventId: event.getId() ?? '',
                    err: err,
                },
            )
            return
        }
        if (!this.roomRecords[channelId]) {
            this.roomRecords[channelId] = {
                decryptionFailures: [],
                channelId,
                spaceId,
            }
        }
        const roomRecord = this.roomRecords[channelId]
        if (roomRecord.decryptionFailures.indexOf(event) === -1) {
            roomRecord.decryptionFailures.push(event)
        }
        if (this.throttledStartLookingForKeys) {
            this.throttledStartLookingForKeys()
        }
    }

    private onChannelEvent = (_streamId: string, event: RiverEvent) => {
        ;(async () => {
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

    private onToDeviceEvent = (_streamId: string, event: RiverEvent) => {
        ;(async () => {
            const op = event.getWireContentToDevice().content.op
            if (!op) {
                throw new Error('CDE::onToDeviceEvent - no event type found')
            }
            try {
                await this.client.decryptEventIfNeeded(event)
            } catch (e) {
                console.error('error decrypting to-device event', e)
            }
            if (Object.keys(this.receivedToDeviceProcessorMap).includes(op)) {
                this.receivedToDeviceEventQueue.enqueue(event)
            }
        })().catch((e) => {
            console.error('CDE::onToDeviceEvent - error decrypting event', e)
        })
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
            // add channelId to channelRecord
            .map(([channelId, channelRecord]) => {
                return { ...channelRecord, channelId }
            })
            // filter out rooms that we're not entitled to
            .filter((roomRecord) => roomRecord.isEntitled === true)
            // filter out rooms that are wait for something
            .filter((roomRecord) => roomRecord.timer === undefined)
            // filter out rooms that have no events to look for keys for
            .filter((roomRecord) => roomRecord.decryptionFailures.length > 0)
            // sort by priority
            .sort((a, b) => {
                return (a.lastRequestAt ?? 0) - (b.lastRequestAt ?? 0)
            })

        console.log(
            `CDE::startLookingForKeys, found ${rooms.length} unstarted rooms with decryption failures`,
        )

        for (const room of rooms) {
            if (this.currentlyRequestingCount() >= MAX_CONCURRENT_ROOM_KEY_REQUESTS) {
                console.log('CDE::startLookingForKeys - max concurrent requests')
                break
            }
            await this._startLookingForKeys(room.channelId)
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
                if (spaceId) {
                    roomRecord.isEntitled = await this.delegate.isEntitled(
                        spaceId,
                        roomId,
                        this.accountAddress,
                        Permission.Read,
                    )
                }
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

    private async _startLookingForKeys(channelId: string) {
        const roomRecord = this.roomRecords[channelId]
        if (!roomRecord) {
            throw new Error('CDE::_startLookingForKeys - room record not found')
        }
        let room: Room | undefined = undefined
        try {
            room = this.delegate.getRoomData({
                protocol: SpaceProtocol.Casablanca,
                slug: '',
                networkId: channelId,
            })
        } catch (e) {
            // even though we are stopping looking for keys when the client shuts down,
            // occasionally, this function debouncer will execute a last time hence
            // this short-circuit check.
            if ((<Error>e).message.includes('client is undefined')) {
                console.error('CDE::_startLookingForKeys - error getting room', e)
                return
            }
            // if it's something else, re-throw the exception.
            throw new Error(`${(<Error>e).message}}`)
        }
        if (!room) {
            throw new Error('CDE::_startLookingForKeys - room not found')
        }

        if (!roomRecord.decryptionFailures.length) {
            console.log(`CDE::_startLookingForKeys - no decryption failures for`, { channelId })
            return
        }

        const myDevices = await this.client.getStoredDevicesForUser(this.userId ?? '')

        // todo: ideally we should be filtering for online members with devices here
        // but we can assume current members have devices.
        const roomMembers = room.members
            .filter(
                (member) =>
                    // filter out ourselves unless we have more than one device onlien
                    member.userId !== this.userId || myDevices.size > 1,
            )
            .map((member) => member.userId)
        if (!roomMembers.length) {
            console.log(`CDE::_startLookingForKeys - no room members found`, { channelId })
            return
        }
        const now = Date.now()
        const eligibleMemberIds = roomMembers.filter(
            (memberId) =>
                // find someone we haven't sent a request to in a while
                now - (roomRecord.requests?.[memberId]?.timestamp ?? 0) >
                TIME_BETWEEN_USER_KEY_REQUESTS_MS,
        )

        if (!eligibleMemberIds.length) {
            const userWithNewDevices = roomMembers.find(async (memberId) => {
                const seenDeviceIds = roomRecord.requests?.[memberId]?.toDeviceIds ?? []
                const currentDeviceIdMap = await this.client.getStoredDevicesForUser(memberId)
                const currentDeviceIds: string[] = []
                for (const innerMap of currentDeviceIdMap.values()) {
                    for (const deviceInfo of innerMap.values()) {
                        currentDeviceIds.push(deviceInfo.deviceId)
                    }
                }
                return currentDeviceIds.some((deviceId) => !seenDeviceIds.includes(deviceId))
            })
            if (userWithNewDevices) {
                console.log('CDE::_startLookingForKeys - found user with new devices online', {
                    channelId,
                    userWithNewDevices,
                })
                eligibleMemberIds.push(userWithNewDevices)
            } else {
                console.log('CDE::_startLookingForKeys - no eligible members')
                return
            }
        }

        const unknownSessionIds: [senderKey: string, sessionId: string][] =
            roomRecord.decryptionFailures.map((event) => {
                // note: we're obtaining narrowest concrete type here with assumption
                // were looking for session_ids for megolm
                // decryption failures, which for now are limited to Channel messages
                const wireContent = event.getWireContentChannel()
                return [wireContent.content.sender_key ?? '', wireContent.content.session_id ?? '']
            })

        const decryptionFailureSenders = new Set(
            roomRecord.decryptionFailures.map((event) => event.getSender()),
        )

        // sort eligaile members to prioritize senders of decryption failures
        const requesteeId = eligibleMemberIds
            .sort((a, b) => {
                if (decryptionFailureSenders.has(a)) {
                    return -1
                }
                if (decryptionFailureSenders.has(b)) {
                    return 1
                }
                return 0
            })
            .find(async (memberId) => (await this.client.getStoredDevicesForUser(memberId))?.size)

        if (!requesteeId) {
            console.log('CDE::_startLookingForKeys - no eligible members with devices', {
                channelId,
            })
            return
        }

        console.log(
            `CDE::_startLookingForKeys found ${eligibleMemberIds.length} eligible members, sending key request`,
            {
                to: requesteeId,
                from: this.userId,
                channelId,
            },
        )

        // Get the users devices,
        // todo: we should figure out which devices are online
        const devicesMap = await this.client.getStoredDevicesForUser(requesteeId)
        if (!devicesMap.size) {
            throw new Error('error, we filtered for devices but none found')
        }
        const devices: DeviceInfo[] = []
        for (const innerMap of devicesMap.values()) {
            for (const deviceInfo of innerMap.values()) {
                devices.push(deviceInfo)
            }
        }

        const seenDeviceIds = roomRecord.requests?.[requesteeId]?.toDeviceIds ?? []

        const requestRecord: KeyRequestRecord = {
            timestamp: now,
            toDeviceIds: uniq([...seenDeviceIds, ...devices.map((d) => d.deviceId)]),
        }

        const spaceId = roomRecord.spaceId

        if (!spaceId) {
            console.error('CDE::_startLookingForKeys - no spaceId found', { channelId })
            return
        }

        // todo: implement getSharedHistoryInboundGroupSessions for Megolm algorithm
        const allSharedHistorySessions: [senderKey: string, sessionId: string][] | undefined =
            await this.client.cryptoBackend?.olmDevice?.getSharedHistoryInboundGroupSessions(
                channelId,
            )

        const knownSessions =
            allSharedHistorySessions?.map(([_senderKey, sessionId]) => sessionId) ?? []

        // if the number of known sessions is small, pass them in the request so clients can
        // send everything but those sessions in the response, otherwise, just pass the unknown
        /*
        const request: KeyRequestPayload = {
            knownSessionIds:
                knownSessions.length < MAX_EVENTS_PER_REQUEST ? knownSessions : undefined,
            requestedSessions: unknownSessionIds.slice(0, MAX_EVENTS_PER_REQUEST),
            spaceId,
            channelId: spaceId === channelId ? undefined : channelId,
        }
        */
        const request = make_ToDevice_KeyRequest({
            spaceId,
            channelId: spaceId === channelId ? spaceId : channelId,
            algorithm: MEGOLM_ALGORITHM,
            senderKey: this.client.olmDevice.deviceCurve25519Key ?? '',
            // todo: perhaps we should associate sender_key of desired session_id in payload for verification
            sessionId: unknownSessionIds.slice(0, MAX_EVENTS_PER_REQUEST)[0][1],
            content:
                knownSessions.length < MAX_EVENTS_PER_REQUEST
                    ? JSON.stringify(knownSessions)
                    : undefined,
            knownSessionIds:
                knownSessions.length < MAX_EVENTS_PER_REQUEST ? knownSessions : undefined,
        })

        roomRecord.lastRequestAt = now
        roomRecord.requestingFrom = requesteeId
        roomRecord.requests = {
            ...(roomRecord.requests ?? {}),
            [requesteeId]: requestRecord,
        }
        roomRecord.timer = setTimeout(() => {
            console.log('CDE::_startLookingForKeys - key request timed out', {
                from: this.userId,
                to: requesteeId,
                channelId,
            })
            this.clearKeyRequest(channelId, requesteeId)
        }, KEY_REQUEST_TIMEOUT_MS)

        const devicesInfo = devices.map((d) => ({ userId: requesteeId, deviceInfo: d }))
        try {
            await this.client.encryptAndSendToDevices(
                devicesInfo,
                request,
                ToDeviceOp.TDO_KEY_REQUEST,
            )
            console.log('CDE::_startLookingForKeys - key request sent')
        } catch (e) {
            console.error('CDE::_startLookingForKeys - error sending request', e)
            this.clearKeyRequest(channelId, requesteeId, <Error>e)
        }
    }

    private async onKeyRequest(event: RiverEvent, fromUserId: string) {
        const clear_content = event.getClearToDeviceMessage_KeyRequest()
        if (!clear_content) {
            throw new Error(
                'CDE::onKeyRequest - no clear content found in event, did decryption fail?',
            )
        }

        // todo: allow for sending key requests for multiple sessionIds at once
        const { spaceId, channelId, senderKey, sessionId, knownSessionIds } = clear_content
        if (senderKey === this.client.olmDevice.deviceCurve25519Key) {
            // todo: in production we should ignore key requests from ourself
            console.log('CDE::onKeyRequest: request from self.')
        }
        const requestedSessions: [senderKey: string, sessionId: string][] = [[senderKey, sessionId]]
        console.log('CDE::onKeyRequest', { spaceId, channelId, fromUserId })
        // check with the space contract to see if this user is entitled
        // jterzis note: userId in Casablanca for now equals ethereum identitifying address
        const isEntitled = await this.delegate.isEntitled(
            spaceId,
            channelId,
            fromUserId,
            Permission.Read,
        )

        if (!isEntitled) {
            console.warn('CDE::onKeyRequest - key sharing request from unentitled user', {
                spaceId,
                channelId,
                from: fromUserId,
            })
            return
        }
        // todo: check channel stream to see if this request has already been processed
        // as evidenced by a receipt message
        if (!senderKey) {
            console.warn('CDE::onKeyRequest - got key sharing request with no sender key found')
            return
        }

        // download key for user to DeviceList
        await this.client.downloadKeys([fromUserId])

        const deviceInfo = this.client.deviceList?.getDeviceByIdentityKey(
            MEGOLM_ALGORITHM,
            senderKey,
        )

        if (!deviceInfo) {
            console.warn('CDE::onKeyRequest - got key sharing request with no device info found')
            return
        }

        const encryptAndRespondWith = async (
            response: PlainMessage<ToDeviceMessage>['payload'],
        ) => {
            const devicesInfo = [{ userId: fromUserId, deviceInfo }]
            return this.client.encryptAndSendToDevices(
                devicesInfo,
                response,
                ToDeviceOp.TDO_KEY_RESPONSE,
            )
        }

        const getUniqueUnknownSharedHistorySessions = async (channelId: string) => {
            if (knownSessionIds) {
                const allSharedHistorySessions =
                    await this.client.cryptoBackend?.olmDevice.getSharedHistoryInboundGroupSessions(
                        channelId,
                    )
                return (
                    allSharedHistorySessions?.filter(
                        ([_senderKey, sessionId]) => !knownSessionIds?.includes(sessionId),
                    ) ?? []
                )
            }
            return []
        }

        const sharedHistorySessions = await getUniqueUnknownSharedHistorySessions(channelId)

        console.log('CDE::onKeyRequest requested', {
            channelId,
            requestedSessions: requestedSessions?.length,
            knownSessionIds: knownSessionIds?.length,
            mySessions: sharedHistorySessions.length,
        })

        const uniqueRequestedSessions = (requestedSessions ?? []).filter(
            (x) => !sharedHistorySessions.some((y) => x[1] === y[1]),
        )

        const allRequestedSessions = sharedHistorySessions.concat(uniqueRequestedSessions)

        const exportedSessions: MegolmSessionData[] = []
        try {
            await this.client.cryptoBackend?.cryptoStore.doTxn(
                'readonly',
                [
                    IndexedDBCryptoStore.STORE_INBOUND_GROUP_SESSIONS,
                    IndexedDBCryptoStore.STORE_INBOUND_GROUP_SESSIONS_WITHHELD,
                ],
                (txn) => {
                    allRequestedSessions.forEach(([senderKey, sessionId]) => {
                        this.client.cryptoBackend?.cryptoStore.getEndToEndInboundGroupSession(
                            senderKey,
                            sessionId,
                            txn,
                            (sessionData, _groupSessionWitheld) => {
                                if (!sessionData || !this.client.cryptoBackend) {
                                    return
                                }
                                if (sessionData.channel_id === channelId) {
                                    const sess =
                                        this.client.cryptoBackend?.olmDevice.exportInboundGroupSession(
                                            senderKey,
                                            sessionId,
                                            sessionData,
                                        )
                                    delete sess.first_known_index
                                    sess.algorithm = MEGOLM_ALGORITHM
                                    exportedSessions.push({
                                        senderKey: sess.sender_key,
                                        sessionId: sess.session_id,
                                        channelId: sess.channel_id,
                                        sessionKey: sess.session_key,
                                        spaceId: 'not supported yet',
                                        algorithm: sess.algorithm,
                                    })
                                } else {
                                    console.error(
                                        'CDE::onKeyRequest got key sharing request for wrong room',
                                        { channelId, fromUserId, sessionId },
                                    )
                                }
                            },
                        )
                    })
                },
            )
        } catch (error) {
            console.error(error)
            return
        }

        console.info('CDE::onKeyRequest responding to key request', {
            fromUserId,
            toUserId: event.getSender(),
            channelId,
            knownSessionIds: knownSessionIds?.length,
            requestedSessions: requestedSessions?.length,
            numSessionsLookedUp: allRequestedSessions.length,
            exportedSessions: exportedSessions.length,
        })

        if (!exportedSessions.length) {
            console.info('CDE::onKeyRequest got key sharing request for unknown room')
            const response = make_ToDevice_KeyResponse({
                kind: KeyResponseKind.KRK_KEYS_NOT_FOUND,
                spaceId,
                channelId,
                sessions: [],
            })
            await encryptAndRespondWith(response)
            return
        }
        const response = make_ToDevice_KeyResponse({
            kind: KeyResponseKind.KRK_KEYS_FOUND,
            spaceId,
            channelId,
            sessions: exportedSessions,
        })
        await encryptAndRespondWith(response)
        // todo: send receipt to channel stream
    }

    private async onKeyResponse(event: RiverEvent, senderId: string) {
        const clear_content = event.getClearToDeviceMessage_KeyResponse()
        if (!clear_content) {
            throw new Error(
                'CDE::onKeyRespone - no parsed content found in event, did decryption fail?',
            )
        }

        switch (clear_content.kind) {
            case KeyResponseKind.KRK_CHANNEL_NOT_FOUND:
                break
            case KeyResponseKind.KRK_KEYS_NOT_FOUND:
                break
            case KeyResponseKind.KRK_KEYS_FOUND:
                {
                    const { spaceId, channelId, sessions: responseSessions } = clear_content
                    if (!channelId) {
                        console.warn('CDE::onKeyResponse - no channelId found', { spaceId })
                        return
                    }
                    const channelRecord = this.roomRecords[channelId]
                    if (!channelRecord) {
                        console.warn('CDE::onKeyResponse - room record not found', { channelId })
                        return
                    }
                    if (!channelRecord.requests?.[senderId]) {
                        console.warn('CDE::onKeyResponse - no request found for sender', {
                            senderId,
                            channelId,
                        })
                        return
                    }
                    channelRecord.requests[senderId].response = {
                        kind: clear_content.kind,
                        sessions: responseSessions,
                        spaceId,
                        channelId,
                    }
                    // great, the sender had keys for us
                    if (responseSessions) {
                        const sessions: MegolmSession[] = []
                        // loop over everything we got back
                        for (const content of responseSessions) {
                            // see if we still need the key as there's no point in importing it twice
                            const event = this.roomRecords[channelId]?.decryptionFailures.find(
                                (e) =>
                                    e.getWireContentChannel().content.session_id ===
                                    content.sessionId,
                            )

                            if (event) {
                                if (event.isDecryptionFailure()) {
                                    sessions.push(content)
                                }
                            } else {
                                // if we aren't tracking this event, check if we
                                // are missing keys for it
                                const hasKeys = await this.client.hasInboundSessionKeys(
                                    channelId,
                                    content.senderKey,
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
                            await this.client.importRoomKeys(sessions)
                        }
                    }
                    await Promise.all([
                        channelRecord.decryptionFailures.map((e) => e.getDecryptionPromise()),
                    ])

                    // clear any request to this user and start looking for keys again
                    console.log('CDE::onKeyResponse - complete', {
                        kind: clear_content.kind,
                        senderId,
                        channelId,
                    })
                    this.clearKeyRequest(channelId, senderId)
                }
                break
            default:
                console.log(
                    `CDE::onKeyResponse - unknown response kind', ${clear_content.toJsonString()}, ${senderId}`,
                )
        }
    }

    private clearKeyRequest(channelId: string, requesteeId: string, error?: Error): void {
        console.log('CDE:clearKeyRequest', { channelId, requesteeId, error })
        const channelRecord = this.roomRecords[channelId]
        if (!channelRecord) {
            console.error('CDE:clearKeyRequest - channel record not found', { channelId })
            return
        }
        if (!channelRecord.requests?.[requesteeId]) {
            console.error('CDE:clearKeyRequest - no record for requestee')
            return
        }
        if (channelRecord.requestingFrom == requesteeId) {
            clearTimeout(channelRecord.timer)
            channelRecord.timer = undefined
            channelRecord.requestingFrom = undefined
        } else {
            // ignore, probably timed out from a previous request
            console.log('CDE:clearKeyRequest - ignoring clear request', { channelId, requesteeId })
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
