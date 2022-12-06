import TypedEmitter from 'typed-emitter'
import { check, throwWithCode } from './check'
import { Err } from './err'
import { FullEvent, StreamKind } from './types'

export const findLeafEventHashes = (streamId: string, events: FullEvent[]): string[] => {
    check(events.length > 0, `Stream is empty ${streamId}`, Err.STREAM_BAD_HASHES)
    const hashes = new Set<string>()
    for (const event of events) {
        hashes.add(event.hash)
        for (const prev of event.base.prevEvents) {
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
    channelNewMessage: (channelId: string, message: FullEvent) => void

    streamInitialized: (streamId: string, streamKind: StreamKind, events: FullEvent[]) => void
    streamUpdated: (streamId: string, events: FullEvent[]) => void
}

export type StreamEventKeys = keyof StreamEvents

export class StreamStateView {
    readonly streamId: string
    readonly streamKind: StreamKind

    readonly events = new Map<string, FullEvent>()

    readonly joinedUsers = new Set<string>()
    readonly invitedUsers = new Set<string>()

    readonly messages = new Map<string, FullEvent>()

    readonly spaceChannels = new Set<string>()

    readonly userInvitedStreams = new Set<string>()
    readonly userJoinedStreams = new Set<string>()

    readonly leafEventHashes = new Set<string>()

    constructor(streamId: string, inceptionEvent: FullEvent | undefined) {
        check(inceptionEvent !== undefined, `Stream is empty ${streamId}`, Err.STREAM_EMPTY)
        check(
            inceptionEvent.base.payload.kind === 'inception',
            `First event is not inception ${streamId}`,
            Err.STREAM_BAD_EVENT,
        )
        this.streamId = streamId
        this.streamKind = inceptionEvent.base.payload.data.streamKind
    }

    private addEvent(event: FullEvent, emitter?: TypedEmitter<StreamEvents>): void {
        // TODO: is there need to check event validity and chaining here?

        this.events.set(event.hash, event)
        this.leafEventHashes.add(event.hash)
        for (const prev of event.base.prevEvents) {
            this.leafEventHashes.delete(prev)
        }

        const { payload } = event.base
        switch (payload.kind) {
            case 'inception':
                emitter?.emit('streamInception', this.streamId, payload.data.streamKind)
                break
            case 'join':
                this.joinedUsers.add(payload.userId)
                emitter?.emit('streamNewUserJoined', this.streamId, payload.userId)
                break
            case 'invite':
                this.invitedUsers.add(payload.userId)
                emitter?.emit('streamNewUserInvited', this.streamId, payload.userId)
                break
            case 'leave':
                emitter?.emit('streamUserLeft', this.streamId, payload.userId)
                this.joinedUsers.delete(payload.userId)
                this.invitedUsers.delete(payload.userId)
                break
            case 'user-invited':
                this.userInvitedStreams.add(payload.streamId)
                emitter?.emit('userInvitedToStream', payload.streamId)
                break
            case 'user-joined':
                this.userJoinedStreams.add(payload.streamId)
                emitter?.emit('userJoinedStream', payload.streamId)
                break
            case 'user-left':
                emitter?.emit('userLeftStream', payload.streamId)
                this.userJoinedStreams.delete(payload.streamId)
                break
            case 'channel-created':
                this.spaceChannels.add(payload.channelId)
                emitter?.emit('spaceNewChannelCreated', this.streamId, payload.channelId)
                break
            case 'channel-deleted':
                emitter?.emit('spaceChannelDeleted', this.streamId, payload.channelId)
                this.spaceChannels.delete(payload.channelId)
                break
            case 'message':
                this.messages.set(event.hash, event)
                emitter?.emit('channelNewMessage', this.streamId, event)
                break
            default:
                const c: never = payload
                throwWithCode(`Unhandled event kind: ${c}`, Err.INTERNAL_ERROR_SWITCH)
        }
    }

    addEvents(events: FullEvent[], emitter?: TypedEmitter<StreamEvents>, init?: boolean): void {
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
    events: FullEvent[],
    emitter?: TypedEmitter<StreamEvents>,
): StreamStateView => {
    const ret = new StreamStateView(streamId, events[0])
    ret.addEvents(events, emitter, true)
    return ret
}
