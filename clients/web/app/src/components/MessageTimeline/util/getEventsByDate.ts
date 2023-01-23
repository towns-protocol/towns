import {
    FullyReadMarker,
    RoomCreateEvent,
    RoomMemberEvent,
    RoomMessageEncryptedEvent,
    RoomMessageEvent,
    TimelineEvent,
    ZTEvent,
} from 'use-zion-client'
import { ExperimentsState } from 'store/experimentsStore'

export enum RenderEventType {
    UserMessages = 'UserMessages',
    Message = 'Message',
    EncryptedMessage = 'EncryptedMessage',
    RoomMember = 'RoomMember',
    RoomCreate = 'RoomCreate',
    FullyRead = 'FullyRead',
    ThreadUpdate = 'ThreadUpdate',
}

interface BaseEvent {
    type: RenderEventType
}

export type ZRoomMessageEvent = Omit<TimelineEvent, 'content'> & {
    content: RoomMessageEvent
}

export type ZRoomMessageEncryptedEvent = Omit<TimelineEvent, 'content'> & {
    content: RoomMessageEncryptedEvent
}

export type ZRoomMemberEvent = Omit<TimelineEvent, 'content'> & { content: RoomMemberEvent }

export type ZRoomCreateEvent = Omit<TimelineEvent, 'content'> & { content: RoomCreateEvent }

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
    event: ZRoomMemberEvent
}

export interface RoomCreateRenderEvent extends BaseEvent {
    type: RenderEventType.RoomCreate
    key: string
    event: ZRoomCreateEvent
}

export interface FullyReadRenderEvent extends BaseEvent {
    type: RenderEventType.FullyRead
    key: string
    event: FullyReadMarker
    isHidden: boolean
}

export interface ThreadUpdateRenderEvent extends BaseEvent {
    type: RenderEventType.ThreadUpdate
    key: string
    events: ZRoomMessageEvent[]
}

export interface EncryptedMessageRenderEvent extends BaseEvent {
    type: RenderEventType.EncryptedMessage
    key: string
    event: ZRoomMessageEncryptedEvent
}

const isRoomCreate = (event: TimelineEvent): event is ZRoomCreateEvent => {
    return event.content?.kind === ZTEvent.RoomCreate
}

const isRoomMessage = (event: TimelineEvent): event is ZRoomMessageEvent => {
    return event.content?.kind === ZTEvent.RoomMessage
}

const isEncryptedRoomMessage = (event: TimelineEvent): event is ZRoomMessageEncryptedEvent => {
    return event.content?.kind === ZTEvent.RoomMessageEncrypted
}

const isRoomMember = (event: TimelineEvent): event is ZRoomMemberEvent => {
    return event.content?.kind === ZTEvent.RoomMember
}

export type DateGroup = {
    date: {
        // date (at midnight)
        date: Date
        // humanDate
        humanDate: string
    }
    events: RenderEvent[]
    // display as new (unread)
    isNew?: boolean
}

export type RenderEvent =
    | UserMessagesRenderEvent
    | RoomMemberRenderEvent
    | RoomCreateRenderEvent
    | FullyReadRenderEvent
    | MessageRenderEvent
    | ThreadUpdateRenderEvent
    | EncryptedMessageRenderEvent

const DEBUG_SINGLE = false

const createRelativeDateUtil = () => {
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const getRelativeDays = (date: Date) => {
        const str = date.toDateString()

        return today.toDateString() === str
            ? 'Today'
            : yesterday.toDateString() === str
            ? 'Yesterday'
            : str.replace(/20[0-9]{2}$/, '')
    }
    return {
        getRelativeDays,
    }
}

export const getEventsByDate = (
    events: TimelineEvent[],
    fullyReadMarker?: FullyReadMarker,
    isThread?: boolean,
    experiments?: ExperimentsState,
) => {
    const { getRelativeDays } = createRelativeDateUtil()
    const result = events.reduce(
        (result, event: TimelineEvent, index) => {
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
                    isNew: false,
                }
                dateGroups.push(group)
            }

            const renderEvents = group.events

            if (isRoomMessage(event)) {
                if (fullyReadMarker?.eventId === event.eventId) {
                    if (
                        // TODO: if we add readmarkers to more events than
                        // messages this should get refactored
                        !renderEvents.some(
                            (r) =>
                                r.type === RenderEventType.UserMessages ||
                                r.type === RenderEventType.Message,
                        )
                    ) {
                        // show date as "new" since first message appears to be unread
                        group.isNew = true
                    }
                    renderEvents.push({
                        type: RenderEventType.FullyRead,
                        key: `fully-read-${event.eventId}`,
                        event: fullyReadMarker,
                        // hidden since message is shown within the date-group marker
                        isHidden: !!group.isNew,
                    })
                }

                const prevEvent = renderEvents[renderEvents.length - 1]

                if (!isThread && event.threadParentId) {
                    if (!experiments?.enableInlineThreadUpdates) {
                        // serge mode is disabled
                    } else {
                        if (prevEvent && prevEvent.type === RenderEventType.ThreadUpdate) {
                            prevEvent.events.push(event)
                        } else {
                            renderEvents.push({
                                type: RenderEventType.ThreadUpdate,
                                key: `thread-update-${event.eventId}`,
                                events: [event],
                            })
                        }
                    }
                } else if (
                    !DEBUG_SINGLE &&
                    prevEvent &&
                    prevEvent.type === RenderEventType.UserMessages &&
                    prevEvent.events[0].sender.id === event.sender.id &&
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
            } else if (isEncryptedRoomMessage(event)) {
                renderEvents.push({
                    type: RenderEventType.EncryptedMessage,
                    key: event.eventId,
                    event,
                })
            } else if (isRoomMember(event)) {
                renderEvents.push({
                    type: RenderEventType.RoomMember,
                    key: event.eventId,
                    event,
                })
            } else if (isRoomCreate(event)) {
                renderEvents.push({
                    type: RenderEventType.RoomCreate,
                    key: event.eventId,
                    event,
                })
            }
            return result
        },
        {
            dateGroups: [] as DateGroup[],
        },
    )

    result.dateGroups = result.dateGroups.filter((g) => !!g.events.length)

    return result.dateGroups
}
