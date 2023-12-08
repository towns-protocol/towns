import {
    EncryptedData,
    FullyReadMarker,
    FullyReadMarkers,
    MiniblockHeader,
    Snapshot,
    UserSettingsPayload,
    UserSettingsPayload_FullyReadMarkers,
    UserSettingsPayload_Inception,
    UserSettingsPayload_Snapshot,
} from '@river/proto'
import TypedEmitter from 'typed-emitter'
import { RemoteTimelineEvent } from './types'
import { EmittedEvents } from './client'
import { check, logNever } from './check'
import { StreamEvents } from './streamEvents'
import { dlog } from './dlog'
import { StreamStateView_IContent } from './streamStateView_IContent'
import { toPlainMessage } from '@bufbuild/protobuf'
import { StreamStateView_UserStreamMembership } from './streamStateView_Membership'

const log = dlog('csb:stream')

export class StreamStateView_UserSettings extends StreamStateView_IContent {
    readonly streamId: string
    readonly memberships: StreamStateView_UserStreamMembership
    readonly settings = new Map<string, string>()
    readonly fullyReadMarkersSrc = new Map<string, EncryptedData>()
    readonly fullyReadMarkers = new Map<string, Record<string, FullyReadMarker>>()

    constructor(inception: UserSettingsPayload_Inception) {
        super()
        this.streamId = inception.streamId
        this.memberships = new StreamStateView_UserStreamMembership(inception.streamId)
    }

    initialize(snapshot: Snapshot, content: UserSettingsPayload_Snapshot): void {
        // iterate over content.fullyReadMarkers
        for (const [_, payload] of Object.entries(content.fullyReadMarkers)) {
            this.fullyReadMarkerUpdate(payload)
        }
    }

    onMiniblockHeader(_blockHeader: MiniblockHeader, _emitter?: TypedEmitter<EmittedEvents>): void {
        // nothing to do
    }

    prependEvent(
        event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
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
        cleartext: string | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'userSettingsPayload')
        const payload: UserSettingsPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'fullyReadMarkers':
                this.fullyReadMarkerUpdate(payload.content.value, emitter)
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private fullyReadMarkerUpdate(
        payload: UserSettingsPayload_FullyReadMarkers,
        emitter?: TypedEmitter<StreamEvents>,
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
