import { Membership, MembershipOp, MiniblockHeader } from '@river/proto'
import { logNever } from './check'
import TypedEmitter from 'typed-emitter'
import { StreamEvents } from './streamEvents'
import { EmittedEvents } from './client'
import { bin_toHexString } from './binary'

export class StreamStateView_Membership {
    readonly userId: string
    readonly streamId: string
    readonly joinedUsers = new Set<string>()
    readonly invitedUsers = new Set<string>()
    readonly pendingEvents = new Map<string, Membership>()

    constructor(userId: string, streamId: string) {
        this.userId = userId
        this.streamId = streamId
    }

    initialize(
        memberships: { [key: string]: Membership },
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        // iterate over map, add joined and invited users
        for (const membership of Object.values(memberships)) {
            this.applyMembershipEvent(membership, emitter)
        }
    }

    /**
     * process a miniblock header, applying membership events in order
     */
    onMiniblockHeader(blockHeader: MiniblockHeader, emitter?: TypedEmitter<EmittedEvents>): void {
        // loop over confirmed events, apply membership events in order
        for (const eventHash of blockHeader.eventHashes) {
            const eventId = bin_toHexString(eventHash)
            const payload = this.pendingEvents.get(eventId)
            if (payload) {
                this.applyMembershipEvent(payload, emitter)
                this.pendingEvents.delete(eventId)
            }
        }
    }

    /**
     * Places event in a pending queue, to be applied when the event is confirmed in a miniblock header
     */
    appendMembershipEvent(
        eventHashStr: string,
        payload: Membership,
        _emitter?: TypedEmitter<EmittedEvents>,
    ): void {
        this.pendingEvents.set(eventHashStr, payload)
    }

    /**
     * If no userId is provided, checks current user
     */
    isMemberJoined(userId?: string): boolean {
        return this.joinedUsers.has(userId ?? this.userId)
    }

    private applyMembershipEvent(payload: Membership, emitter?: TypedEmitter<EmittedEvents>) {
        const { op, userId } = payload
        switch (op) {
            case MembershipOp.SO_INVITE:
                if (this.invitedUsers.add(userId)) {
                    emitter?.emit('streamNewUserInvited', this.streamId, userId)
                    this.maybeEmitMyMembershipChange(userId, emitter, this.streamId)
                }
                break
            case MembershipOp.SO_JOIN:
                if (this.joinedUsers.add(userId)) {
                    emitter?.emit('streamNewUserJoined', this.streamId, userId)
                    this.maybeEmitMyMembershipChange(userId, emitter, this.streamId)
                }
                break
            case MembershipOp.SO_LEAVE:
                {
                    const wasJoined = this.joinedUsers.delete(userId)
                    const wasInvited = this.invitedUsers.delete(userId)
                    if (wasJoined || wasInvited) {
                        emitter?.emit('streamUserLeft', this.streamId, userId)
                        this.maybeEmitMyMembershipChange(userId, emitter, this.streamId)
                    }
                }
                break
            case MembershipOp.SO_UNSPECIFIED:
                break
            default:
                logNever(op)
        }
    }

    private maybeEmitMyMembershipChange(
        userId: string,
        emitter: TypedEmitter<StreamEvents> | undefined,
        streamId: string,
    ) {
        if (userId === this.userId) {
            emitter?.emit('streamMyMembershipUpdated', streamId, {
                invited: this.invitedUsers.has(userId),
                joined: this.joinedUsers.has(userId),
            })
        }
    }
}
