import { ZRoomMessageEvent } from '@components/MessageTimeline/util/getEventsByDate'

export type EventDocument = {
    key: string
    channelId: string
    body: string
    source: ZRoomMessageEvent
}
