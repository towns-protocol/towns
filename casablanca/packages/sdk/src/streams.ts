import { ChannelOp, StreamKind, StreamOp } from '@towns/proto'
import TypedEmitter from 'typed-emitter'
import { check, isDefined, throwWithCode } from './check'
import { Err } from '@towns/proto'
import { ParsedEvent } from './types'

export const findLeafEventHashes = (streamId: string, events: ParsedEvent[]): string[] => {
    check(events.length > 0, `Stream is empty ${streamId}`, Err.STREAM_BAD_HASHES)
    const hashes = new Set<string>()
    for (const event of events) {
        hashes.add(event.hashStr)
        for (const prev of event.event.prevEventsStrs) {
            hashes.delete(prev)
        }
    }
    check(hashes.size > 0, `No leaf event found in ${streamId}`, Err.STREAM_BAD_HASHES)
    return [...hashes]
}

// TOOO: add FullEvents to emitted events, tigheten types to specific payload for ease of use.
export type StreamEvents = {
    streamInception: (streamId: string, streamKind: StreamKind) => void
    streamNewUserJoined: (streamId: string, userId: string) => void
    streamNewUserInvited: (streamId: string, userId: string) => void
    streamUserLeft: (streamId: string, userId: string) => void
    userJoinedStream: (streamId: string) => void
    userInvitedToStream: (streamId: string) => void
    userLeftStream: (streamId: string) => void
    spaceNewChannelCreated: (spaceId: string, channelId: string) => void
    spaceChannelDeleted: (spaceId: string, channelId: string) => void
    channelNewMessage: (channelId: string, message: ParsedEvent) => void

    streamInitialized: (streamId: string, streamKind: StreamKind, events: ParsedEvent[]) => void
    streamUpdated: (streamId: string, events: ParsedEvent[]) => void
}

export type StreamEventKeys = keyof StreamEvents

export class StreamStateView {
    readonly streamId: string
    readonly streamKind: StreamKind

    readonly events = new Map<string, ParsedEvent>()

    readonly joinedUsers = new Set<string>()
    readonly invitedUsers = new Set<string>()

    readonly messages = new Map<string, ParsedEvent>()

    readonly spaceChannels = new Set<string>()

    readonly userInvitedStreams = new Set<string>()
    readonly userJoinedStreams = new Set<string>()

    readonly leafEventHashes = new Map<string, Uint8Array>()

    constructor(streamId: string, inceptionEvent: ParsedEvent | undefined) {
        check(inceptionEvent !== undefined, `Stream is empty ${streamId}`, Err.STREAM_EMPTY)
        check(
            inceptionEvent.event.payload?.payload.case === 'inception',
            `First event is not inception ${streamId}`,
            Err.STREAM_BAD_EVENT,
        )
        const inceptionPayload = inceptionEvent.event.payload?.payload.value
        check(
            isDefined(inceptionPayload),
            `First event is not inception ${streamId}`,
            Err.STREAM_BAD_EVENT,
        )
        check(
            isDefined(inceptionPayload.streamKind) &&
                inceptionPayload.streamKind !== StreamKind.SK_UNSPECIFIED,
            `Unknown stream kind ${streamId}`,
            Err.STREAM_BAD_EVENT,
        )
        check(
            inceptionPayload.streamId === streamId,
            `Non-matching stream id in inception ${streamId} != ${inceptionPayload.streamId}`,
            Err.STREAM_BAD_EVENT,
        )
        this.streamId = streamId
        this.streamKind = inceptionPayload.streamKind
    }

    private addEvent(event: ParsedEvent, emitter?: TypedEmitter<StreamEvents>): void {
        // TODO: is there need to check event validity and chaining here?

        this.events.set(event.hashStr, event)
        this.leafEventHashes.set(event.hashStr, event.envelope.hash)
        for (const prev of event.event.prevEventsStrs!) {
            this.leafEventHashes.delete(prev)
        }

        const payload = event.event.payload?.payload
        check(isDefined(payload), `Event has no payload ${event.hashStr}`, Err.STREAM_BAD_EVENT)

        switch (payload.case) {
            case 'inception':
                emitter?.emit('streamInception', this.streamId, payload.value.streamKind)
                break
            case 'userStreamOp':
                {
                    const { op, streamId } = payload.value
                    switch (op) {
                        case StreamOp.SO_INVITE:
                            this.userInvitedStreams.add(streamId)
                            emitter?.emit('userInvitedToStream', streamId)
                            break
                        case StreamOp.SO_JOIN:
                            this.userJoinedStreams.add(streamId)
                            emitter?.emit('userJoinedStream', streamId)
                            break
                        case StreamOp.SO_LEAVE:
                            emitter?.emit('userLeftStream', streamId)
                            this.userJoinedStreams.delete(streamId)
                            break
                        default:
                            throwWithCode(`Unknown userStreamOp ${op}`, Err.STREAM_BAD_EVENT)
                    }
                }
                break
            case 'joinableStream':
                {
                    const { op, userId } = payload.value
                    switch (op) {
                        case StreamOp.SO_INVITE:
                            this.invitedUsers.add(userId)
                            emitter?.emit('streamNewUserInvited', this.streamId, userId)
                            break
                        case StreamOp.SO_JOIN:
                            this.joinedUsers.add(userId)
                            emitter?.emit('streamNewUserJoined', this.streamId, userId)
                            break
                        case StreamOp.SO_LEAVE:
                            this.joinedUsers.delete(userId)
                            this.invitedUsers.delete(userId)
                            emitter?.emit('streamUserLeft', this.streamId, userId)
                            break
                        default:
                            throwWithCode(`Unknown joinableStream ${op}`, Err.STREAM_BAD_EVENT)
                    }
                }
                break
            case 'channel':
                const { op, channelId } = payload.value
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
                break
            case 'message':
                this.messages.set(event.hashStr, event)
                emitter?.emit('channelNewMessage', this.streamId, event)
                break
            default:
                throwWithCode(`Unhandled event kind`, Err.INTERNAL_ERROR_SWITCH)
        }
    }

    addEvents(events: ParsedEvent[], emitter?: TypedEmitter<StreamEvents>, init?: boolean): void {
        for (const event of events) {
            this.addEvent(event, emitter)
        }
        if (emitter !== undefined) {
            if (init ?? false) {
                emitter.emit('streamInitialized', this.streamId, this.streamKind, events)
            } else {
                emitter.emit('streamUpdated', this.streamId, events)
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
