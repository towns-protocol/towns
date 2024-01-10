import TypedEmitter from 'typed-emitter'
import { ConfirmedTimelineEvent, ParsedEvent, RemoteTimelineEvent } from './types'
import { EmittedEvents } from './client'
import {
    Snapshot,
    UserToDevicePayload,
    UserToDevicePayload_Snapshot,
    UserToDevicePayload_Snapshot_DeviceSummary,
    UserToDevicePayload_MegolmSessions,
    UserToDevicePayload_Ack,
} from '@river/proto'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { StreamStateView_UserStreamMembership } from './streamStateView_Membership'
import { check, logNever } from '@river/mecholm'

export class StreamStateView_UserToDevice extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly memberships: StreamStateView_UserStreamMembership
    deviceSummary: Record<string, UserToDevicePayload_Snapshot_DeviceSummary> = {}
    pendingMegolmSessions: Record<
        string,
        { creatorUserId: string; value: UserToDevicePayload_MegolmSessions }
    > = {}

    constructor(streamId: string) {
        super()
        this.streamId = streamId
        this.memberships = new StreamStateView_UserStreamMembership(streamId)
    }

    applySnapshot(
        snapshot: Snapshot,
        content: UserToDevicePayload_Snapshot,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        Object.entries(content.deviceSummary).map(([deviceId, summary]) => {
            this.deviceSummary[deviceId] = summary
        })
    }

    onConfirmedEvent(
        event: ConfirmedTimelineEvent,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        super.onConfirmedEvent(event, emitter)
        const eventId = event.hashStr
        const payload = this.pendingMegolmSessions[eventId]
        if (payload) {
            delete this.pendingMegolmSessions[eventId]
            this.addMegolmSessions(payload.creatorUserId, payload.value, emitter)
        }
    }

    prependEvent(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'userToDevicePayload')
        const payload: UserToDevicePayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'megolmSessions':
                this.addMegolmSessions(event.creatorUserId, payload.content.value, emitter)
                break
            case 'ack':
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    appendEvent(
        event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'userToDevicePayload')
        const payload: UserToDevicePayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'megolmSessions':
                this.pendingMegolmSessions[event.hashStr] = {
                    creatorUserId: event.creatorUserId,
                    value: payload.content.value,
                }
                break
            case 'ack':
                this.updateDeviceSummary(event.remoteEvent, payload.content.value)
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    hasPendingSessionId(deviceKey: string, sessionId: string): boolean {
        for (const [_, payload] of Object.entries(this.pendingMegolmSessions)) {
            if (
                payload.value.sessionIds.includes(sessionId) &&
                payload.value.ciphertexts[deviceKey]
            ) {
                return true
            }
        }
        return false
    }

    private addMegolmSessions(
        creatorUserId: string,
        content: UserToDevicePayload_MegolmSessions,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        emitter?.emit('newMegolmSessions', content, creatorUserId)
    }

    private updateDeviceSummary(event: ParsedEvent, content: UserToDevicePayload_Ack) {
        const summary = this.deviceSummary[content.deviceKey]
        if (summary) {
            if (summary.upperBound <= content.miniblockNum) {
                delete this.deviceSummary[content.deviceKey]
            } else {
                summary.lowerBound = content.miniblockNum + 1n
            }
        }
    }
}
