import { HistoryVisibility, IContent, JoinRule, RestrictedAllowType } from 'matrix-js-sdk'
import { ChannelOp, FullyReadMarker, MiniblockHeader, PayloadCaseType } from '@river/proto'
import { Channel, Membership, Mention, PowerLevels } from './zion-types'
import { BlockchainTransaction } from './web3-types'
import { staticAssertNever } from '../utils/zion-utils'

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
    BlockchainTransaction = 'blockchain.transaction',
    MiniblockHeader = 'm.miniblockheader',
    Notice = 'm.notice',
    Reaction = 'm.reaction',
    Fulfillment = 'm.fulfillment',
    KeySolicitation = 'm.key_solicitation',
    RedactedEvent = 'm.redacted_event',
    RedactionActionEvent = 'm.redaction_action',
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
    RoomTopic = 'm.room.topic',
    SpaceChild = 'm.space.child',
    SpaceParent = 'm.space.parent',
    SpaceUsername = 'm.space.username',
    SpaceDisplayName = 'm.space.display_name',
}

/// a timeline event should have one or none of the following fields set
export type TimelineEvent_OneOf =
    | MiniblockHeaderEvent
    | NoticeEvent
    | ReactionEvent
    | FulfillmentEvent
    | KeySolicitationEvent
    | RedactedEvent
    | RedactionActionEvent
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
    | RoomPowerLevelsEvent
    | RoomTopicEvent
    | SpaceChildEvent
    | SpaceParentEvent
    | SpaceUsernameEvent
    | SpaceDisplayNameEvent

// NOTE this is an inexhaustive list, see https://spec.matrix.org/v1.2/client-server-api/#server-behaviour-16
// and https://spec.matrix.org/v1.2/client-server-api/#stripped-state

export interface MiniblockHeaderEvent {
    kind: ZTEvent.MiniblockHeader
    message: MiniblockHeader
}

export interface FulfillmentEvent {
    kind: ZTEvent.Fulfillment
    sessionId: string
    originEventHash: string
    algorithm?: string
}

export interface KeySolicitationEvent {
    kind: ZTEvent.KeySolicitation
    sessionId: string
    senderKey: string
}

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
    type?: PayloadCaseType
    spaceId?: string // valid on casablanca channel streams
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
    isDirect?: boolean
    membership: Membership
    reason?: string
    streamId?: string // in a case of an invitation to a channel with a streamId
}

export interface SpaceUsernameEvent {
    kind: ZTEvent.SpaceUsername
    userId: string
    username: string
}

export interface SpaceDisplayNameEvent {
    kind: ZTEvent.SpaceDisplayName
    userId: string
    displayName: string
}

// mentions should always have a user id, but it's data over the wire
// and we can't guarantee that it will be there (we have issues in prod as i write this)
export type OTWMention = Omit<Mention, 'userId'> & { userId?: string }

export interface RoomMessageEvent {
    kind: ZTEvent.RoomMessage
    inReplyTo?: string
    threadPreview?: string
    body: string
    msgType: string
    mentions: OTWMention[]
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

// original event: the event that was redacted
export interface RedactedEvent {
    kind: ZTEvent.RedactedEvent
}

// the event that redacted the original event
export interface RedactionActionEvent {
    kind: ZTEvent.RedactionActionEvent
    refEventId: string
}

export interface SpaceChildEvent {
    kind: ZTEvent.SpaceChild
    childId: string
    channelOp?: ChannelOp
}

export interface SpaceParentEvent {
    kind: ZTEvent.SpaceParent
    parentId: string
}

export interface TimelineEvent {
    eventId: string
    eventNum: bigint
    status?: EventStatus
    createdAtEpocMs: number // created at times are generated client side, do not trust them
    updatedAtEpocMs?: number // updated at times are generated client side, do not trust them
    content?: TimelineEvent_OneOf
    fallbackContent: string
    isLocalPending: boolean /// true if we're waiting for the event to get sent back from the server
    threadParentId?: string
    reactionParentId?: string
    isMentioned: boolean
    isRedacted: boolean
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

export interface BlockchainTransactionEvent {
    kind: ZTEvent.BlockchainTransaction
    inReplyTo?: string
    threadPreview?: string
    content: BlockchainTransaction
}

export interface IgnoredNoticeEvent {
    kind: ZTEvent.Notice
    message: string
    contentKind?: string
}

export type NoticeEvent = BlockchainTransactionEvent | IgnoredNoticeEvent

export function getFallbackContent(
    senderDisplayName: string,
    content?: TimelineEvent_OneOf,
    error?: string,
): string {
    if (error) {
        return error
    }
    if (!content) {
        throw new Error('Either content or error should be defined')
    }
    switch (content.kind) {
        case ZTEvent.MiniblockHeader:
            return `Miniblock miniblockNum:${content.message.miniblockNum}, hasSnapshot:${(content
                .message.snapshot
                ? true
                : false
            ).toString()}`
        case ZTEvent.Reaction:
            return `${senderDisplayName} reacted with ${content.reaction} to ${content.targetEventId}`
        case ZTEvent.RoomAvatar:
            return `url: ${content.url ?? 'undefined'}`
        case ZTEvent.RoomCanonicalAlias: {
            const alt = (content.altAliases ?? []).join(', ')
            return `alias: ${content.alias}, alt alaises: ${alt}`
        }
        case ZTEvent.RoomCreate:
            return content.type ? `type: ${content.type}` : ''
        case ZTEvent.RoomEncryption:
            return `algorithm: ${content.roomEncryption.algorithm} rotationMs: ${
                content.roomEncryption.rotationPeriodMs?.toString() ?? 'N/A'
            } rotationMsgs: ${content.roomEncryption.rotationPeriodMsgs?.toString() ?? 'N/A'}`
        case ZTEvent.RoomMessageEncrypted:
            return `Decrypting...`
        case ZTEvent.RoomHistoryVisibility:
            return `newValue: ${content.historyVisibility}`
        case ZTEvent.RoomJoinRules:
            return `newValue: ${content.joinRule}`
        case ZTEvent.RoomMember: {
            const name = content.displayName ?? content.userId
            const avatar = content.avatarUrl ?? 'none'
            return `[${content.membership}] name: ${name} avatar: ${avatar}`
        }
        case ZTEvent.RoomMessage:
            return `${senderDisplayName}: ${content.body}`
        case ZTEvent.RoomName:
            return `newValue: ${content.name}`
        case ZTEvent.SpaceUsername:
            return `username: ${content.username}`
        case ZTEvent.SpaceDisplayName:
            return `username: ${content.displayName}`
        case ZTEvent.RoomTopic:
            return `newValue: ${content.topic}`
        case ZTEvent.RedactedEvent:
            return `~Redacted~`
        case ZTEvent.RedactionActionEvent:
            return `Redacts ${content.refEventId}`
        case ZTEvent.RoomPowerLevels:
            return `${content.kind}`
        case ZTEvent.SpaceChild:
            return `childId: ${content.childId}`
        case ZTEvent.SpaceParent:
            return `parentId: ${content.parentId}`
        case ZTEvent.BlockchainTransaction:
            return `blockchainTransaction: ${content.content.hash}`
        case ZTEvent.Notice:
            return `Notice: { msgType: ${content.contentKind ?? 'unknown'}, message: ${
                content.message
            } }`
        case ZTEvent.Fulfillment:
            return `Fulfillment: { sessionId: ${content.sessionId}, originEventHash: ${content.originEventHash} }`
        case ZTEvent.KeySolicitation:
            return `KeySolicitation { sessionId: ${content.sessionId}, senderKey: ${content.senderKey} }`
        default:
            staticAssertNever(content)
    }
}
