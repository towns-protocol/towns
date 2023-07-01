import { dlog } from './dlog'
import {
    ChannelOp,
    DeviceKeys,
    MembershipOp,
    Err,
    ChannelPayload_Inception,
    StreamEvent,
    SpacePayload_Inception,
    UserDeviceKeyPayload_Inception,
    UserSettingsPayload_Inception,
    UserPayload_Inception,
    PayloadCaseType,
    Membership,
    SpacePayload_Channel,
    UserPayload_UserMembership,
    UserDeviceKeyPayload_UserDeviceKey,
    UserPayload_ToDevice,
} from '@towns/proto'
import TypedEmitter from 'typed-emitter'
import { check, checkNever, isDefined, throwWithCode } from './check'
import { ParsedEvent } from './types'
import { userIdFromAddress } from './id'

const log = dlog('csb:streams')

export const findLeafEventHashes = (streamId: string, events: ParsedEvent[]): string[] => {
    check(events.length > 0, `Stream is empty ${streamId}`, Err.STREAM_BAD_HASHES)
    const hashes = new Set<string>()
    for (const event of events) {
        hashes.add(event.hashStr)
        for (const prev of event.prevEventsStrs) {
            hashes.delete(prev)
        }
    }
    check(hashes.size > 0, `No leaf event found in ${streamId}`, Err.STREAM_BAD_HASHES)
    return [...hashes]
}

export type StreamEvents = {
    streamInception: (streamId: string, event: StreamEvent) => void
    spaceInception: (
        streamId: string,
        event: StreamEvent,
        inceptionEvent: SpacePayload_Inception,
    ) => void
    channelInception: (
        streamId: string,
        event: StreamEvent,
        inceptionEvent: ChannelPayload_Inception,
    ) => void
    userInception: (
        streamId: string,
        event: StreamEvent,
        inceptionEvent: UserPayload_Inception,
    ) => void
    userSettingsInception: (
        streamId: string,
        event: StreamEvent,
        inceptionEvent: UserSettingsPayload_Inception,
    ) => void
    userDeviceKeyInception: (
        streamId: string,
        event: StreamEvent,
        inceptionEvent: UserDeviceKeyPayload_Inception,
    ) => void
    streamNewUserJoined: (streamId: string, userId: string) => void
    streamNewUserInvited: (streamId: string, userId: string) => void
    streamUserLeft: (streamId: string, userId: string) => void
    userJoinedStream: (streamId: string) => void
    userInvitedToStream: (streamId: string) => void
    userLeftStream: (streamId: string) => void
    spaceNewChannelCreated: (spaceId: string, channelId: string) => void
    spaceChannelDeleted: (spaceId: string, channelId: string) => void
    channelNewMessage: (channelId: string, message: ParsedEvent) => void
    toDeviceMessage: (streamId: string, event: UserPayload_ToDevice, senderUserId: string) => void
    userDeviceKeyMessage: (
        streamId: string,
        userId: string,
        deviceKeys: DeviceKeys,
        fallbackKeys: object | undefined,
    ) => void
    streamInitialized: (
        streamId: string,
        payloadKind: PayloadCaseType,
        events: ParsedEvent[],
    ) => void
    streamUpdated: (streamId: string, payloadKind: PayloadCaseType, events: ParsedEvent[]) => void
}

export type StreamEventKeys = keyof StreamEvents

export class StreamStateView {
    readonly streamId: string
    readonly payloadKind: PayloadCaseType

    readonly timeline: ParsedEvent[] = []
    readonly events = new Map<string, ParsedEvent>()

    readonly joinedUsers = new Set<string>()
    readonly invitedUsers = new Set<string>()

    readonly messages = new Map<string, ParsedEvent>()
    readonly receipts = new Map<string, ParsedEvent>()

    readonly spaceChannels = new Set<string>()
    readonly parentSpaceId?: string

    readonly userInvitedStreams = new Set<string>()
    readonly userJoinedStreams = new Set<string>()

    readonly toDeviceMessages: ParsedEvent[] = []
    // device_id -> device_keys, fallback_keys
    readonly uploadedDeviceKeys = new Map<string, UserDeviceKeyPayload_UserDeviceKey[]>()

    readonly leafEventHashes = new Map<string, Uint8Array>()

    constructor(streamId: string, inceptionEvent: ParsedEvent | undefined) {
        check(inceptionEvent !== undefined, `Stream is empty ${streamId}`, Err.STREAM_EMPTY)
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

        switch (inceptionEvent.event.payload.case) {
            case 'channelPayload':
                this.parentSpaceId = (inceptionPayload as ChannelPayload_Inception).spaceId
                break
            case 'spacePayload':
            case 'userPayload':
            case 'userSettingsPayload':
            case 'userDeviceKeyPayload':
            case undefined:
                this.parentSpaceId = undefined
                break
            default:
                checkNever(inceptionEvent.event.payload)
        }
    }

    private addEvent(event: ParsedEvent, emitter?: TypedEmitter<StreamEvents>): void {
        // TODO: is there need to check event validity and chaining here?
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
                            this.messages.set(event.hashStr, event)
                            emitter?.emit('channelNewMessage', this.streamId, event)
                            break
                        case 'membership':
                            this.addMembershipEvent(payload.value.content.value, emitter)
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
                            this.addChannelEvent(payload.value.content.value, emitter)
                            break
                        case 'membership':
                            this.addMembershipEvent(payload.value.content.value, emitter)
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
                            this.addUserMembershipEvent(payload.value.content.value, emitter)
                            break
                        case 'toDevice':
                            {
                                const content = payload.value.content.value
                                emitter?.emit(
                                    'toDeviceMessage',
                                    this.streamId,
                                    content,
                                    userIdFromAddress(event.event.creatorAddress),
                                )
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
                        case 'userSetting':
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
                case undefined:
                    break
                default:
                    checkNever(payload)
            }
        } catch (e) {
            log(`Error processing event ${event.hashStr}`, e)
        }
    }

    addChannelEvent(payload: SpacePayload_Channel, emitter?: TypedEmitter<StreamEvents>): void {
        const { op, channelId } = payload
        switch (op) {
            case ChannelOp.CO_CREATED:
                this.spaceChannels.add(channelId)
                emitter?.emit('spaceNewChannelCreated', this.streamId, channelId)
                break
            case ChannelOp.CO_DELETED:
                emitter?.emit('spaceChannelDeleted', this.streamId, channelId)
                this.spaceChannels.delete(channelId)
                break
            default:
                throwWithCode(`Unknown channel ${op}`, Err.STREAM_BAD_EVENT)
        }
    }

    addUserMembershipEvent(
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

    addMembershipEvent(payload: Membership, emitter?: TypedEmitter<StreamEvents>): void {
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

    addEvents(events: ParsedEvent[], emitter?: TypedEmitter<StreamEvents>, init?: boolean): void {
        for (const event of events) {
            this.addEvent(event, emitter)
        }
        if (emitter !== undefined) {
            if (init ?? false) {
                emitter.emit('streamInitialized', this.streamId, this.payloadKind, events)
            } else {
                emitter.emit('streamUpdated', this.streamId, this.payloadKind, events)
            }
        }
    }
}

export const rollupStream = (
    streamId: string,
    events: ParsedEvent[],
    emitter?: TypedEmitter<StreamEvents>,
): StreamStateView => {
    const ret = new StreamStateView(streamId, events[0])
    ret.addEvents(events, emitter, true)
    return ret
}
