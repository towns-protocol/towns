import {
    FullyReadMarker,
    RoomCreateEvent,
    RoomMemberEvent,
    RoomMessageEvent,
    TimelineEvent,
    ZTEvent,
} from 'use-zion-client'

export enum RenderEventType {
    UserMessages = 'UserMessages',
    Message = 'Message',
    RoomMember = 'RoomMember',
    RoomCreate = 'RoomCreate',
    FullyRead = 'FullyRead',
}

interface BaseEvent {
    type: RenderEventType
}

type ZRoomMessageEvent = Omit<TimelineEvent, 'content'> & {
    content: RoomMessageEvent
}

export interface UserMessagesRenderEvent extends BaseEvent {
    type: RenderEventType.UserMessages
    key: string
    events: ZRoomMessageEvent[]
}

export interface MessageRenderEvent extends BaseEvent {
    type: RenderEventType.Message
    key: string
    event: ZRoomMessageEvent
    displayContext: 'tail' | 'single' | 'head'
    isHighlight?: boolean
}

export interface RoomMemberRenderEvent extends BaseEvent {
    type: RenderEventType.RoomMember
    key: string
    event: Omit<TimelineEvent, 'content'> & { content: RoomMemberEvent }
}

export interface RoomCreateRenderEvent extends BaseEvent {
    type: RenderEventType.RoomCreate
    key: string
    event: Omit<TimelineEvent, 'content'> & { content: RoomCreateEvent }
}

export interface FullyReadRenderEvent extends BaseEvent {
    type: RenderEventType.FullyRead
    key: string
    event: FullyReadMarker
}

const isRoomMessage = (event: TimelineEvent): event is ZRoomMessageEvent => {
    return event.content?.kind === ZTEvent.RoomMessage
}

export type DateGroup = {
    date: {
        // date (at midnight)
        date: Date
        // humanDate
        humanDate: string
    }
    events: RenderEvent[]
}

export type RenderEvent =
    | UserMessagesRenderEvent
    | RoomMemberRenderEvent
    | RoomCreateRenderEvent
    | FullyReadRenderEvent
    | MessageRenderEvent

const DEBUG_SINGLE = false

export const useGroupEvents = (
    events: TimelineEvent[],
    fullyReadMarker?: FullyReadMarker,
    isThread?: boolean,
): DateGroup[] => {
    const { getHumanDate: getRelativeDays } = useHumanDate()
    const { dateGroups } = events.reduce(
        (result, event: TimelineEvent, index, events) => {
            const { dateGroups } = result

            let group = dateGroups[dateGroups.length - 1]
            const prevDate = group?.date.humanDate
            const date = new Date(event.originServerTs)
            const humanDate = getRelativeDays(date)

            if (humanDate !== prevDate) {
                group = {
                    date: {
                        humanDate,
                        date,
                    },
                    events: [],
                }
                dateGroups.push(group)
            }

            const renderEvents = group.events

            if (isRoomMessage(event)) {
                if (fullyReadMarker?.eventId === event.eventId) {
                    renderEvents.push({
                        type: RenderEventType.FullyRead,
                        key: `fully-read-${event.eventId}`,
                        event: fullyReadMarker,
                    })
                }

                const prevEvent = renderEvents[renderEvents.length - 1]

                if (
                    !DEBUG_SINGLE &&
                    prevEvent &&
                    prevEvent.type === RenderEventType.UserMessages &&
                    prevEvent.events[0].content.sender.id === event.content.sender.id &&
                    (index > 1 || !isThread)
                ) {
                    prevEvent.events.push(event)
                } else {
                    renderEvents.push({
                        type: RenderEventType.UserMessages,
                        key: event.eventId,
                        events: [event],
                    })
                }
            }
            return result
        },
        {
            dateGroups: [] as DateGroup[],
            previousDay: '',
        },
    )
    return dateGroups.filter((g) => g.events.length)
}

const useHumanDate = () => {
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const getHumanDate = (date: Date) => {
        const str = date.toDateString()

        return today.toDateString() === str
            ? 'Today'
            : yesterday.toDateString() === str
            ? 'Yesterday'
            : str.replace(/20[0-9]{2}$/, '')
    }
    return {
        getHumanDate,
    }
}
