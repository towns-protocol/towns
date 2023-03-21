import { HistoryVisibility, IContent, JoinRule, RestrictedAllowType } from 'matrix-js-sdk'
import { Channel, Membership, Mention, PowerLevels } from './zion-types'
import { RoomIdentifier } from './room-identifier'
import { BlockchainTransaction } from './web3-types'

/**************************************************************************
 * We're using a union type to represent the different types of events that
 * can be received from the Matrix server.
 * you can read about union types
 * here: https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html
 * and here: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types
 **************************************************************************/

export enum EventStatus {
    /** The event was not sent and will no longer be retried. */
    NOT_SENT = 'not_sent',
    /** The message is being encrypted */
    ENCRYPTING = 'encrypting',
    /** The event is in the process of being sent. */
    SENDING = 'sending',
    /** The event is in a queue waiting to be sent. */
    QUEUED = 'queued',
    /** The event has been sent to the server, but we have not yet received the echo. */
    SENT = 'sent',
    /** The event was cancelled before it was successfully sent. */
    CANCELLED = 'cancelled',
}

// Zion Timeline Event
export enum ZTEvent {
    Reaction = 'm.reaction',
    RoomAvatar = 'm.room.avatar',
    RoomCanonicalAlias = 'm.room.canonical_alias',
    RoomCreate = 'm.room.create',
    RoomEncryption = 'm.room.encryption',
    RoomHistoryVisibility = 'm.room.history_visibility',
    RoomJoinRules = 'm.room.join_rules',
    RoomMember = 'm.room.member',
    RoomMessage = 'm.room.message',
    RoomMessageEncrypted = 'm.room.encrypted',
    RoomName = 'm.room.name',
    RoomPowerLevels = 'm.room.power_levels',
    RoomRedaction = 'm.room.redaction',
    RoomTopic = 'm.room.topic',
    SpaceChild = 'm.space.child',
    SpaceParent = 'm.space.parent',
    BlockchainTransaction = 'blockchain.transaction',
}

/// a timeline event should have one or none of the following fields set
export type TimelineEvent_OneOf =
    | ReactionEvent
    | RoomCanonicalAliasEvent
    | RoomEncryptionEvent
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
    | RoomTopicEvent
    | SpaceChildEvent
    | SpaceParentEvent
    | BlockchainTransactionEvent

// NOTE this is an inexhaustive list, see https://spec.matrix.org/v1.2/client-server-api/#server-behaviour-16
// and https://spec.matrix.org/v1.2/client-server-api/#stripped-state

export interface ReactionEvent {
    kind: ZTEvent.Reaction
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

export interface RoomEncryptionEvent {
    kind: ZTEvent.RoomEncryption
    roomEncryption: {
        algorithm: string
        rotationPeriodMs?: number
        rotationPeriodMsgs?: number
    }
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
    inReplyTo?: string
    body: string
    msgType: string
    mentions: Mention[]
    replacedMsgId?: string
    content: IContent // room messages have lots of representations
    wireContent: IContent
}

export interface RoomNameEvent {
    kind: ZTEvent.RoomName
    name: string
}

export interface RoomTopicEvent {
    kind: ZTEvent.RoomTopic
    topic: string
}

export interface RoomPowerLevelsEvent extends PowerLevels {
    kind: ZTEvent.RoomPowerLevels
}

export interface RoomRedactionEvent {
    kind: ZTEvent.RoomRedaction
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
    status?: EventStatus
    originServerTs: number
    updatedServerTs?: number
    content?: TimelineEvent_OneOf
    fallbackContent: string
    isLocalPending: boolean /// true if we're waiting for the event to get sent back from the server
    threadParentId?: string
    reactionParentId?: string
    isMentioned: boolean
    sender: {
        displayName: string
        avatarUrl?: string
        id: string
    }
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

export type MentionResult = {
    type: 'mention'
    unread: boolean
    channel: Channel
    timestamp: number
    event: TimelineEvent
    thread?: TimelineEvent
}

export interface FullyReadMarker {
    channelId: RoomIdentifier
    threadParentId?: string
    eventId: string
    eventOriginServerTs: number
    isUnread: boolean
    markedUnreadAtTs: number
    markedReadAtTs: number
    mentions: number
    // possible future extensions
    // muted: boolean
}

export interface BlockchainTransactionEvent {
    kind: ZTEvent.BlockchainTransaction
    content: BlockchainTransaction
}
