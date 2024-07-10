import { isDecryptedEvent, StreamTimelineEvent } from '../../../types'

export interface TimelineEvent {
    eventId: string
    text: string
    createdAtEpochMs: bigint
    creatorUserId: string
    isDecryptedEvent: boolean
}

export function toEvent(timelineEvent: StreamTimelineEvent, _userId: string): TimelineEvent {
    const eventId = timelineEvent.hashStr

    // temporary until we port the rest of the timeline transforms
    return {
        eventId,
        text: getEventText(timelineEvent),
        createdAtEpochMs: timelineEvent.createdAtEpochMs,
        creatorUserId: timelineEvent.creatorUserId,
        isDecryptedEvent: isDecryptedEvent(timelineEvent),
    }
}

// temportary until we port the rest of the timeline transforms
function getEventText(event: StreamTimelineEvent): string {
    if (event.decryptedContent) {
        if (event.decryptedContent.kind === 'channelMessage') {
            if (
                event.decryptedContent.content.payload.case === 'post' &&
                event.decryptedContent.content.payload.value.content.case === 'text'
            ) {
                return event.decryptedContent.content.payload.value.content.value.body
            } else {
                return event.decryptedContent.content.payload.case ?? 'unset' // temp
            }
        } else if (event.decryptedContent.kind === 'text') {
            return event.decryptedContent.content
        } else {
            return event.decryptedContent.kind
        }
    }

    if (event.localEvent) {
        if (
            event.localEvent?.channelMessage?.payload.case === 'post' &&
            event.localEvent?.channelMessage?.payload.value.content.case === 'text'
        ) {
            return event.localEvent?.channelMessage?.payload.value.content.value.body
        } else {
            return event.localEvent?.channelMessage?.payload.case ?? 'unset' // temp
        }
    }

    if (event.remoteEvent) {
        const k1 = event.remoteEvent.event.payload.case
        const k2 = event.remoteEvent.event.payload.value?.content?.case ?? 'unset'
        return `${k1}: ${k2}`
    }

    return 'idk...'
}
