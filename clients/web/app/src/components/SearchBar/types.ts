import { RoomMember } from 'use-zion-client'
import { SearchResult } from 'minisearch'
import { ZRoomMessageEvent } from '@components/MessageTimeline/util/getEventsByDate'
import { IconName } from '@ui'

export type EventDocument =
    | UserEventDocument
    | ChannelEventDocument
    | DmChannelEventDocument
    | MessageEventDocument
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

export type DmChannelEventDocument = {
    type: 'dmChannel'
    key: string
    body: string
    source: DmChannelType
}

export type UserEventDocument = {
    type: 'user'
    key: string
    body: string
    source: RoomMember
}

type ChannelType = {
    isJoined: boolean
    mentionCount: number
    unread: boolean
    muted: boolean
    id: string
    label: string
    private?: boolean | undefined
    highlight?: boolean | undefined
    topic?: string | undefined
}

type DmChannelType = {
    id: string
    label: string
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

export type CombinedResult = {
    searchResult: SearchResult
    item: EventDocument
}

export const isCombinedResultItem = (r: {
    searchResult: SearchResult
    item: EventDocument | undefined
}): r is CombinedResult => !!r.item
