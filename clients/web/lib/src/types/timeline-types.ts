import {
    EventType as MatrixEventType,
    HistoryVisibility,
    IContent,
    JoinRule,
    RestrictedAllowType,
} from 'matrix-js-sdk'
import { Channel, Membership, PowerLevels, RoomIdentifier } from './matrix-types'

/**************************************************************************
 * We're using a union type to represent the different types of events that
 * can be received from the Matrix server.
 * you can read about union types
 * here: https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html
 * and here: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types
 **************************************************************************/

// Zion Timeline Event
export enum ZTEvent {
    Reaction = 'm.reaction',
    RoomAvatar = 'm.room.avatar',
    RoomCanonicalAlias = 'm.room.canonical_alias',
    RoomCreate = 'm.room.create',
    RoomHistoryVisibility = 'm.room.history_visibility',
    RoomJoinRules = 'm.room.join_rules',
    RoomMember = 'm.room.member',
    RoomMessage = 'm.room.message',
    RoomMessageEncrypted = 'm.room.encrypted',
    RoomName = 'm.room.name',
    RoomPowerLevels = 'm.room.power_levels',
    RoomRedaction = 'm.room.redaction',
    SpaceChild = 'm.space.child',
    SpaceParent = 'm.space.parent',
}

/// a timeline event should have one or none of the following fields set
export type TimelineEvent_OneOf =
    | ReactionEvent
    | RoomCanonicalAliasEvent
    | RoomHistoryVisibilityEvent
    | RoomJoinRulesEvent
    | RoomAvatarEvent
    | RoomCreateEvent
    | RoomMessageEncryptedEvent
    | RoomMemberEvent
    | RoomMessageEvent
    | RoomNameEvent
    | RoomRedactionEvent
    | RoomPowerLevelsEvent
    | SpaceChildEvent
    | SpaceParentEvent

// NOTE this is an inexhaustive list, see https://spec.matrix.org/v1.2/client-server-api/#server-behaviour-16
// and https://spec.matrix.org/v1.2/client-server-api/#stripped-state

export interface ReactionEvent {
    kind: ZTEvent.Reaction
    sender: {
        displayName: string
        avatarUrl?: string
        id: string
    }
    targetEventId: string
    reaction: string
}

export interface RoomAvatarEvent {
    kind: ZTEvent.RoomAvatar
    url?: string
    // NOTE spec includes an info field
}

export interface RoomCanonicalAliasEvent {
    kind: ZTEvent.RoomCanonicalAlias
    alias: string
    altAliases?: string[]
}

export interface RoomCreateEvent {
    kind: ZTEvent.RoomCreate
    creator: string
    predecessor?: { event_id: string; room_id: string }
    type?: string
}

export interface RoomMessageEncryptedEvent {
    kind: ZTEvent.RoomMessageEncrypted
}

export interface RoomHistoryVisibilityEvent {
    kind: ZTEvent.RoomHistoryVisibility
    historyVisibility: HistoryVisibility
}

export interface RoomJoinRulesEvent {
    kind: ZTEvent.RoomJoinRules
    joinRule: JoinRule
    allow?: { room_id: string; type: RestrictedAllowType }[]
}

export interface RoomMemberEvent {
    kind: ZTEvent.RoomMember
    userId: string
    avatarUrl?: string
    displayName?: string
    isDirect: boolean
    membership: Membership
    reason?: string
}

export interface RoomMessageEvent {
    kind: ZTEvent.RoomMessage
    sender: {
        displayName: string
        avatarUrl?: string
        id: string
    }
    inReplyTo?: string
    body: string
    msgType: string
    content: IContent // room messages have lots of representations
}

export interface RoomNameEvent {
    kind: ZTEvent.RoomName
    name: string
}

export interface RoomPowerLevelsEvent extends PowerLevels {
    kind: ZTEvent.RoomPowerLevels
}

export interface RoomRedactionEvent {
    kind: ZTEvent.RoomRedaction
    sender: {
        displayName: string
        avatarUrl?: string
        id: string
    }
    inReplyTo?: string
    content: IContent // room messages have lots of representations
}

export interface SpaceChildEvent {
    kind: ZTEvent.SpaceChild
    childId: string
}

export interface SpaceParentEvent {
    kind: ZTEvent.SpaceParent
    parentId: string
}

export interface TimelineEvent {
    eventId: string
    eventType: MatrixEventType | string
    originServerTs: number
    updatedServerTs?: number
    content?: TimelineEvent_OneOf
    fallbackContent: string
    isLocalPending: boolean /// true if we're waiting for the event to get sent back from the server
    threadParentId?: string
    reactionParentId?: string
}

export interface ThreadStats {
    /// Thread Parent
    replyCount: number
    userIds: Set<string>
    latestTs: number
    parentId: string
    parentEvent?: TimelineEvent
    parentMessageContent?: RoomMessageEvent
    isParticipating: boolean
}

export interface ThreadResult {
    type: 'thread'
    isNew: boolean
    isUnread: boolean
    fullyReadMarker?: FullyReadMarker
    thread: ThreadStats
    channel: Channel
    timestamp: number
}

/// MessageReactions: { reactionName: { userId: { eventId: string } } }
export type MessageReactions = Record<string, Record<string, { eventId: string }>>

export interface FullyReadMarker {
    channelId: RoomIdentifier
    threadParentId?: string
    eventId: string
    isUnread: boolean
    markedUnreadAtTs: number
    markedReadAtTs: number
    isParticipating: boolean // true for all channels, any threads started or replied to
    // possible future extensions
    // muted: boolean
    // mentions: number
}
