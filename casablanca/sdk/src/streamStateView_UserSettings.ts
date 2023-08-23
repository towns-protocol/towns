import {
    EncryptedData,
    FullyReadMarkerContent,
    FullyReadMarkersContent,
    UserSettingsPayload,
    UserSettingsPayload_FullyReadMarkers,
    UserSettingsPayload_Inception,
} from '@river/proto'
import TypedEmitter from 'typed-emitter'
import { ParsedEvent } from './types'
import { EmittedEvents } from './client'
import { checkNever } from './check'
import { StreamEvents } from './streamEvents'

export class StreamStateView_UserSettings {
    readonly streamId: string
    readonly settings = new Map<string, string>()
    //this property can be used during the UI part initialization to get initial state of fullyReadMarkers
    readonly readFullyReadMarkers = new Map<string, EncryptedData>()

    constructor(inception: UserSettingsPayload_Inception) {
        this.streamId = inception.streamId
    }

    appendEvent(
        event: ParsedEvent,
        payload: UserSettingsPayload,
        emitter?: TypedEmitter<EmittedEvents>,
    ): void {
        switch (payload.content.case) {
            case 'inception':
                break
            case 'fullyReadMarkers':
                if (payload.content.value.content) {
                    this.readFullyReadMarkers.set(
                        payload.content.value.channelStreamId,
                        payload.content.value.content,
                    )
                }
                this.fullyReadMarkerUpdate(payload.content.value, emitter)
                break
            case undefined:
                break
            default:
                checkNever(payload.content)
        }
    }

    private fullyReadMarkerUpdate(
        payload: UserSettingsPayload_FullyReadMarkers,
        emitter?: TypedEmitter<StreamEvents>,
    ): void {
        const { content } = payload
        if (content === undefined) {
            throw Error('Content with FullyReadMarkers is undefined')
        } else {
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
}
