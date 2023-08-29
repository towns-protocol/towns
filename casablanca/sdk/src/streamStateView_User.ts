import TypedEmitter from 'typed-emitter'
import { ParsedEvent } from './types'
import { EmittedEvents } from './client'
import {
    MembershipOp,
    Snapshot,
    UserPayload,
    UserPayload_Inception,
    UserPayload_Snapshot,
    UserPayload_UserMembership,
} from '@river/proto'
import { logNever } from './check'
import { StreamEvents } from './streamEvents'
import { RiverEvent } from './event'
import { userIdFromAddress } from './id'

export class StreamStateView_User {
    readonly streamId: string
    readonly userInvitedStreams = new Set<string>()
    readonly userJoinedStreams = new Set<string>()
    readonly toDeviceMessages: ParsedEvent[] = []

    constructor(inception: UserPayload_Inception) {
        this.streamId = inception.streamId
    }

    initialize(
        snapshot: Snapshot,
        content: UserPayload_Snapshot,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        // initialize memberships
        for (const [_, payload] of Object.entries(content.memberships)) {
            this.addUserPayload_userMembership(payload, emitter)
        }
    }

    prependEvent(
        event: ParsedEvent,
        payload: UserPayload,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        switch (payload.content.case) {
            case 'inception':
                break
            case 'userMembership':
                // memberships are handled in the snapshot
                break
            case 'toDevice':
                this.addToDeviceMessage(event, emitter)
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    appendEvent(
        event: ParsedEvent,
        payload: UserPayload,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        switch (payload.content.case) {
            case 'inception':
                break
            case 'userMembership':
                this.addUserPayload_userMembership(payload.content.value, emitter)
                break
            case 'toDevice':
                this.addToDeviceMessage(event, emitter)
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private addToDeviceMessage(
        event: ParsedEvent,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        // todo jterzis: really we should be passing emitter to RiverEvent
        // here but it causes a bug in the tests.
        const riverEvent = new RiverEvent(
            {
                payload: {
                    parsed_event: event.event.payload,
                    creator_user_id: userIdFromAddress(event.event.creatorAddress),
                    stream_id: this.streamId,
                },
            },
            emitter,
            event,
        )
        emitter?.emit('toDeviceMessage', this.streamId, riverEvent)

        // TODO: filter by deviceId and only store current deviceId's events
        this.toDeviceMessages.push(event)
    }

    private addUserPayload_userMembership(
        payload: UserPayload_UserMembership,
        emitter: TypedEmitter<StreamEvents> | undefined,
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
                {
                    const wasInvited = this.userInvitedStreams.delete(streamId)
                    const wasJoined = this.userJoinedStreams.delete(streamId)
                    if (wasInvited || wasJoined) {
                        emitter?.emit('userLeftStream', streamId)
                    }
                }
                break
            case MembershipOp.SO_UNSPECIFIED:
                break
            default:
                logNever(op)
        }
    }
}
