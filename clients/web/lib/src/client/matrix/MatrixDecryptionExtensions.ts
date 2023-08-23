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
    IndexedDBCryptoStore,
    Room,
    IRoomTimelineData,
} from 'matrix-js-sdk'
import { CryptoEvent, IMegolmSessionData } from 'matrix-js-sdk/lib/crypto'
import uniq from 'lodash/uniq'
import { createUserIdFromString } from '../../types/user-identifier'
import { TypedEventEmitter } from 'matrix-js-sdk/lib/models/typed-event-emitter'
import throttle from 'lodash/throttle'
import { MEGOLM_ALGORITHM } from 'matrix-js-sdk/lib/crypto/olmlib'
// eslint-disable-next-line lodash/import-scope
import type { DebouncedFunc } from 'lodash'
import { Membership } from '../../types/zion-types'

/**
 * If I have messages that I can't decrypt (which happens all the time in normal use cases,
 * not to mention signing in on a new device or clearing your browser cache), I will iterate
 * through the online users and send a custom to device message requesting keys for the room.
 * When a user receives a request for conversation keys, if the requesting user passes the
 * "isEntitled" check for the space and channel, they will use the sharedHistoryKeys
 * functionality built for sharing keys on invite to gather all requested keys and send them in a batch
 * back to the user. When we receive the keys, we will import the keys, which will trigger an
 * attempt to decrypt the messages again.
 */

/// control the number of outgoing room key requests for events that failed to decrypt
const MAX_CONCURRENT_ROOM_KEY_REQUESTS = 2
/// how long to wait for a response to a room key request
const KEY_REQUEST_TIMEOUT_MS = 3000
/// how many events to include in the same to-device message
const MAX_EVENTS_PER_REQUEST = 64
/// time betwen debounced calls to look for keys
const TIME_BETWEEN_LOOKING_FOR_KEYS_MS = 500
/// time before we bug a user again for keys
const TIME_BETWEEN_USER_KEY_REQUESTS_MS = 1000 * 60 * 5
/// time between processing to-device events
const DELAY_BETWEEN_PROCESSING_TO_DEVICE_EVENTS_MS = 10

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
    sessions?: IMegolmSessionData[]
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
    requestedSessions?: [senderKey: string, sessionId: string][] // requester has option request unknown sessions
    knownSessionIds?: string[] // and/or get everything but known sessions
}

interface RoomRecord {
    decryptionFailures: MatrixEvent[]
    isEntitled?: boolean
    spaceId?: string
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
    private throttledStartLookingForKeys: DebouncedFunc<() => void>
    private delgate: MatrixDecryptionExtensionDelegate
    private clientRunning = true
    private hasUpToDateDeviceForUser = new Set<string>()
    private userId: string
    private accountAddress: string

    private onTimelineEvent = (
        event: MatrixEvent,
        _room: Room | undefined,
        _toStartOfTimeline: boolean | undefined,
        _removed: boolean,
        _data: IRoomTimelineData,
    ) => {
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
    }

    private onDecryptedEvent = (event: MatrixEvent, err: Error | undefined) => {
        if (event.isDecryptionFailure()) {
            const roomId = event.getRoomId()

            if (!roomId) {
                console.log("MDE::onDecryptionFailure - event doesn't have a roomId", {
                    eventId: event.getId(),
                    err: err,
                })
                return
            }

            // we can leave a space, but that doesn't mean we've left all the channels in the space.
            // so we can still get a bunch of (decrypted) events for channels we're not in.
            // matrix is probably doing work on these events already, before we handle them here, and we should solve that, probably by
            // 1. leave all the channels in the space as well as the space
            // 2. for spaces left before 1 is implemented, something to auto leave a user from all channels in said left space
            // https://linear.app/hnt-labs/issue/HNT-2207/leave-channels-when-leaving-a-space
            // For now, we'll just ignore events for rooms we're not in so we can avoid further work here
            const room = this.matrixClient.getRoom(roomId)
            if (!room || room.getMyMembership() !== Membership.Join) {
                console.log('MDE::onDecryption skipping - not a member of room', {
                    room,
                })
                return
            }

            if (!room.isSpaceRoom()) {
                const parentId = room.currentState.getStateEvents(EventType.SpaceParent)?.[0]?.event
                    ?.state_key

                const parentMembership = this.matrixClient.getRoom(parentId)?.getMyMembership()
                if (!parentMembership || parentMembership !== Membership.Join) {
                    console.log('MDE::onDecryption skipping - not a member of parent space', {
                        room,
                        parentId,
                    })
                    return
                }
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
    }

    private onCurrentlyActive = (event: MatrixEvent | undefined, user: MatrixUser) => {
        console.log('MDE::onCurrentlyActive', { userId: user.userId, user: user.presence })
        if (user.currentlyActive) {
            this.throttledStartLookingForKeys()
        }
    }

    private onPresence = (event: MatrixEvent | undefined, user: MatrixUser) => {
        console.log('MDE::onPresence', { userId: user.userId, user: user.presence })
        if (user.presence === 'online') {
            this.throttledStartLookingForKeys()
        }
    }

    private onDeviceUpdate = (users: string[], _initialFetch: boolean) => {
        users.forEach((userId) => this.hasUpToDateDeviceForUser.add(userId))
        this.throttledStartLookingForKeys()
    }

    private onToDeviceEvent = (event: MatrixEvent) => {
        this.matrixClient
            .decryptEventIfNeeded(event)
            .then(() => {
                // if the event is one we care about
                if (Object.keys(this.receivedToDeviceProcessersMap).includes(event.getType())) {
                    // enqueue the event to be processed
                    this.receivedToDeviceEventsQueue.enqueue(event)
                }
            })
            .catch((err: Error) => {
                console.log('MDE::onToDeviceEvent - error trying to decrypt', { err })
            })
    }

    constructor(matrixClient: MatrixClient, delegate: MatrixDecryptionExtensionDelegate) {
        super()
        this.matrixClient = matrixClient
        this.delgate = delegate
        this.userId = getOrThrow(matrixClient.getUserId(), 'MDE::constructor - no userId')
        this.accountAddress = getOrThrow(
            createUserIdFromString(this.userId)?.accountAddress,
            'MDE::constructor - no accountAddress',
        )
        // mapping of event type to processors
        this.receivedToDeviceProcessersMap = {
            [TownsToDeviceMessageType.ExtendedKeyRequest]: (e, s) => {
                return this.onKeyRequest(e, s)
            },
            [TownsToDeviceMessageType.ExtendedKeyResponse]: (e, s) => {
                return this.onKeyResponse(e, s)
            },
        }
        // queue for processing to-device events
        this.receivedToDeviceEventsQueue = new ProcessingQueue<MatrixEvent>({
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

        if (!matrixClient.crypto) {
            throw new Error('MDE::constructor - crypto not enabled')
        }

        // listen for encrypted events
        matrixClient.on(RoomEvent.Timeline, this.onTimelineEvent)

        // listen for unable to decrypt events
        matrixClient.on(MatrixEventEvent.Decrypted, this.onDecryptedEvent)

        // listen for "currently_active" members (in go `time.Since(p.LastActiveTS.Time()).Minutes() < 5`)
        matrixClient.on(UserEvent.CurrentlyActive, this.onCurrentlyActive)
        // listen for "online" members (in go `p.Presence == "online"`)
        matrixClient.on(UserEvent.Presence, this.onPresence)

        // listen for new devices
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        matrixClient.on(CryptoEvent.DevicesUpdated, this.onDeviceUpdate)

        // listen for extended key requests
        matrixClient.on(ClientEvent.ToDeviceEvent, this.onToDeviceEvent)
    }

    public stop(): void {
        // stop listening for encrypted events
        this.matrixClient.off(RoomEvent.Timeline, this.onTimelineEvent)

        // stop listening for unable to decrypt events
        this.matrixClient.off(MatrixEventEvent.Decrypted, this.onDecryptedEvent)

        // stop listening for "currently_active" members (in go `time.Since(p.LastActiveTS.Time()).Minutes() < 5`)
        this.matrixClient.off(UserEvent.CurrentlyActive, this.onCurrentlyActive)
        // stop listening for "online" members (in go `p.Presence == "online"`)
        this.matrixClient.off(UserEvent.Presence, this.onPresence)

        // stop listening for new devices
        this.matrixClient.off(CryptoEvent.DevicesUpdated, this.onDeviceUpdate)

        // stop listening for extended key requests
        this.matrixClient.off(ClientEvent.ToDeviceEvent, this.onToDeviceEvent)

        this.receivedToDeviceProcessersMap = {}
        this.throttledStartLookingForKeys.cancel()
        this.receivedToDeviceEventsQueue.stop()
    }

    private currentlyRequestingCount(): number {
        return Object.values(this.roomRecords).filter(
            (roomRecord) => roomRecord.requestingFrom !== undefined,
        ).length
    }

    private async checkSelfIsEntitled(): Promise<void> {
        // make sure we're entitled to the space before asking for keys
        for (const [roomId, roomRecord] of Object.entries(this.roomRecords)) {
            if (roomRecord.isEntitled === undefined) {
                const room = this.matrixClient.getRoom(roomId)
                if (room) {
                    const spaceId = room.isSpaceRoom()
                        ? roomId
                        : room.currentState
                              .getStateEvents(EventType.SpaceParent)
                              .at(0)
                              ?.getStateKey()

                    if (spaceId) {
                        const channelId = roomId === spaceId ? undefined : roomId
                        roomRecord.spaceId = spaceId
                        roomRecord.isEntitled = await this.delgate.isEntitled(
                            spaceId,
                            channelId,
                            this.accountAddress,
                            Permission.Read,
                        )
                    }
                }
            }
        }
    }

    private clenseSuccessfullyDecrypted() {
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
    }

    private async startLookingForKeys() {
        if (!this.clientRunning) {
            console.log('MDE::startLookingForKeys - clientRunning is false')
            return
        }

        await this.checkSelfIsEntitled()

        this.clenseSuccessfullyDecrypted()

        // filter out in progress or empty entries, sort by priority
        const rooms = Object.entries(this.roomRecords)
            // add roomId to roomRecord
            .map(([roomId, roomRecord]) => {
                return { ...roomRecord, roomId }
            })
            // filter out rooms that we're not entitled to
            .filter((roomRecord) => roomRecord.isEntitled === true)
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

        // loop over our rooms and start looking for keys
        for (const room of rooms) {
            if (this.currentlyRequestingCount() >= MAX_CONCURRENT_ROOM_KEY_REQUESTS) {
                console.log('MDE::startLookingForKeys - max concurrent requests')
                break
            }
            await this._startLookingForKeys(room.roomId)
        }
    }

    private async _startLookingForKeys(roomId: string) {
        const roomRecord = this.roomRecords[roomId]
        if (!roomRecord) {
            throw new Error('MDE::_startLookingForKeys - room record not found')
        }
        const room = this.matrixClient.getRoom(roomId)
        if (!room) {
            throw new Error('MDE::_startLookingForKeys - matrix room not found')
        }

        if (!roomRecord.decryptionFailures.length) {
            console.log(`MDE::_startLookingForKeys - no decryption failures for`, { roomId })
            return
        }

        const myDevices = this.matrixClient.getStoredDevicesForUser(
            this.matrixClient.getUserId() ?? '',
        )

        const onlineMembersWithDevies = room
            .getJoinedMembers()
            .filter(
                (member) =>
                    // find currently active OR 'online' members
                    // seems like there's bugs in the dendrite presence clearing logic
                    // we'll get lastActiveTS updates that are over 2 hours old but the user is still online
                    (member.user?.currentlyActive === true || member.user?.presence === 'online') &&
                    // make sure we have an up to date device list for the user
                    this.hasUpToDateDeviceForUser.has(member.userId) &&
                    // filter out ourselves unless we have more than one device online
                    (member.userId !== this.matrixClient.getUserId() || myDevices.length >= 2),
            )
            .map((member) => member.userId)

        if (!onlineMembersWithDevies.length) {
            console.log('MDE::_startLookingForKeys - no online members', { roomId })
            return
        }

        const now = Date.now()
        const eligableMemberIds = onlineMembersWithDevies.filter(
            (memberId) =>
                // find someone we haven't sent a request to in a while
                now - (roomRecord.requests?.[memberId]?.timestamp ?? 0) >
                TIME_BETWEEN_USER_KEY_REQUESTS_MS,
        )

        if (!eligableMemberIds.length) {
            const userWithNewDevices = onlineMembersWithDevies.find((memberId) => {
                const seenDeviceIds = roomRecord.requests?.[memberId]?.toDeviceIds ?? []
                const currentDeviceIds = this.matrixClient
                    .getStoredDevicesForUser(memberId)
                    .map((d) => d.deviceId)
                return currentDeviceIds.some((deviceId) => !seenDeviceIds.includes(deviceId))
            })
            if (userWithNewDevices) {
                console.log('MDE::_startLookingForKeys - found user with new devices online', {
                    roomId,
                    userWithNewDevices,
                })
                eligableMemberIds.push(userWithNewDevices)
            } else {
                console.log('MDE::_startLookingForKeys - no eligable members')
                return
            }
        }

        const unknownSessionIds: [senderKey: string, sessionId: string][] =
            roomRecord.decryptionFailures.map((event) => {
                const wireContent = event.getWireContent()
                return [wireContent.sender_key as string, wireContent.session_id as string]
            })

        const decryptionFailureSenders = new Set(
            roomRecord.decryptionFailures.map((event) => event.getSender()),
        )

        // sort eligable members to prioritize senders of decryption failures
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
            console.log('MDE::_startLookingForKeys - no eligable members with devices', { roomId })
            return
        }

        console.log(
            `MDE::_startLookingForKeys found ${eligableMemberIds.length} eligable members, sending key request`,
            {
                to: requesteeId,
                from: this.matrixClient.getUserId(),
                roomId,
            },
        )

        // Get the users devices,
        // TODO, we should figure out which devices are online
        const devices = this.matrixClient.getStoredDevicesForUser(requesteeId)

        if (!devices.length) {
            throw new Error('logic error, we filtered for devices but none found')
        }

        const seenDeviceIds = roomRecord.requests?.[requesteeId]?.toDeviceIds ?? []

        const requestRecord: KeyRequestRecord = {
            timestamp: now,
            toDeviceIds: uniq([...seenDeviceIds, ...devices.map((d) => d.deviceId)]),
        }

        const spaceId = roomRecord.spaceId

        if (!spaceId) {
            console.error('MDE::_startLookingForKeys - no spaceId found', { roomId })
            return
        }

        const allSharedHistorySessions =
            await this.matrixClient.crypto?.olmDevice.getSharedHistoryInboundGroupSessions(roomId)

        const knownSessions =
            allSharedHistorySessions?.map(([_senderKey, sessionId]) => sessionId) ?? []

        // if the number of known sessions is small, pass them in the request so clients can
        // send everything but those sessions in the response, otherwise, just pass the unknown
        const request: KeyRequestPayload = {
            knownSessionIds:
                knownSessions.length < MAX_EVENTS_PER_REQUEST ? knownSessions : undefined,
            requestedSessions: unknownSessionIds.slice(0, MAX_EVENTS_PER_REQUEST),
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
            console.log('MDE::_startLookingForKeys - key request timed out', {
                from: this.matrixClient.getUserId(),
                to: requesteeId,
                roomId,
            })
            this.clearKeyRequest(roomId, requesteeId)
        }, KEY_REQUEST_TIMEOUT_MS)

        const devicesInfo = devices.map((d) => ({ userId: requesteeId, deviceInfo: d }))

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
        this.throttledStartLookingForKeys()
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

    /*************************************************************
     * on Key Response
     *************************************************************/
    private async onKeyResponse(event: MatrixEvent, senderId: string) {
        const response = event.getContent<KeyResponsePayload>()
        const { roomId } = response
        const roomRecord = this.roomRecords[roomId]
        if (!roomRecord) {
            console.warn('MDE::onKeyResponse - room record not found', { roomId })
            return
        }
        if (!roomRecord.requests?.[senderId]) {
            console.warn('MDE::onKeyResponse - no request found for sender', {
                senderId,
                content: event.getContent(),
                roomId,
            })
            return
        }
        console.log('MDE::onKeyResponse', { kind: response.kind, senderId, roomId })
        roomRecord.requests[senderId].response = response

        switch (response.kind) {
            case 'keys_not_found':
                break
            case 'room_not_found':
                break
            case 'keys_found':
                {
                    // nice, the other person had keys for us
                    if (response.sessions) {
                        const sessions: IMegolmSessionData[] = []
                        // loop over everything we got back
                        for (const content of response.sessions) {
                            // see if we still need the key, no point in importing it twice
                            const event = this.roomRecords[roomId]?.decryptionFailures.find(
                                (e) => e.getWireContent().session_id === content.session_id,
                            )

                            if (event) {
                                if (event.isDecryptionFailure()) {
                                    sessions.push(content)
                                }
                            } else {
                                // if we aren't tracking this event at all, see if we
                                // are missing keys for it
                                const hasKeys =
                                    await this.matrixClient.crypto?.olmDevice.hasInboundSessionKeys(
                                        roomId,
                                        content.sender_key,
                                        content.session_id,
                                    )
                                if (!hasKeys) {
                                    sessions.push(content)
                                }
                            }
                        }
                        // if we found some, import them
                        if (!sessions.length) {
                            console.log("MDE::importSessionKeys don't need these keys")
                        } else {
                            console.log('MDE::importSessionKeys', {
                                inPayload: response.sessions.length,
                                needed: sessions.length,
                                senderId,
                            })
                            await this.matrixClient.crypto?.importRoomKeys(sessions)
                        }
                    }

                    // wait for any pending decryption
                    await Promise.all([
                        roomRecord.decryptionFailures.map((e) => e.getDecryptionPromise()),
                    ])
                }
                break
            default:
                console.log('MDE::onKeyResponse - unknown response kind', {
                    response,
                    senderId,
                    roomId,
                })
        }
        // clear any request to this user and start looking for keys again
        console.log('MDE::onKeyResponse complete', { kind: response.kind, senderId, roomId })
        this.clearKeyRequest(roomId, senderId)
    }

    /*************************************************************
     * on Key Request
     *************************************************************/
    private async onKeyRequest(event: MatrixEvent, fromUserId: string) {
        const content = event.getContent<KeyRequestPayload>()
        const { spaceId, channelId, knownSessionIds, requestedSessions } = content
        const roomId = channelId ?? spaceId
        if (!roomId) {
            console.error('MDE::onKeyRequest got key sharing request with missing fields', {
                roomId,
                from: fromUserId,
            })
            return
        }

        console.log('MDE::onKeyRequest', {
            spaceId,
            channelId,
            roomId,
            fromUserId,
        })

        const userIdentifier = createUserIdFromString(fromUserId)

        if (!userIdentifier?.accountAddress) {
            console.warn(
                'MDE::onKeyRequest got key sharing request from user without account address',
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
            console.warn('MDE::onKeyRequest got key sharing request from unentitled user', {
                spaceId,
                channelId,
                roomId,
                from: fromUserId,
            })
            return
        }

        const senderKey = event.getSenderKey()
        if (!senderKey) {
            console.warn('MDE::onKeyRequest got key sharing request with no sender key')
            return
        }

        // this should return a promise if the download is in progress, and skip if already downloaded
        await this.matrixClient.crypto?.downloadKeys([fromUserId])

        const deviceInfo = this.matrixClient.crypto?.deviceList.getDeviceByIdentityKey(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            MEGOLM_ALGORITHM,
            senderKey,
        )

        if (!deviceInfo) {
            console.warn('MDE::onKeyRequest got key sharing request with no device')
            return
        }

        const encryptAndRespondWith = async (response: KeyResponsePayload) => {
            const devicesInfo = [{ userId: fromUserId, deviceInfo }]
            await this.matrixClient.encryptAndSendToDevices(devicesInfo, {
                type: TownsToDeviceMessageType.ExtendedKeyResponse,
                content: response,
            })
        }

        const getUniqueUnknownSharedHistorySessions = async () => {
            if (knownSessionIds) {
                const allSharedHistorySessions =
                    await this.matrixClient.crypto?.olmDevice.getSharedHistoryInboundGroupSessions(
                        roomId,
                    )
                return (
                    allSharedHistorySessions?.filter(
                        ([_senderKey, sessionId]) => !knownSessionIds?.includes(sessionId),
                    ) ?? []
                )
            }
            return []
        }

        const sharedHistorySessions = await getUniqueUnknownSharedHistorySessions()

        console.log('MDE::onKeyRequest requested', {
            roomId,
            requestedSessions: requestedSessions?.length,
            knownSessionIds: knownSessionIds?.length,
            mySessions: sharedHistorySessions.length,
        })

        const uniqueRequestedSessions = (requestedSessions ?? []).filter(
            (x) => !sharedHistorySessions.some((y) => x[1] === y[1]),
        )

        const allRequestedSessions = sharedHistorySessions.concat(uniqueRequestedSessions)

        const exportedSessions: IMegolmSessionData[] = []
        try {
            await this.matrixClient.crypto?.cryptoStore.doTxn(
                'readonly',
                [
                    IndexedDBCryptoStore.STORE_INBOUND_GROUP_SESSIONS,
                    IndexedDBCryptoStore.STORE_INBOUND_GROUP_SESSIONS_WITHHELD,
                ],
                (txn) => {
                    allRequestedSessions.forEach(([senderKey, sessionId]) => {
                        this.matrixClient.crypto?.cryptoStore.getEndToEndInboundGroupSession(
                            senderKey,
                            sessionId,
                            txn,
                            (sessionData, _groupSessionWitheld) => {
                                if (!sessionData || !this.matrixClient.crypto) {
                                    return
                                }
                                if (sessionData.room_id === roomId) {
                                    const sess =
                                        this.matrixClient.crypto.olmDevice.exportInboundGroupSession(
                                            senderKey,
                                            sessionId,
                                            sessionData,
                                        )
                                    delete sess.first_known_index
                                    sess.algorithm = MEGOLM_ALGORITHM
                                    exportedSessions.push(sess)
                                } else {
                                    console.error(
                                        'MDE::onKeyRequest got key sharing request for wrong room',
                                        { roomId, fromUserId, sessionId },
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

        console.info('MDE::onKeyRequest responding to key request', {
            fromUserId,
            toUserId: event.getSender(),
            roomId,
            knownSessionIds: knownSessionIds?.length,
            requestedSessions: requestedSessions?.length,
            numSessionsLookedUp: allRequestedSessions.length,
            exportedSessions: exportedSessions.length,
        })

        if (!exportedSessions.length) {
            console.info('MDE::onKeyRequest got key sharing request for unknown room')
            await encryptAndRespondWith({ kind: 'keys_not_found', roomId })
            return
        }

        await encryptAndRespondWith({ kind: 'keys_found', roomId, sessions: exportedSessions })
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
