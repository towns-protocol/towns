import { firstBy } from 'thenby'
import { ChannelData } from 'use-towns-client'
import {
    Attachment,
    ChannelMessageEncryptedEvent,
    ChannelMessageEvent,
    ChannelMessageMissingEvent,
    ChannelPropertiesEvent,
    InceptionEvent,
    Membership,
    RedactedEvent,
    RiverTimelineEvent,
    StreamMembershipEvent,
    ThreadStatsData,
    TimelineEvent,
    TokenTransferEvent,
} from '@river-build/sdk'
import { ExperimentsState } from 'store/experimentsStore'
import { MINUTE_MS } from 'data/constants'

export enum RenderEventType {
    UserMessages = 'UserMessages',
    Message = 'Message',
    EncryptedMessage = 'EncryptedMessage',
    RedactedMessage = 'RedactedMessage',
    MissingMessage = 'MissingMessage',
    StreamMember = 'StreamMember',
    AccumulatedStreamMembers = 'AccumulatedStreamMembers',
    Inception = 'Inception',
    ChannelHeader = 'ChannelHeader',
    NewDivider = 'NewDivider',
    ThreadUpdate = 'ThreadUpdate',
    TokenTransfer = 'TokenTransfer',
    ChannelProperties = 'ChannelProperties',
}

interface BaseEvent {
    type: RenderEventType
}

export type ZChannelMessageEvent = Omit<TimelineEvent, 'content'> & {
    content: ChannelMessageEvent
    isRedacted: false
}

export type ZChannelMessageEncryptedEvent = Omit<TimelineEvent, 'content'> & {
    content: ChannelMessageEncryptedEvent
    isRedacted: false
}

export type ZChannelMessageRedactedEvent = Omit<TimelineEvent, 'content'> & {
    content: RedactedEvent
    isRedacted: true
}

export type ZRoomMissingMessageEvent = Omit<TimelineEvent, 'content'> & {
    content: ChannelMessageMissingEvent
    isRedacted: false
}

export type ZStreamMembershipEvent = Omit<TimelineEvent, 'content'> & {
    content: StreamMembershipEvent
}

export type ZTokenTransferEvent = Omit<TimelineEvent, 'content'> & {
    content: TokenTransferEvent
}

export type ZInceptionEvent = Omit<TimelineEvent, 'content'> & { content: InceptionEvent }

export type ZChannelPropertiesEvent = Omit<TimelineEvent, 'content'> & {
    content: ChannelPropertiesEvent
}

export interface UserMessagesRenderEvent extends BaseEvent {
    type: RenderEventType.UserMessages
    key: string
    events: (
        | ZChannelMessageEvent
        | ZChannelMessageEncryptedEvent
        | ZChannelMessageRedactedEvent
        | ZRoomMissingMessageEvent
    )[]
}

export interface MessageRenderEvent extends BaseEvent {
    type: RenderEventType.Message
    key: string
    event: ZChannelMessageEvent
    displayContext: 'single' | 'head' | 'body' | 'tail'
    isHighlight?: boolean
    attachments?: Attachment[]
}

export interface EncryptedMessageRenderEvent extends BaseEvent {
    type: RenderEventType.EncryptedMessage
    key: string
    event: ZChannelMessageEncryptedEvent
    displayContext: 'single' | 'head' | 'body' | 'tail'
}

export interface RedactedMessageRenderEvent extends BaseEvent {
    type: RenderEventType.RedactedMessage
    key: string
    event: ZChannelMessageRedactedEvent
    displayContext: 'single' | 'head' | 'body' | 'tail'
}

export interface MissingMessageRenderEvent extends BaseEvent {
    type: RenderEventType.MissingMessage
    key: string
    event: ZRoomMissingMessageEvent
    displayContext: 'single' | 'head' | 'body' | 'tail'
}

export interface StreamMemberRenderEvent extends BaseEvent {
    type: RenderEventType.StreamMember
    key: string
    event: ZStreamMembershipEvent
}

export interface AccumulatedStreamMemberRenderEvent extends BaseEvent {
    type: RenderEventType.AccumulatedStreamMembers
    membershipType: Membership
    key: string
    events: ZStreamMembershipEvent[]
}

export interface ChannelHeaderRenderEvent extends BaseEvent {
    type: RenderEventType.ChannelHeader
    key: string
    event: ZInceptionEvent
}

export interface RoomCreateRenderEvent extends BaseEvent {
    type: RenderEventType.Inception
    key: string
    event: ZInceptionEvent
}

export interface RoomPropertiesRenderEvent extends BaseEvent {
    type: RenderEventType.ChannelProperties
    key: string
    event: ZChannelPropertiesEvent
}

export interface NewDividerRenderEvent extends BaseEvent {
    type: RenderEventType.NewDivider
    key: string
}

export interface ThreadUpdateRenderEvent extends BaseEvent {
    type: RenderEventType.ThreadUpdate
    key: string
    events: ZChannelMessageEvent[]
}

export interface TokenTransferRenderEvent extends BaseEvent {
    type: RenderEventType.TokenTransfer
    key: string
    event: ZTokenTransferEvent
}

const isInception = (event: TimelineEvent): event is ZInceptionEvent => {
    return event.content?.kind === RiverTimelineEvent.Inception
}

const isChannelProperties = (event: TimelineEvent): event is ZChannelPropertiesEvent => {
    return event.content?.kind === RiverTimelineEvent.ChannelProperties
}

export const isChannelMessage = (event: TimelineEvent): event is ZChannelMessageEvent => {
    return event.content?.kind === RiverTimelineEvent.ChannelMessage
}

export const isRedactedChannelMessage = (
    event: TimelineEvent,
): event is ZChannelMessageRedactedEvent => {
    return event.isRedacted
}

export const isEncryptedChannelMessage = (
    event: TimelineEvent,
): event is ZChannelMessageEncryptedEvent => {
    return event.content?.kind === RiverTimelineEvent.ChannelMessageEncrypted
}

export const isMissingMessage = (event: TimelineEvent): event is ZRoomMissingMessageEvent => {
    return event.content?.kind === RiverTimelineEvent.ChannelMessageMissing
}

const isStreamMembership = (event: TimelineEvent): event is ZStreamMembershipEvent => {
    return event.content?.kind === RiverTimelineEvent.StreamMembership
}

export const isTokenTransfer = (event: TimelineEvent): event is ZTokenTransferEvent => {
    return event.content?.kind === RiverTimelineEvent.TokenTransfer
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
    | AccumulatedStreamMemberRenderEvent
    | ChannelHeaderRenderEvent
    | EncryptedMessageRenderEvent
    | MissingMessageRenderEvent
    | NewDividerRenderEvent
    | MessageRenderEvent
    | RedactedMessageRenderEvent
    | RoomCreateRenderEvent
    | StreamMemberRenderEvent
    | ThreadUpdateRenderEvent
    | UserMessagesRenderEvent
    | RoomPropertiesRenderEvent
    | TokenTransferRenderEvent

const DEBUG_NO_GROUP_BY_USER = false

const createRelativeDateUtil = () => {
    const isSameDay = (date1: Date, date2: Date) => {
        return (
            date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate()
        )
    }

    const getRelativeDays = (date: Date) => {
        const today = new Date()
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)

        if (isSameDay(date, today)) {
            return 'Today'
        } else if (isSameDay(date, yesterday)) {
            return 'Yesterday'
        } else {
            return date.toDateString().replace(/20[0-9]{2}$/, '')
        }
    }
    return {
        getRelativeDays,
    }
}

export const getEventsByDate = (
    events: TimelineEvent[],
    channelType: 'channel' | 'dm' | 'gdm',
    channelData: ChannelData,
    fullyReadMarkerEventId?: string,
    isThread?: boolean,
    replyMap?: Record<string, ThreadStatsData>,
    experiments?: ExperimentsState,
    groupByUser: boolean = DEBUG_NO_GROUP_BY_USER,
    inlinedReplies: boolean = true,
) => {
    const { getRelativeDays } = createRelativeDateUtil()

    const result = events.reduce(
        (result, event: TimelineEvent, index) => {
            const { dateGroups } = result

            let group = dateGroups[dateGroups.length - 1]
            const prevDate = group?.date.humanDate
            const date = new Date(event.createdAtEpochMs)
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
            if (
                isChannelMessage(event) ||
                isEncryptedChannelMessage(event) ||
                isMissingMessage(event)
            ) {
                if (!isThread && event.threadParentId) {
                    // skip messages from threads if not applicable
                    return result
                }
                if (!inlinedReplies && event.replyParentId) {
                    // skip inline replies if not applicable
                    return result
                }
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

                const userGroup =
                    groupByUser &&
                    (!isThread || index > 1) &&
                    canGroupWithPrevMessage(prevEvent, event, inlinedReplies)

                if (userGroup) {
                    // add event to previous group
                    prevEvent?.events?.push(event)
                } else {
                    // create new group
                    renderEvents.push({
                        type: RenderEventType.UserMessages,
                        key: event.eventId,
                        events: [event],
                    })
                }
            } else if (
                isStreamMembership(event) &&
                channelType !== 'dm' &&
                !channelData.channel?.hideUserJoinLeaveEvents
            ) {
                let accumulatedEvents = renderEvents.find(
                    (e) =>
                        e.type === RenderEventType.AccumulatedStreamMembers &&
                        e.membershipType === event.content.membership &&
                        // separate groups by who invited/added the user to
                        // channel for GDMs (e.g. x added y, y added x and z)
                        (channelType !== 'gdm' || e.events[0]?.sender.id === event.sender.id),
                ) as AccumulatedStreamMemberRenderEvent | undefined

                if (!accumulatedEvents) {
                    accumulatedEvents = {
                        type: RenderEventType.AccumulatedStreamMembers,
                        membershipType: event.content.membership,
                        key: event.eventId,
                        events: [],
                    }

                    renderEvents.push(accumulatedEvents)
                }

                renderEvents.sort((a) =>
                    a.type === RenderEventType.AccumulatedStreamMembers
                        ? a.membershipType === Membership.Invite
                            ? -1
                            : 0
                        : 0,
                )

                accumulatedEvents.events.push(event)
            } else if (isInception(event)) {
                renderEvents.push({
                    type: RenderEventType.ChannelHeader,
                    key: `channel-header-${event.eventId}`,
                    event,
                })

                if (channelType !== 'dm') {
                    renderEvents.push({
                        type: RenderEventType.Inception,
                        key: `room-create-${event.eventId}`,
                        event,
                    })
                }
            } else if (isChannelProperties(event)) {
                renderEvents.push({
                    type: RenderEventType.ChannelProperties,
                    key: `room-properties-${event.eventId}`,
                    event,
                })
            } else if (isTokenTransfer(event)) {
                if (!isThread && event.threadParentId) {
                    // skip messages from threads if not applicable
                    return result
                }
                renderEvents.push({
                    type: RenderEventType.TokenTransfer,
                    key: `token-transfer-${event.eventId}`,
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
                    e.type === RenderEventType.AccumulatedStreamMembers ||
                    e.type === RenderEventType.ChannelProperties ||
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
                .thenBy((e: RenderEvent) => e.type !== RenderEventType.Inception)
                .thenBy((e: RenderEvent) => e.type !== RenderEventType.AccumulatedStreamMembers),
        ),
    )

    return result.dateGroups
}

function canGroupWithPrevMessage(
    prevEvent: RenderEvent,
    event: TimelineEvent,
    inlinedReplies: boolean,
): prevEvent is UserMessagesRenderEvent {
    const prevMessage =
        prevEvent?.type === RenderEventType.UserMessages &&
        prevEvent?.events?.at(prevEvent.events.length - 1)

    if (!prevMessage) {
        return false
    }
    if (inlinedReplies && event.replyParentId) {
        // isolate replies containing the quoted parent message
        return false
    }

    // preconditions: only group messages by same user
    let p: boolean = prevMessage.sender.id === event.sender.id
    // only group messages that are not redacted
    p = p && !prevMessage.isRedacted
    // only group messages that are close enough in time
    p = p && event.createdAtEpochMs - prevMessage.createdAtEpochMs < MINUTE_MS * 10

    return p
}
