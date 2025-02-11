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
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        super.onConfirmedEvent(event, emitter, encryptionEmitter)
    }

    prependEvent(
        event: RemoteTimelineEvent,
        _cleartext: Uint8Array | string | undefined,
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
        _cleartext: Uint8Array | string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
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
                this.updateDeviceSummary(event.remoteEvent, payload.content.value, stateEmitter)
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private addGroupSessions(
        creatorUserId: string,
        content: UserInboxPayload_GroupEncryptionSessions,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ) {
        encryptionEmitter?.emit('newGroupSessions', content, creatorUserId)
    }

    private updateDeviceSummary(
        event: ParsedEvent,
        content: UserInboxPayload_Ack,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        const summary = this.deviceSummary[content.deviceKey]
        if (summary) {
            if (summary.upperBound <= content.miniblockNum) {
                delete this.deviceSummary[content.deviceKey]
            } else {
                summary.lowerBound = content.miniblockNum + 1n
            }
        }
        stateEmitter?.emit(
            'userInboxDeviceSummaryUpdated',
            this.streamId,
            content.deviceKey,
            summary,
        )
    }
}
