import TypedEmitter from 'typed-emitter'
import { ConfirmedTimelineEvent, ParsedEvent, RemoteTimelineEvent } from './types'
import {
    Snapshot,
    UserInboxPayload,
    UserInboxPayload_Snapshot,
    UserInboxPayload_Snapshot_DeviceSummary,
    UserInboxPayload_GroupEncryptionSessions,
    UserInboxPayload_Ack,
} from '@river-build/proto'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { check } from '@river-build/dlog'
import { logNever } from './check'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'

export class StreamStateView_UserInbox extends StreamStateView_AbstractContent {
    readonly streamId: string
    deviceSummary: Record<string, UserInboxPayload_Snapshot_DeviceSummary> = {}
    pendingGroupSessions: Record<
        string,
        { creatorUserId: string; value: UserInboxPayload_GroupEncryptionSessions }
    > = {}

    constructor(streamId: string) {
        super()
        this.streamId = streamId
    }

    applySnapshot(
        snapshot: Snapshot,
        content: UserInboxPayload_Snapshot,
        _emitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        Object.entries(content.deviceSummary).map(([deviceId, summary]) => {
            this.deviceSummary[deviceId] = summary
        })
    }

    onConfirmedEvent(
        event: ConfirmedTimelineEvent,
        emitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        super.onConfirmedEvent(event, emitter)
        const eventId = event.hashStr
        const payload = this.pendingGroupSessions[eventId]
        if (payload) {
            delete this.pendingGroupSessions[eventId]
            this.addGroupSessions(payload.creatorUserId, payload.value, emitter)
        }
    }

    prependEvent(
        event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'userInboxPayload')
        const payload: UserInboxPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'groupEncryptionSessions':
                this.addGroupSessions(event.creatorUserId, payload.content.value, encryptionEmitter)
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
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'userInboxPayload')
        const payload: UserInboxPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'groupEncryptionSessions':
                this.pendingGroupSessions[event.hashStr] = {
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
        for (const [_, payload] of Object.entries(this.pendingGroupSessions)) {
            if (
                payload.value.sessionIds.includes(sessionId) &&
                payload.value.ciphertexts[deviceKey]
            ) {
                return true
            }
        }
        return false
    }

    private addGroupSessions(
        creatorUserId: string,
        content: UserInboxPayload_GroupEncryptionSessions,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ) {
        encryptionEmitter?.emit('newGroupSessions', content, creatorUserId)
    }

    private updateDeviceSummary(event: ParsedEvent, content: UserInboxPayload_Ack) {
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
