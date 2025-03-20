import { FullyReadMarker } from '@towns-protocol/proto'
import { Channel } from './towns-types'
import {
    ChannelMessageEvent,
    RiverTimelineEvent,
    TimelineEvent,
    TipEvent,
} from '@towns-protocol/sdk'

export interface ThreadStatsData {
    /// Thread Parent
    replyEventIds: Set<string>
    userIds: Set<string>
    latestTs: number
    parentId: string
    parentEvent?: TimelineEvent
    parentMessageContent?: ChannelMessageEvent
    isParticipating: boolean
}

export interface ThreadResult {
    type: 'thread'
    isNew: boolean
    isUnread: boolean
    fullyReadMarker?: FullyReadMarker
    thread: ThreadStatsData
    channel: Channel
    timestamp: number
}

export type MessageTipEvent = Omit<TimelineEvent, 'content'> & {
    content: TipEvent
}
// array of timeline events that all have content of type MemberBlockchainTransactionEvent
export type MessageTips = MessageTipEvent[]

export function isMessageTipEvent(event: TimelineEvent): event is MessageTipEvent {
    return (
        event.content?.kind === RiverTimelineEvent.TipEvent &&
        event.content.transaction?.content.case === 'tip'
    )
}
