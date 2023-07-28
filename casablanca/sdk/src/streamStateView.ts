import { dlog } from './dlog'
import {
    ChannelOp,
    DeviceKeys,
    MembershipOp,
    Err,
    ChannelPayload_Inception,
    PayloadCaseType,
    Membership,
    SpacePayload_Channel,
    UserPayload_UserMembership,
    UserDeviceKeyPayload_UserDeviceKey,
    SyncCookie,
    StreamAndCookie,
    ChannelProperties,
    EncryptedData,
    SpacePayload_Inception,
    FullyReadMarkerContent,
    FullyReadMarkersContent,
    UserSettingsPayload_FullyReadMarkers,
} from '@towns/proto'
import TypedEmitter from 'typed-emitter'
import { check, checkNever, isDefined, throwWithCode } from './check'
import {
    ParsedEvent,
    getToDeviceWirePayloadContent,
    make_ChannelPayload_Message,
    make_UserPayload_ToDevice,
} from './types'
import { userIdFromAddress } from './id'
import { RiverEvent } from './event'
import isEqual from 'lodash/isEqual'
import { unpackEnvelopes } from './sign'
import { StreamEvents } from './streamEvents'

const log = dlog('csb:streams')

const isCookieEqual = (a?: SyncCookie, b?: SyncCookie): boolean => isEqual(a, b)

export class StreamStateView {
    readonly streamId: string
    readonly name?: string
    readonly payloadKind: PayloadCaseType

    readonly streamCustomProperties = new Map<string, string>()

    readonly timeline: ParsedEvent[] = []
    readonly events = new Map<string, ParsedEvent>()

    readonly joinedUsers = new Set<string>()
    readonly invitedUsers = new Set<string>()

    readonly messages = new Map<string, ParsedEvent>()
    readonly receipts = new Map<string, ParsedEvent>()

    readonly spaceChannelsMetadata = new Map<string, ChannelProperties>()
    readonly parentSpaceId?: string

    readonly userInvitedStreams = new Set<string>()
    readonly userJoinedStreams = new Set<string>()

    readonly toDeviceMessages: ParsedEvent[] = []
    // device_id -> device_keys, fallback_keys
    readonly uploadedDeviceKeys = new Map<string, UserDeviceKeyPayload_UserDeviceKey[]>()

    readonly leafEventHashes = new Map<string, Uint8Array>()

    syncCookie?: SyncCookie
    maxOldInstanceBlockNumber = -1n

    constructor(streamId: string, inceptionEvent: ParsedEvent | undefined) {
        check(isDefined(inceptionEvent), `Stream is empty ${streamId}`, Err.STREAM_EMPTY)
        check(
            inceptionEvent.event.payload?.value?.content.case === 'inception',
            `First event is not inception ${streamId}`,
            Err.STREAM_BAD_EVENT,
        )
        const inceptionPayload = inceptionEvent.event.payload?.value?.content.value
        check(
            isDefined(inceptionPayload),
            `First event is not inception ${streamId}`,
            Err.STREAM_BAD_EVENT,
        )
        check(
            inceptionPayload.streamId === streamId,
            `Non-matching stream id in inception ${streamId} != ${inceptionPayload.streamId}`,
            Err.STREAM_BAD_EVENT,
        )

        this.streamId = streamId
        this.payloadKind = inceptionEvent.event.payload.case
        if (this.payloadKind === 'channelPayload') {
            this.parentSpaceId = (inceptionPayload as ChannelPayload_Inception).spaceId
        } else if (this.payloadKind === 'spacePayload') {
            this.name = (inceptionPayload as SpacePayload_Inception).name
        }
    }

    private addEvent(
        event: ParsedEvent,
        ignoreExisting: boolean,
        emitter?: TypedEmitter<StreamEvents>,
    ): void {
        if (this.events.has(event.hashStr)) {
            if (ignoreExisting) {
                return
            } else {
                throwWithCode(
                    `Can't add same event twice, hash=${event.hashStr}, stream=${this.streamId}`,
                    Err.STREAM_BAD_EVENT,
                )
            }
        }

        for (const prev of event.prevEventsStrs ?? []) {
            check(
                this.events.has(prev),
                `Can't add event with unknown prevEvent ${prev}, hash=${event.hashStr}, stream=${this.streamId}`,
                Err.STREAM_BAD_EVENT,
            )
        }

        this.timeline.push(event)
        this.events.set(event.hashStr, event)
        this.leafEventHashes.set(event.hashStr, event.envelope.hash)
        for (const prev of event.prevEventsStrs ?? []) {
            this.leafEventHashes.delete(prev)
        }

        const payload = event.event.payload
        check(isDefined(payload), `Event has no payload ${event.hashStr}`, Err.STREAM_BAD_EVENT)

        if (payload.value?.content?.case === 'inception') {
            emitter?.emit('streamInception', this.streamId, event.event)
        }

        try {
            switch (payload.case) {
                case 'channelPayload':
                    switch (payload.value.content.case) {
                        case 'inception':
                            emitter?.emit(
                                'channelInception',
                                this.streamId,
                                event.event,
                                payload.value.content.value,
                            )
                            break
                        case 'message':
                            {
                                this.messages.set(event.hashStr, event)
                                const riverEvent = new RiverEvent({
                                    payload: {
                                        parsed_event: make_ChannelPayload_Message(
                                            payload.value.content.value,
                                        ),
                                        creator_user_id: userIdFromAddress(
                                            event.event.creatorAddress,
                                        ),
                                    },
                                })
                                emitter?.emit('channelNewMessage', this.streamId, riverEvent)
                            }
                            break
                        case 'membership':
                            this.addChannelPayload_Membership(payload.value.content.value, emitter)
                            break
                        case 'receipt':
                            this.receipts.set(event.hashStr, event)
                            break
                        case undefined:
                            break
                        default:
                            checkNever(payload.value.content)
                    }
                    break
                case 'spacePayload':
                    switch (payload.value.content.case) {
                        case 'inception':
                            emitter?.emit(
                                'spaceInception',
                                this.streamId,
                                event.event,
                                payload.value.content.value,
                            )
                            break
                        case 'channel':
                            this.addSpacePayload_Channel(payload.value.content.value, emitter)
                            break
                        case 'membership':
                            this.addSpacePayload_Membership(payload.value.content.value, emitter)
                            break
                        case undefined:
                            break
                        default:
                            checkNever(payload.value.content)
                    }
                    break
                case 'userPayload':
                    switch (payload.value.content.case) {
                        case 'inception':
                            emitter?.emit(
                                'userInception',
                                this.streamId,
                                event.event,
                                payload.value.content.value,
                            )
                            break
                        case 'userMembership':
                            this.addUserPayload_userMembership(payload.value.content.value, emitter)
                            break
                        case 'toDevice':
                            {
                                const payload_todevice = payload.value.content.value
                                // get ciphertext payload object
                                const content = getToDeviceWirePayloadContent(payload_todevice)

                                const toDevicePayload = make_UserPayload_ToDevice({
                                    deviceKey: payload_todevice.deviceKey,
                                    senderKey: payload_todevice.senderKey,
                                    op: payload_todevice.op,
                                    message: content,
                                })
                                const riverEvent = new RiverEvent({
                                    payload: {
                                        parsed_event: toDevicePayload,
                                        creator_user_id: userIdFromAddress(
                                            event.event.creatorAddress,
                                        ),
                                    },
                                })
                                emitter?.emit('toDeviceMessage', this.streamId, riverEvent)
                                // TODO: filter by deviceId and only store current deviceId's events
                                this.toDeviceMessages.push(event)
                            }
                            break
                        case undefined:
                            break
                        default:
                            checkNever(payload.value.content)
                    }
                    break
                case 'userSettingsPayload':
                    switch (payload.value.content.case) {
                        case 'inception':
                            emitter?.emit(
                                'userSettingsInception',
                                this.streamId,
                                event.event,
                                payload.value.content.value,
                            )
                            break
                        case 'fullyReadMarkers':
                            this.fullyReadMarkerUpdate(payload.value.content.value, emitter)
                            break
                        case undefined:
                            break
                        default:
                            checkNever(payload.value.content)
                    }
                    break
                case 'userDeviceKeyPayload':
                    switch (payload.value.content.case) {
                        case 'inception':
                            emitter?.emit(
                                'userDeviceKeyInception',
                                this.streamId,
                                event.event,
                                payload.value.content.value,
                            )
                            break
                        case 'userDeviceKey':
                            {
                                const { userId, deviceKeys, fallbackKeys } =
                                    payload.value.content.value
                                emitter?.emit(
                                    'userDeviceKeyMessage',
                                    this.streamId,
                                    userId,
                                    deviceKeys as DeviceKeys,
                                    fallbackKeys,
                                )
                                if (deviceKeys?.deviceId !== undefined) {
                                    this.uploadedDeviceKeys.set(deviceKeys.deviceId, [
                                        ...(this.uploadedDeviceKeys.get(deviceKeys.deviceId) || []),
                                        payload.value.content.value,
                                    ])
                                }
                            }
                            break
                        case undefined:
                            break
                        default:
                            checkNever(payload.value.content)
                    }
                    break

                case 'block':
                    break

                case undefined:
                    break
                default:
                    checkNever(payload)
            }
        } catch (e) {
            log(`Error processing event ${event.hashStr}`, e)
        }
    }

    private channelPropertiesFromEncryptedData(
        encryptedData: EncryptedData | undefined,
    ): ChannelProperties {
        //TODO: We need to support decryption once encryption is enabled for Channel EncryptedData events
        let channelProperties = ChannelProperties.fromJsonString(encryptedData?.text ?? '')
        if (!isDefined(channelProperties)) {
            channelProperties = new ChannelProperties()
        }
        return channelProperties
    }

    private addSpacePayload_Channel(
        payload: SpacePayload_Channel,
        emitter?: TypedEmitter<StreamEvents>,
    ): void {
        const { op, channelId, channelProperties } = payload
        switch (op) {
            case ChannelOp.CO_CREATED: {
                const emittedChannelProperties =
                    this.channelPropertiesFromEncryptedData(channelProperties)

                this.spaceChannelsMetadata.set(channelId, emittedChannelProperties)

                emitter?.emit(
                    'spaceChannelCreated',
                    this.streamId,
                    channelId,
                    emittedChannelProperties,
                )
                break
            }
            case ChannelOp.CO_DELETED:
                emitter?.emit('spaceChannelDeleted', this.streamId, channelId)
                this.spaceChannelsMetadata.delete(channelId)
                break
            case ChannelOp.CO_UPDATED: {
                const emittedChannelProperties =
                    this.channelPropertiesFromEncryptedData(channelProperties)

                this.spaceChannelsMetadata.set(channelId, emittedChannelProperties)

                emitter?.emit(
                    'spaceChannelUpdated',
                    this.streamId,
                    channelId,
                    emittedChannelProperties,
                )
                break
            }
            default:
                throwWithCode(`Unknown channel ${op}`, Err.STREAM_BAD_EVENT)
        }
    }

    private addUserPayload_userMembership(
        payload: UserPayload_UserMembership,
        emitter?: TypedEmitter<StreamEvents>,
    ): void {
        const { op, streamId } = payload
        switch (op) {
            case MembershipOp.SO_INVITE:
                this.userInvitedStreams.add(streamId)
                emitter?.emit('userInvitedToStream', streamId)
                break
            case MembershipOp.SO_JOIN:
                this.userJoinedStreams.add(streamId)
                emitter?.emit('userJoinedStream', streamId)
                break
            case MembershipOp.SO_LEAVE:
                emitter?.emit('userLeftStream', streamId)
                this.userJoinedStreams.delete(streamId)
                break
            case MembershipOp.SO_UNSPECIFIED:
                break
            default:
                checkNever(op)
        }
    }

    private addSpacePayload_Membership(
        payload: Membership,
        emitter?: TypedEmitter<StreamEvents>,
    ): void {
        this.addMembershipEvent(payload, emitter)
    }

    private addChannelPayload_Membership(
        payload: Membership,
        emitter?: TypedEmitter<StreamEvents>,
    ): void {
        this.addMembershipEvent(payload, emitter)
    }

    private addMembershipEvent(payload: Membership, emitter?: TypedEmitter<StreamEvents>): void {
        const { op, userId } = payload
        switch (op) {
            case MembershipOp.SO_INVITE:
                this.invitedUsers.add(userId)
                emitter?.emit('streamNewUserInvited', this.streamId, userId)
                break
            case MembershipOp.SO_JOIN:
                this.joinedUsers.add(userId)
                emitter?.emit('streamNewUserJoined', this.streamId, userId)
                break
            case MembershipOp.SO_LEAVE:
                this.joinedUsers.delete(userId)
                this.invitedUsers.delete(userId)
                emitter?.emit('streamUserLeft', this.streamId, userId)
                break
            case MembershipOp.SO_UNSPECIFIED:
                break
            default:
                checkNever(op)
        }
    }

    private fullyReadMarkerContentFromEncryptedData(
        encryptedData: EncryptedData | undefined,
    ): FullyReadMarkerContent {
        //TODO: We need to support decryption once encryption is enabled for Channel EncryptedData events
        if (!isDefined(encryptedData?.text)) {
            throw new Error('EncryptedData is undefined')
        } else {
            const fullyReadMarkerData = FullyReadMarkerContent.fromJsonString(
                encryptedData?.text ?? '',
            )
            return fullyReadMarkerData
        }
    }

    private fullyReadMarkerUpdate(
        payload: UserSettingsPayload_FullyReadMarkers,
        emitter?: TypedEmitter<StreamEvents>,
    ): void {
        const { channelStreamId, content } = payload
        if (content === undefined) {
            throw Error('Content with FullyReadMarkers is undefined')
        } else {
            const fullyReadMarkers: Record<string, FullyReadMarkerContent> = {}

            const fullyReadMarkersContent: FullyReadMarkersContent =
                FullyReadMarkersContent.fromJsonString(content.text)

            for (const [threadRoot, fullyReadMarker] of Object.entries(fullyReadMarkersContent)) {
                fullyReadMarkers[threadRoot] = fullyReadMarker
            }

            emitter?.emit('channelUnreadMarkerUpdated', channelStreamId, fullyReadMarkers)
        }
    }

    update(
        streamAndCookie: StreamAndCookie,
        emitter?: TypedEmitter<StreamEvents>,
        init?: boolean,
    ): void {
        const events = unpackEnvelopes(streamAndCookie.events)

        let ignoreExisting = false

        if (!init) {
            if (isCookieEqual(this.syncCookie, streamAndCookie.originalSyncCookie)) {
                ignoreExisting =
                    streamAndCookie.nextSyncCookie!.miniblockNum <= this.maxOldInstanceBlockNumber
            } else {
                // Minipool instance changed, duplicate events are possible.
                ignoreExisting = true
                if (streamAndCookie.nextSyncCookie!.miniblockNum > this.maxOldInstanceBlockNumber) {
                    this.maxOldInstanceBlockNumber = streamAndCookie.nextSyncCookie!.miniblockNum
                }
            }
        }

        for (const event of events) {
            this.addEvent(event, ignoreExisting, emitter)
        }
        this.syncCookie = streamAndCookie.nextSyncCookie

        if (emitter !== undefined) {
            if (init ?? false) {
                emitter.emit('streamInitialized', this.streamId, this.payloadKind, events)
            } else {
                emitter.emit('streamUpdated', this.streamId, this.payloadKind, events)
            }
        }
    }
}
