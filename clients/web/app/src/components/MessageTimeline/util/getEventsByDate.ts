import { firstBy } from 'thenby'
import {
    Membership,
    RedactedEvent,
    RoomCreateEvent,
    RoomMemberEvent,
    RoomMessageEncryptedEvent,
    RoomMessageEvent,
    RoomPropertiesEvent,
    ThreadStats,
    TimelineEvent,
    ZTEvent,
} from 'use-zion-client'
import { ExperimentsState } from 'store/experimentsStore'

export enum RenderEventType {
    UserMessages = 'UserMessages',
    Message = 'Message',
    EncryptedMessage = 'EncryptedMessage',
    RedactedMessage = 'RedactedMessage',
    RoomMember = 'RoomMember',
    AccumulatedRoomMembers = 'AccumulatedRoomMembers',
    RoomCreate = 'RoomCreate',
    ChannelHeader = 'ChannelHeader',
    NewDivider = 'NewDivider',
    ThreadUpdate = 'ThreadUpdate',
    RoomProperties = 'RoomProperties',
}

interface BaseEvent {
    type: RenderEventType
}

export type ZRoomMessageEvent = Omit<TimelineEvent, 'content'> & {
    content: RoomMessageEvent
    isRedacted: false
}

export type ZRoomMessageEncryptedEvent = Omit<TimelineEvent, 'content'> & {
    content: RoomMessageEncryptedEvent
    isRedacted: false
}

export type ZRoomMessageRedactedEvent = Omit<TimelineEvent, 'content'> & {
    content: RedactedEvent
    isRedacted: true
}

export type ZRoomMemberEvent = Omit<TimelineEvent, 'content'> & { content: RoomMemberEvent }

export type ZRoomCreateEvent = Omit<TimelineEvent, 'content'> & { content: RoomCreateEvent }

export type ZRoomPropertiesEvent = Omit<TimelineEvent, 'content'> & { content: RoomPropertiesEvent }

export interface UserMessagesRenderEvent extends BaseEvent {
    type: RenderEventType.UserMessages
    key: string
    events: (ZRoomMessageEvent | ZRoomMessageEncryptedEvent | ZRoomMessageRedactedEvent)[]
}

export interface MessageRenderEvent extends BaseEvent {
    type: RenderEventType.Message
    key: string
    event: ZRoomMessageEvent
    displayContext: 'single' | 'head' | 'body' | 'tail'
    isHighlight?: boolean
}

export interface EncryptedMessageRenderEvent extends BaseEvent {
    type: RenderEventType.EncryptedMessage
    key: string
    event: ZRoomMessageEncryptedEvent
    displayContext: 'single' | 'head' | 'body' | 'tail'
}

export interface RedactedMessageRenderEvent extends BaseEvent {
    type: RenderEventType.RedactedMessage
    key: string
    event: ZRoomMessageRedactedEvent
    displayContext: 'single' | 'head' | 'body' | 'tail'
}

export interface RoomMemberRenderEvent extends BaseEvent {
    type: RenderEventType.RoomMember
    key: string
    event: ZRoomMemberEvent
}

export interface AccumulatedRoomMemberRenderEvent extends BaseEvent {
    type: RenderEventType.AccumulatedRoomMembers
    membershipType: Membership
    key: string
    events: ZRoomMemberEvent[]
}

export interface ChannelHeaderRenderEvent extends BaseEvent {
    type: RenderEventType.ChannelHeader
    key: string
    event: ZRoomCreateEvent
}

export interface RoomCreateRenderEvent extends BaseEvent {
    type: RenderEventType.RoomCreate
    key: string
    event: ZRoomCreateEvent
}

export interface RoomPropertiesRenderEvent extends BaseEvent {
    type: RenderEventType.RoomProperties
    key: string
    event: ZRoomPropertiesEvent
}

export interface NewDividerRenderEvent extends BaseEvent {
    type: RenderEventType.NewDivider
    key: string
}

export interface ThreadUpdateRenderEvent extends BaseEvent {
    type: RenderEventType.ThreadUpdate
    key: string
    events: ZRoomMessageEvent[]
}

const isRoomCreate = (event: TimelineEvent): event is ZRoomCreateEvent => {
    return event.content?.kind === ZTEvent.RoomCreate
}

const isRoomProperties = (event: TimelineEvent): event is ZRoomPropertiesEvent => {
    return event.content?.kind === ZTEvent.RoomProperties
}

export const isRoomMessage = (event: TimelineEvent): event is ZRoomMessageEvent => {
    return event.content?.kind === ZTEvent.RoomMessage
}

export const isRedactedRoomMessage = (event: TimelineEvent): event is ZRoomMessageRedactedEvent => {
    return event.isRedacted
}

export const isEncryptedRoomMessage = (
    event: TimelineEvent,
): event is ZRoomMessageEncryptedEvent => {
    return event.content?.kind === ZTEvent.RoomMessageEncrypted
}

const isRoomMember = (event: TimelineEvent): event is ZRoomMemberEvent => {
    return event.content?.kind === ZTEvent.RoomMember
}

export type DateGroup = {
    key: string
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
    | AccumulatedRoomMemberRenderEvent
    | ChannelHeaderRenderEvent
    | EncryptedMessageRenderEvent
    | NewDividerRenderEvent
    | MessageRenderEvent
    | RedactedMessageRenderEvent
    | RoomCreateRenderEvent
    | RoomMemberRenderEvent
    | ThreadUpdateRenderEvent
    | UserMessagesRenderEvent
    | RoomPropertiesRenderEvent

const DEBUG_NO_GROUP_BY_USER = false

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
    channelType: 'channel' | 'dm' | 'gdm',
    fullyReadMarkerEventId?: string,
    isThread?: boolean,
    replyMap?: Record<string, ThreadStats>,
    experiments?: ExperimentsState,
    groupByUser: boolean = DEBUG_NO_GROUP_BY_USER,
) => {
    const { getRelativeDays } = createRelativeDateUtil()

    const result = events.reduce(
        (result, event: TimelineEvent, index) => {
            const { dateGroups } = result

            let group = dateGroups[dateGroups.length - 1]
            const prevDate = group?.date.humanDate
            const date = new Date(event.createdAtEpocMs)
            const humanDate = getRelativeDays(date)

            if (humanDate !== prevDate) {
                // workaround to avoid duplicate keys caused by misordered events.
                const numDupes = dateGroups.filter((d) => d.date.humanDate === humanDate).length

                const key = numDupes ? `${humanDate}(${numDupes})` : humanDate

                group = {
                    key,
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

            /**
             * accumulate messages by the same user
             */
            if (isRoomMessage(event) || isEncryptedRoomMessage(event)) {
                if (fullyReadMarkerEventId === event.eventId) {
                    if (
                        // TODO: if we add readmarkers to more events than
                        // messages this should get refactored
                        !renderEvents.some(
                            (r) =>
                                r.type === RenderEventType.UserMessages ||
                                r.type === RenderEventType.Message ||
                                r.type === RenderEventType.RedactedMessage,
                        )
                    ) {
                        group.isNew = true
                        // show date as "new" since first message appears to be unread
                    } else {
                        renderEvents.push({
                            type: RenderEventType.NewDivider,
                            key: `newdivider-${event.eventId}`,
                        })
                    }
                }

                const prevEvent = renderEvents[renderEvents.length - 1]

                // - - - - - - - - - - - - - - - - - - - - - - - - inline thread updates

                if (!isThread && event.threadParentId && isRoomMessage(event)) {
                    // experimental feature to show thread updates inline
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
                    groupByUser &&
                    prevEvent &&
                    // keep messages grouped id they are from the same user
                    prevEvent.type === RenderEventType.UserMessages &&
                    prevEvent.events[0].sender.id === event.sender.id &&
                    // start new group if previous event is redacted
                    !prevEvent.events.at(prevEvent.events.length - 1)?.isRedacted &&
                    (index > 1 || !isThread)
                ) {
                    // - - - - - - - - - - - - - - -  add event to previous group
                    prevEvent.events.push(event)
                } else {
                    // - - - - - - - - - - - - - - -  create new group
                    renderEvents.push({
                        type: RenderEventType.UserMessages,
                        key: event.eventId,
                        events: [event],
                    })
                }
            } else if (isRoomMember(event) && channelType !== 'dm') {
                if (channelType === 'gdm' && event.content.membership === Membership.Join) {
                    return result
                }

                let accumulatedEvents = renderEvents.find(
                    (e) =>
                        e.type === RenderEventType.AccumulatedRoomMembers &&
                        e.membershipType === event.content.membership &&
                        // separate groups by who invited/added the user to
                        // channel for GDMs (e.g. x added y, y added x and z)
                        (channelType !== 'gdm' || e.events[0].sender.id === event.sender.id),
                ) as AccumulatedRoomMemberRenderEvent | undefined

                if (!accumulatedEvents) {
                    accumulatedEvents = {
                        type: RenderEventType.AccumulatedRoomMembers,
                        membershipType: event.content.membership,
                        key: event.eventId,
                        events: [],
                    }

                    renderEvents.push(accumulatedEvents)
                }

                renderEvents.forEach((e) => {
                    if (e.type === RenderEventType.AccumulatedRoomMembers) {
                        e.events = e.events.filter((e) => e.content.userId !== event.content.userId)
                    }
                })
                renderEvents.sort((a) =>
                    a.type === RenderEventType.AccumulatedRoomMembers
                        ? a.membershipType === Membership.Invite
                            ? -1
                            : 0
                        : 0,
                )

                accumulatedEvents.events.push(event)
            } else if (isRoomCreate(event)) {
                renderEvents.push({
                    type: RenderEventType.ChannelHeader,
                    key: `channel-header-${event.eventId}`,
                    event,
                })

                if (channelType !== 'dm') {
                    renderEvents.push({
                        type: RenderEventType.RoomCreate,
                        key: `room-create-${event.eventId}`,
                        event,
                    })
                }
            } else if (isRoomProperties(event)) {
                renderEvents.push({
                    type: RenderEventType.RoomProperties,
                    key: `room-properties-${event.eventId}`,
                    event,
                })
            }
            return result
        },
        {
            dateGroups: [] as DateGroup[],
        },
    )

    result.dateGroups = result.dateGroups.filter(
        (g) =>
            !!g.events.length &&
            // remove date groups that don't contain any messages (or only redacted messages)
            g.events.some(
                (e) =>
                    e.type === RenderEventType.ChannelHeader ||
                    e.type === RenderEventType.AccumulatedRoomMembers ||
                    e.type === RenderEventType.RoomProperties ||
                    (e.type === RenderEventType.UserMessages &&
                        // keep redacted messages with replies
                        !e.events.every((e) => e.isRedacted && !replyMap?.[e.eventId])),
            ),
    )

    // let status events always display right under the date for clarity
    // another model would be to group accumulate consecutive events for a very
    // active and granular timeline
    result.dateGroups.forEach((g) =>
        g.events.sort(
            firstBy((e: RenderEvent) => e.type !== RenderEventType.ChannelHeader)
                .thenBy((e: RenderEvent) => e.type !== RenderEventType.RoomCreate)
                .thenBy((e: RenderEvent) => e.type !== RenderEventType.AccumulatedRoomMembers),
        ),
    )

    return result.dateGroups
}
