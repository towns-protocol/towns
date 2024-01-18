import { RoomMember } from 'use-zion-client'
import { SearchResult } from 'minisearch'
import { ZRoomMessageEvent } from '@components/MessageTimeline/util/getEventsByDate'
import { useChannelsWithMentionCountsAndUnread } from 'hooks/useChannelsWithMentionCountsAndUnread'
import { IconName } from '@ui'

export type EventDocument =
    | MessageEventDocument
    | ChannelEventDocument
    | UserEventDocument
    | DMMessageEventDocument
    | ActionEventDocument

export type MessageEventDocument = {
    type: 'message'
    key: string
    channelId: string
    body: string
    source: ZRoomMessageEvent
}

export type DMMessageEventDocument = {
    type: 'dmMessage'
    key: string
    channelId: string
    body: string
    source: ZRoomMessageEvent
}

export type ChannelEventDocument = {
    type: 'channel'
    key: string
    body: string
    source: ChannelType
}

export type UserEventDocument = {
    type: 'user'
    key: string
    body: string
    source: RoomMember
}

export type ActionEventDocument = {
    type: 'action'
    key: string
    body: string
    source: {
        icon: IconName
        label: string
        callback: () => void
    }
}

type ChannelType = ReturnType<
    typeof useChannelsWithMentionCountsAndUnread
>['channelsWithMentionCountsAndUnread'][0]

export type CombinedResult = {
    searchResult: SearchResult
    item: EventDocument
}

export const isCombinedResultItem = (r: {
    searchResult: SearchResult
    item: EventDocument | undefined
}): r is CombinedResult => !!r.item
