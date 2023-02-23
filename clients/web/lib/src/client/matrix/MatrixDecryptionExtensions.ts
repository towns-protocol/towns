import { Permission } from '../web3/ContractTypes'
import {
    MatrixClient,
    EventType as MatrixEventType,
    MatrixEventEvent,
    RoomEvent,
    MatrixEvent,
    UserEvent,
    User as MatrixUser,
    ClientEvent,
    EventType,
} from 'matrix-js-sdk'
import {
    CryptoEvent,
    IMegolmSessionData,
    IncomingRoomKeyRequest,
    IRoomKeyRequestBody,
} from 'matrix-js-sdk/lib/crypto'
import uniq from 'lodash/uniq'
import { createUserIdFromString } from '../../types/user-identifier'
import { TypedEventEmitter } from 'matrix-js-sdk/lib/models/typed-event-emitter'
import throttle from 'lodash/throttle'

/**
 * If I have messages that I can't decrypt (which happens all the time in normal use cases,
 * not to mention signing in on a new device or clearing your browser cache), I will iterate
 * through the online users and send a custom to-device message requesting keys for the room.
 * When a user receives a request for conversation keys, if the requesting user passes the
 * "isEntitled" check for the space and channel, they will use the sendSharedHistoryKeys
 * functionality built for sharing keys on invite to send keys to the requestee.
 * Megolm knows about sharing on invite, and it refuses to accept keys that weren't requested unless
 * they are sent to you by the person who invited you to the space, so I create a fake key request
 * (that matches up with my actual request) to trick Megolm into accepting the keys.
 */

/// control the number of outgoing room key requests for events that failed to decrypt
const MAX_CONCURRENT_ROOM_KEY_REQUESTS = 2
/// how long to wait for a response to a room key request
const KEY_REQUEST_TIMEOUT_MS = 2000
/// how many events to include in the same to-device message
const MAX_EVENTS_PER_REQUEST = 64

const DECRYPTION_OPTIONS = {
    isRetry: true,
    emit: true,
    forceRedecryptIfUntrusted: true,
}

export interface MatrixDecryptionExtensionDelegate {
    isEntitled(
        spaceId: string,
        channelId: string | undefined,
        user: string,
        permission: Permission,
    ): Promise<boolean>
}

/// copy from node_modules/matrix-js-sdk/src/crypto/algorithms/megolm.ts
interface IMessage {
    type: string
    content: {
        algorithm: string
        room_id: string
        sender_key?: string
        sender_claimed_ed25519_key?: string
        session_id: string
        session_key: string
        chain_index: number
        forwarding_curve25519_key_chain?: string[]
        'org.matrix.msc3061.shared_history': boolean
    }
}

enum TownsToDeviceMessageType {
    ExtendedKeyRequest = 'm.towns.key_request',
    ExtendedKeyResponse = 'm.towns.key_response',
}

interface KeyResponseBase {
    roomId: string
}

interface KeyResponse_RoomNotFound extends KeyResponseBase {
    kind: 'room_not_found'
}

interface KeyResponse_KeysNotFound extends KeyResponseBase {
    kind: 'keys_not_found'
}

interface KeyResponse_KeysFound extends KeyResponseBase {
    kind: 'keys_found'
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

interface KeyRequestPayload {
    spaceId: string
    channelId?: string
    events: { eventId: string; algorithm: string; session_id: string; sender_key: string }[]
}

interface RoomRecord {
    decryptionFailures: MatrixEvent[]
    timer?: NodeJS.Timeout
    lastRequestAt?: number
    requestingFrom?: string
    requests?: Record<string, KeyRequestRecord>
}

type MatrixDecryptionExtensionEvents = ClientEvent.ToDeviceEvent

type MatrixDecryptionExtensionEventHandlerMap = {
    [ClientEvent.ToDeviceEvent]: (event: MatrixEvent) => void
}

export class MatrixDecryptionExtension extends TypedEventEmitter<
    MatrixDecryptionExtensionEvents,
    MatrixDecryptionExtensionEventHandlerMap
> {
    roomRecords: Record<string, RoomRecord> = {}
    priorityRoomId?: string
    private matrixClient: MatrixClient
    private receivedToDeviceEventsQueue: ProcessingQueue<MatrixEvent>
    private receivedToDeviceProcessersMap: Record<
        string,
        (event: MatrixEvent, senderId: string) => Promise<void>
    >
    private throttledStartLookingForKeys: () => void
    private delgate: MatrixDecryptionExtensionDelegate
    private clientRunning = true

    constructor(matrixClient: MatrixClient, delegate: MatrixDecryptionExtensionDelegate) {
        super()
        this.matrixClient = matrixClient
        this.delgate = delegate
        // mapping of event type to processors
        this.receivedToDeviceProcessersMap = {
            [TownsToDeviceMessageType.ExtendedKeyRequest]: (e, s) => {
                return this.processToDeviceKeyRequest(e, s)
            },
            [TownsToDeviceMessageType.ExtendedKeyResponse]: (e, s) => {
                return this.processToDeviceKeyResponse(e, s)
            },
            [MatrixEventType.ForwardedRoomKey]: (e, s) => {
                return this.processToDeviceForwardedRoomKey(e, s)
            },
        }
        // queue for processing to-device events
        this.receivedToDeviceEventsQueue = new ProcessingQueue<MatrixEvent>({
            shouldStop: () => !this.clientRunning,
            process: (event) => {
                return this.processToDeviceEvent(event)
            },
            delayMs: 10,
        })

        this.throttledStartLookingForKeys = throttle(
            () => {
                this.startLookingForKeys()
            },
            150,
            {
                trailing: true,
            },
        )

        if (!matrixClient.crypto) {
            throw new Error('MDE::constructor - crypto not enabled')
        }

        // listen for encrypted events
        matrixClient.on(RoomEvent.Timeline, (event) => {
            if (event.getType() === MatrixEventType.RoomMessageEncrypted) {
                if (event.shouldAttemptDecryption()) {
                    // not sure why matrix isn't always doing this for us, but sometimes it gets skipped
                    // it's okay to call multiple times, the underlying logic returns an existing promise
                    // if one exists
                    // we don't need to do anything with the result, a decrypted event gets fired
                    // and it makes sense to just pick the event up there
                    void this.matrixClient.decryptEventIfNeeded(event, DECRYPTION_OPTIONS)
                }
            }
        })

        // listen for unable to decrypt events
        matrixClient.on(MatrixEventEvent.Decrypted, (event, err) => {
            if (event.isDecryptionFailure()) {
                const roomId = event.getRoomId()
                if (!roomId) {
                    console.log("MDE::onDecryptionFailure - event doesn't have a roomId", {
                        eventId: event.getId(),
                        err: err,
                    })
                    return
                }
                if (!this.roomRecords[roomId]) {
                    this.roomRecords[roomId] = { decryptionFailures: [] }
                }
                const roomRecord = this.roomRecords[roomId]
                if (roomRecord.decryptionFailures.indexOf(event) === -1) {
                    roomRecord.decryptionFailures.push(event)
                }
                this.throttledStartLookingForKeys()
            }
        })

        // listen for "currently_active" members (in go `time.Since(p.LastActiveTS.Time()).Minutes() < 5`)
        matrixClient.on(
            UserEvent.CurrentlyActive,
            (event: MatrixEvent | undefined, user: MatrixUser) => {
                if (user.currentlyActive) {
                    this.throttledStartLookingForKeys()
                }
            },
        )
        // listen for "online" members (in go `p.Presence == "online"`)
        matrixClient.on(UserEvent.Presence, (event: MatrixEvent | undefined, user: MatrixUser) => {
            console.log('MDE::onPresence', { user: user.presence })
            if (user.presence === 'online') {
                this.throttledStartLookingForKeys()
            }
        })

        // listen for new devices
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        matrixClient.on(CryptoEvent.DevicesUpdated, (users: string[], initialFetch: boolean) => {
            this.throttledStartLookingForKeys()
        })

        // listen for extended key requests
        matrixClient.on(ClientEvent.ToDeviceEvent, (event: MatrixEvent) => {
            this.matrixClient
                .decryptEventIfNeeded(event)
                .then(() => {
                    if (Object.keys(this.receivedToDeviceProcessersMap).includes(event.getType())) {
                        this.receivedToDeviceEventsQueue.enqueue(event)
                    }
                })
                .catch((err: Error) => {
                    console.log('MDE::onToDeviceEvent - error trying to decrypt', { err })
                })
        })
    }

    public stop(): void {
        this.clientRunning = false
    }

    private currentlyRequestingCount(): number {
        return Object.values(this.roomRecords).filter(
            (roomRecord) => roomRecord.requestingFrom !== undefined,
        ).length
    }

    private async hasKeysForEventWith(
        roomId: string,
        eventContent: { algorithm: string; sender_key: string; session_id: string },
    ): Promise<boolean> {
        // we don't have direct api access to the crypto store,
        // i could probably tease out how to do it, but it's easier for now
        // to fake a request and see if we have the keys to match the api
        const decryptor = this.matrixClient.crypto?.getRoomDecryptor(roomId, eventContent.algorithm)
        const eventBody: IRoomKeyRequestBody = {
            algorithm: eventContent.algorithm,
            room_id: roomId,
            sender_key: eventContent.sender_key,
            session_id: eventContent.session_id,
        }
        const matrixEvent = new MatrixEvent({ content: { body: eventBody } })
        const request = new IncomingRoomKeyRequest(matrixEvent)
        const hasKeys = await decryptor?.hasKeysForKeyRequest(request)
        return hasKeys === true
    }

    private startLookingForKeys(): void {
        if (!this.clientRunning) {
            console.log('MDE::startLookingForKeys - clientRunning is false')
            return
        }

        // filter out any successful decryption events
        Object.entries(this.roomRecords).forEach(([roomId, roomRecord]) => {
            const failingCount = roomRecord.decryptionFailures.length
            const stillFailing = roomRecord.decryptionFailures.filter((e) =>
                e.isDecryptionFailure(),
            )
            if (failingCount !== stillFailing.length) {
                console.log('MDE::startLookingForKeys - successfully decrypted events', {
                    roomId: roomId,
                    prevFailingCount: failingCount,
                    newFailingCount: stillFailing.length,
                })
                roomRecord.decryptionFailures = stillFailing
            }
        })

        // filter out in progress or empty entries, sort by priority
        const rooms = Object.entries(this.roomRecords)
            // add roomId to roomRecord
            .map(([roomId, roomRecord]) => {
                return { ...roomRecord, roomId }
            })
            // filter out rooms that are waiting for something
            .filter((roomRecord) => roomRecord.timer === undefined)
            // filter out rooms that have no events to look for keys for
            .filter((roomRecord) => roomRecord.decryptionFailures.length > 0)
            // sort by priority
            .sort((a, b) => {
                if (a.roomId === this.priorityRoomId) {
                    return -1
                }
                if (b.roomId === this.priorityRoomId) {
                    return 1
                }
                return (a.lastRequestAt ?? 0) - (b.lastRequestAt ?? 0)
            })

        console.log(
            `MDE::startLookingForKeys, found ${rooms.length} unstarted rooms with decryption failures`,
        )

        for (const room of rooms) {
            if (this.currentlyRequestingCount() >= MAX_CONCURRENT_ROOM_KEY_REQUESTS) {
                console.log('MDE::startLookingForKeys - max concurrent requests')
                break
            }
            this._startLookingForKeys(room.roomId)
        }
    }

    private _startLookingForKeys(roomId: string): void {
        const roomRecord = this.roomRecords[roomId]
        if (!roomRecord) {
            throw new Error('MDE::_startLookingForKeys - room record not found')
        }
        const room = this.matrixClient.getRoom(roomId)
        if (!room) {
            throw new Error('MDE::_startLookingForKeys - matrix room not found')
        }

        if (!roomRecord.decryptionFailures.length) {
            console.log(`MDE::_startLookingForKeys - no decryption failures for ${roomId}`)
            return
        }

        const myDevices = this.matrixClient.getStoredDevicesForUser(
            this.matrixClient.getUserId() ?? '',
        )

        const onlineMemberIds = room
            .getJoinedMembers()
            .filter(
                (member) =>
                    // filter out ourselves unless we have more than one device online
                    ((member.userId !== this.matrixClient.getUserId() || myDevices.length >= 2) &&
                        // find currently active OR 'online' members
                        // seems like there's bugs in the dendrite presence clearing logic
                        // we'll get lastActiveTS updates that are over 2 hours old but the user is still online
                        member.user?.currentlyActive === true) ||
                    member.user?.presence === 'online',
            )
            .map((member) => member.userId)

        console.log('MDE::_startLookingForKeys', {
            roomId: roomId,
            myId: this.matrixClient.getUserId(),
            myDevices: myDevices.map((e) => e.deviceId),
            onlineMemberIds,
        })

        if (!onlineMemberIds.length) {
            console.log('MDE::_startLookingForKeys - no online members')
            return
        }

        const now = Date.now()
        const eligableMemberIds = onlineMemberIds.filter(
            (memberId) =>
                // find someone we haven't sent a request to in a while
                now - (roomRecord.requests?.[memberId]?.timestamp ?? 0) > 1000 * 60 * 5,
        )

        if (!eligableMemberIds.length) {
            const userWithNewDevices = onlineMemberIds.find((memberId) => {
                const seenDeviceIds = roomRecord.requests?.[memberId]?.toDeviceIds ?? []
                const currentDeviceIds = this.matrixClient
                    .getStoredDevicesForUser(memberId)
                    .map((d) => d.deviceId)
                return currentDeviceIds.some((deviceId) => !seenDeviceIds.includes(deviceId))
            })
            if (userWithNewDevices) {
                console.log('MDE::_startLookingForKeys - found user with new devices online')
                eligableMemberIds.push(userWithNewDevices)
            } else {
                console.log('MDE::_startLookingForKeys - no eligable members')
                return
            }
        }

        const decryptionFailureEvents = roomRecord.decryptionFailures.map((event) => {
            const wireContent = event.getWireContent()
            return {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                eventId: event.getId()!,
                algorithm: wireContent.algorithm as string,
                session_id: wireContent.session_id as string,
                sender_key: wireContent.sender_key as string,
            }
        })

        const decryptionFailureSenders = new Set(
            roomRecord.decryptionFailures.map((event) => event.getSender()),
        )

        const requesteeId = eligableMemberIds
            .sort((a, b) => {
                if (decryptionFailureSenders.has(a)) {
                    return -1
                }
                if (decryptionFailureSenders.has(b)) {
                    return 1
                }
                return 0
            })
            .find((memberId) => this.matrixClient.getStoredDevicesForUser(memberId)?.length)

        if (!requesteeId) {
            console.log('MDE::_startLookingForKeys - no eligable members with devices')
            return
        }

        console.log(
            `MDE::_startLookingForKeys found ${eligableMemberIds.length} eligable members, sending key request to ${requesteeId}`,
        )

        const devices = this.matrixClient.getStoredDevicesForUser(requesteeId)

        if (!devices.length) {
            throw new Error('logic error, we filtered for devices but none found')
        }

        const seenDeviceIds = roomRecord.requests?.[requesteeId]?.toDeviceIds ?? []

        const requestRecord: KeyRequestRecord = {
            timestamp: now,
            toDeviceIds: uniq([...seenDeviceIds, ...devices.map((d) => d.deviceId)]),
        }

        const spaceId = room.isSpaceRoom()
            ? roomId
            : room.currentState.getStateEvents(EventType.SpaceParent).at(0)?.getStateKey()

        if (!spaceId) {
            console.error('MDE::_startLookingForKeys - no spaceId found')
            return
        }

        const request: KeyRequestPayload = {
            events: decryptionFailureEvents.slice(0, MAX_EVENTS_PER_REQUEST),
            spaceId,
            channelId: spaceId === roomId ? undefined : roomId,
        }

        roomRecord.lastRequestAt = now
        roomRecord.requestingFrom = requesteeId
        roomRecord.requests = {
            ...(roomRecord.requests ?? {}),
            [requesteeId]: requestRecord,
        }
        roomRecord.timer = setTimeout(() => {
            this.clearKeyRequest(roomId, requesteeId)
        }, KEY_REQUEST_TIMEOUT_MS)

        const devicesInfo = devices.map((d) => ({ userId: requesteeId, deviceInfo: d }))

        console.log('MDE::_startLookingForKeys - sending request', {
            to: requesteeId,
            from: this.matrixClient.getUserId(),
        })
        this.matrixClient
            .encryptAndSendToDevices(devicesInfo, {
                type: TownsToDeviceMessageType.ExtendedKeyRequest,
                content: request,
            })
            .catch((e: Error) => {
                console.error('MDE::_startLookingForKeys - error sending request', e)
                this.clearKeyRequest(roomId, requesteeId, e)
            })
    }

    private clearKeyRequest(roomId: string, requesteeId: string, error?: Error): void {
        console.log('MDE::clearKeyRequest', { roomId, requesteeId, error })
        const roomRecord = this.roomRecords[roomId]
        if (!roomRecord) {
            console.error('MDE::clearKeyRequest - room record not found')
            return
        }
        if (!roomRecord.requests?.[requesteeId]) {
            console.error('MDE::clearKeyRequest - no record for requestee')
            return
        }
        roomRecord.requests[requesteeId].error = error
        if (roomRecord.requestingFrom === requesteeId) {
            clearTimeout(roomRecord.timer)
            roomRecord.timer = undefined
            roomRecord.requestingFrom = undefined
        } else {
            // ignore, probably timed out from a previous request
            console.log('MDE::clearKeyRequest - ignoring clear request', {
                roomId,
                requesteeId,
            })
        }
        setTimeout(() => this.startLookingForKeys())
    }

    private async processToDeviceEvent(event: MatrixEvent): Promise<void> {
        // get the sender (should never be undefined)
        const senderId = event.getSender()
        if (!senderId) {
            console.error('MDE::processToDeviceEvent - no senderId', {
                id: event.getId(),
            })
            return
        }
        // make sure this event is encrypted
        if (!event.isEncrypted()) {
            console.error('MDE::processToDeviceEvent - event not encrypted', {
                id: event.getId(),
                senderId,
            })
            return
        }
        // double check the key source (aellis full disclosure, not sure if this is needed)
        if (event.isKeySourceUntrusted()) {
            console.error('got key sharing request from untrusted source', {
                content: event.getContent(),
                wireContent: event.getWireContent(),
                from: senderId,
            })
            return
        }

        const processor = this.receivedToDeviceProcessersMap[event.getType()]
        if (!processor) {
            throw new Error(
                `MDE::processToDeviceEvent - no processor for event type ${event.getType()}`,
            )
        }
        await processor(event, senderId)
    }

    private async processToDeviceKeyResponse(event: MatrixEvent, senderId: string) {
        const response = event.getContent<KeyResponsePayload>()
        const { roomId } = response
        const roomRecord = this.roomRecords[roomId]
        if (!roomRecord) {
            console.warn('MDE::processToDeviceKeyResponse - room record not found')
            return
        }
        if (!roomRecord.requests?.[senderId]) {
            console.warn('MDE::processToDeviceKeyResponse - no request found for sender', {
                senderId,
                content: event.getContent(),
            })
            return
        }
        console.log('MDE::processToDeviceKeyResponse', { response })
        roomRecord.requests[senderId].response = response
        // wait for any pending decryption
        await Promise.all([roomRecord.decryptionFailures.map((e) => e.getDecryptionPromise())])
        // clear any request to this user and start looking for keys again
        this.clearKeyRequest(roomId, senderId)
    }

    private async processToDeviceKeyRequest(event: MatrixEvent, fromUserId: string) {
        const content = event.getContent<KeyRequestPayload>()
        const { spaceId, channelId, events } = content
        const roomId = channelId ?? spaceId
        if (!roomId || !events) {
            console.error(
                'MDE::processToDeviceKeyRequest got key sharing request with missing fields',
                {
                    roomId,
                    from: fromUserId,
                },
            )
            return
        }

        console.log('MDE::processToDeviceKeyRequest', {
            spaceId,
            channelId,
            roomId,
            fromUserId,
        })

        const userIdentifier = createUserIdFromString(fromUserId)

        if (!userIdentifier?.accountAddress) {
            console.warn(
                'MDE::processToDeviceKeyRequest got key sharing request from user without account address',
                {
                    spaceId,
                    channelId,
                    roomId,
                    from: fromUserId,
                    userIdentifier,
                },
            )
            return
        }

        // check with the space contract to see if this user is entitled
        const isEntitled = await this.delgate.isEntitled(
            spaceId,
            channelId,
            userIdentifier?.accountAddress,
            Permission.Read,
        )

        if (!isEntitled) {
            console.warn(
                'MDE::processToDeviceKeyRequest got key sharing request from unentitled user',
                {
                    spaceId,
                    channelId,
                    roomId,
                    from: fromUserId,
                },
            )
            return
        }

        const respondWith = async (response: KeyResponsePayload) => {
            const devices = this.matrixClient.getStoredDevicesForUser(fromUserId)
            if (!devices.length) {
                console.error(
                    'MDE::processToDeviceKeyRequest got key sharing request from user with no devices',
                    { fromUserId },
                )
                return
            }
            const devicesInfo = devices.map((d) => ({ userId: fromUserId, deviceInfo: d }))

            await this.matrixClient.encryptAndSendToDevices(devicesInfo, {
                type: TownsToDeviceMessageType.ExtendedKeyResponse,
                content: response,
            })
        }

        const room = this.matrixClient.getRoom(roomId)

        if (!room) {
            console.warn(
                'MDE::processToDeviceKeyRequest got key sharing request for unknown room',
                {
                    roomId,
                    from: fromUserId,
                },
            )
            await respondWith({ kind: 'room_not_found', roomId })
            return
        }

        // look to see if we can be any good
        let hasLocalKeysForEvents: string | undefined = undefined
        for (const eventContent of events) {
            const hasKeys = await this.hasKeysForEventWith(roomId, eventContent)
            if (hasKeys) {
                hasLocalKeysForEvents = eventContent.session_id
                break
            }
        }

        if (!hasLocalKeysForEvents) {
            console.info(
                'MDE::processToDeviceKeyRequest got key sharing request for unknown events',
                {
                    roomId,
                    from: fromUserId,
                    eventIds: events.map((e) => e.eventId),
                },
            )
            await respondWith({ kind: 'keys_not_found', roomId })
            return
        }

        console.info('MDE::processToDeviceKeyRequest responding to key request', {
            fromUserId,
            foundSessionId: hasLocalKeysForEvents,
        })

        // prepare to encrypt for this room
        // not sure why this isn't an async call, or why we really need to
        // do this in the first place, but it seems to gather some devices
        // that we need to send the response to, especially when sending keys to yourself
        this.matrixClient.prepareToEncrypt(room)

        // aellis 02/2023 we could probably just package up the requested keys and send them
        // this is helpful for the case where the requesting user doesn't have any keys, which
        // is probably the most common case.
        await this.matrixClient.sendSharedHistoryKeys(roomId, [fromUserId])

        await respondWith({ kind: 'keys_found', roomId })
    }

    private async processToDeviceForwardedRoomKey(event: MatrixEvent, senderId: string) {
        if (!event.isEncrypted()) {
            console.warn('MDE::processToDeviceForwardedRoomKey - not encrypted')
            return
        }

        const content = event.getContent<Partial<IMessage['content']>>()
        if (
            !content.room_id ||
            !content.session_key ||
            !content.session_id ||
            !content.algorithm ||
            !content.sender_key
        ) {
            console.error('MDE::processToDeviceForwardedRoomKey key event is missing fields')
            return
        }

        const senderKey = event.getSenderKey()
        const sessionId = content.session_id
        console.log('MDE::processToDeviceForwardedRoomKey', { sessionId, senderId })
        if (!senderKey) {
            console.error('MDE::processToDeviceForwardedRoomKey - no sender key')
            return
        }

        const events = this.roomRecords[content.room_id]?.decryptionFailures.filter(
            (e) => e.getWireContent().session_id === content.session_id && e.isDecryptionFailure(),
        )

        // does this key match one of my decryption failures?
        if (!events.length) {
            // if not, and but we don't have the key locally,
            // check to see if it's from someone we poked, if so we process it anyway
            const hasKey = await this.hasKeysForEventWith(content.room_id, {
                algorithm: content.algorithm,
                session_id: content.session_id,
                sender_key: content.sender_key,
            })
            if (!hasKey && this.roomRecords[content.room_id]?.requests?.[senderId] !== undefined) {
                console.log(
                    "MDE::processToDeviceForwardedRoomKey Didn't explicitly request a key, but processing it anyway since we don't have it already",
                    { sessionId, senderId },
                )
            } else {
                console.log("MDE::processToDeviceForwardedRoomKey We don't need this key", {
                    sessionId,
                    senderId,
                })
                return
            }
        }

        // find the sender's device
        const deviceInfo = this.matrixClient.crypto?.deviceList.getDeviceByIdentityKey(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            content.algorithm,
            senderKey,
        )
        if (!deviceInfo) {
            // ignore to prevent randos from spamming us with keys
            console.error('MDE::processToDeviceForwardedRoomKey no device info ??')
            return
        }

        const keysClaimed: Record<string, string> = content.sender_claimed_ed25519_key
            ? {
                  ed25519: content.sender_claimed_ed25519_key,
              }
            : {}
        const room_key: IMegolmSessionData = {
            algorithm: content.algorithm,
            room_id: content.room_id,
            session_id: content.session_id,
            sender_key: content.sender_key,
            session_key: content.session_key,
            sender_claimed_keys: keysClaimed,
            forwarding_curve25519_key_chain: content.forwarding_curve25519_key_chain ?? [],
        }

        await this.matrixClient.crypto?.importRoomKeys([room_key])
    }
}

class ProcessingQueue<TItem> {
    private shouldStopFn: () => boolean
    private processFn: (item: TItem) => Promise<void>
    private delayMs: number
    private queue: TItem[] = []
    private processing = false

    constructor(params: {
        shouldStop: () => boolean
        process: (item: TItem) => Promise<void>
        delayMs: number
    }) {
        this.shouldStopFn = params.shouldStop
        this.processFn = params.process
        this.delayMs = params.delayMs
    }

    public enqueue(item: TItem) {
        this.queue.push(item)
        this.process()
    }

    private process() {
        if (this.processing) {
            return
        }
        if (this.shouldStopFn()) {
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
                    setTimeout(() => this.process(), this.delayMs)
                })
        }
    }
}
