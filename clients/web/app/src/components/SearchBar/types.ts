import { RoomMember } from 'use-zion-client'
import { SearchResult } from 'minisearch'
import { ZRoomMessageEvent } from '@components/MessageTimeline/util/getEventsByDate'
import { useChannelsWithMentionCountsAndUnread } from 'hooks/useChannelsWithMentionCountsAndUnread'

export type EventDocument =
    | MessageEventDocument
    | ChannelEventDocument
    | UserEventDocument
    | DMMessageEventDocument

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
