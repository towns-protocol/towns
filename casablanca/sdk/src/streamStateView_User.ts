import TypedEmitter from 'typed-emitter'
import { ParsedEvent } from './types'
import { EmittedEvents } from './client'
import {
    MembershipOp,
    UserPayload,
    UserPayload_Inception,
    UserPayload_UserMembership,
} from '@river/proto'
import { checkNever } from './check'
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

    appendEvent(
        event: ParsedEvent,
        payload: UserPayload,
        emitter?: TypedEmitter<EmittedEvents>,
    ): void {
        switch (payload.content.case) {
            case 'inception':
                emitter?.emit('userInception', this.streamId, event.event, payload.content.value)
                break
            case 'userMembership':
                this.addUserPayload_userMembership(payload.content.value, emitter)
                break
            case 'toDevice':
                {
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
                    )
                    emitter?.emit('toDeviceMessage', this.streamId, riverEvent)

                    // TODO: filter by deviceId and only store current deviceId's events
                    this.toDeviceMessages.push(event)
                }
                break
            case undefined:
                break
            default:
                checkNever(payload.content)
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
}
