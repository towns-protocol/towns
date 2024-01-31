import {
    EncryptedData,
    FullyReadMarker,
    FullyReadMarkers,
    Snapshot,
    UserSettingsPayload,
    UserSettingsPayload_FullyReadMarkers,
    UserSettingsPayload_Snapshot,
} from '@river/proto'
import TypedEmitter from 'typed-emitter'
import { RemoteTimelineEvent } from './types'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { check, dlog } from '@river/dlog'
import { logNever } from './check'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { toPlainMessage } from '@bufbuild/protobuf'
import { StreamStateView_UserStreamMembership } from './streamStateView_Membership'

const log = dlog('csb:stream')

export class StreamStateView_UserSettings extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly memberships: StreamStateView_UserStreamMembership
    readonly settings = new Map<string, string>()
    readonly fullyReadMarkersSrc = new Map<string, EncryptedData>()
    readonly fullyReadMarkers = new Map<string, Record<string, FullyReadMarker>>()

    constructor(streamId: string) {
        super()
        this.streamId = streamId
        this.memberships = new StreamStateView_UserStreamMembership(streamId)
    }

    applySnapshot(snapshot: Snapshot, content: UserSettingsPayload_Snapshot): void {
        // iterate over content.fullyReadMarkers
        for (const [_, payload] of Object.entries(content.fullyReadMarkers)) {
            this.fullyReadMarkerUpdate(payload)
        }
    }

    prependEvent(
        event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'userSettingsPayload')
        const payload: UserSettingsPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'fullyReadMarkers':
                // handled in snapshot
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
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'userSettingsPayload')
        const payload: UserSettingsPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'fullyReadMarkers':
                this.fullyReadMarkerUpdate(payload.content.value, stateEmitter)
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private fullyReadMarkerUpdate(
        payload: UserSettingsPayload_FullyReadMarkers,
        emitter?: TypedEmitter<StreamStateEvents>,
    ): void {
        const { content } = payload
        log('$ fullyReadMarkerUpdate', { content })
        if (content === undefined) {
            log('$ Content with FullyReadMarkers is undefined')
            return
        }
        this.fullyReadMarkersSrc.set(payload.channelStreamId, content)
        const fullyReadMarkersContent = toPlainMessage(
            FullyReadMarkers.fromJsonString(content.ciphertext),
        )

        this.fullyReadMarkers.set(payload.channelStreamId, fullyReadMarkersContent.markers)
        emitter?.emit(
            'fullyReadMarkersUpdated',
            payload.channelStreamId,
            fullyReadMarkersContent.markers,
        )
    }
}
