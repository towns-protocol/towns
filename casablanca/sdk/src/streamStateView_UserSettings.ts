import {
    EncryptedData,
    FullyReadMarkerContent,
    FullyReadMarkersContent,
    Snapshot,
    UserSettingsPayload,
    UserSettingsPayload_FullyReadMarkers,
    UserSettingsPayload_Inception,
    UserSettingsPayload_Snapshot,
} from '@river/proto'
import TypedEmitter from 'typed-emitter'
import { ParsedEvent } from './types'
import { EmittedEvents } from './client'
import { logNever } from './check'
import { StreamEvents } from './streamEvents'

export class StreamStateView_UserSettings {
    readonly streamId: string
    readonly settings = new Map<string, string>()
    //this property can be used during the UI part initialization to get initial state of fullyReadMarkers
    readonly readFullyReadMarkers = new Map<string, EncryptedData>()

    constructor(inception: UserSettingsPayload_Inception) {
        this.streamId = inception.streamId
    }

    initialize(snapshot: Snapshot, content: UserSettingsPayload_Snapshot): void {
        // iterate over content.fullyReadMarkers
        for (const [_, payload] of Object.entries(content.fullyReadMarkers)) {
            this.fullyReadMarkerUpdate(payload)
        }
    }

    prependEvent(
        event: ParsedEvent,
        payload: UserSettingsPayload,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
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
        event: ParsedEvent,
        payload: UserSettingsPayload,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
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
        if (content === undefined) {
            console.error('Content with FullyReadMarkers is undefined')
            return
        }

        this.readFullyReadMarkers.set(payload.channelStreamId, content)

        const fullyReadMarkers: Record<string, FullyReadMarkerContent> = {}

        const fullyReadMarkersContent: FullyReadMarkersContent =
            FullyReadMarkersContent.fromJsonString(content.text)

        for (const [threadRoot, fullyReadMarker] of Object.entries(
            fullyReadMarkersContent.markers,
        )) {
            fullyReadMarkers[threadRoot] = fullyReadMarker
        }

        emitter?.emit('channelUnreadMarkerUpdated', fullyReadMarkers)
    }
}
