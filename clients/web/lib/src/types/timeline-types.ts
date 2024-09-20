import {
    ChannelMessage_Post,
    ChannelMessage_Post_Attachment,
    ChunkedMedia_AESGCM,
    ChannelMessage_Post_Content_EmbeddedMessage_Info,
    ChannelMessage_Post_Content_EmbeddedMessage_StaticInfo,
    ChannelMessage_Post_Content_Image_Info,
    MediaInfo as MediaInfoStruct,
    ChannelOp,
    ChannelProperties,
    FullyReadMarker,
    MiniblockHeader,
    PayloadCaseType,
    SpacePayload_ChannelSettings,
} from '@river-build/proto'
import { PlainMessage } from '@bufbuild/protobuf'
import { Channel, Membership, Mention, MessageType } from './towns-types'
import { staticAssertNever } from '../utils/towns-utils'
import { DecryptionSessionError } from '@river-build/encryption'
import { isDefined } from '@river-build/sdk'
import { bin_toHexString } from '@river-build/dlog'

/**************************************************************************
 * We're using a union type to represent the different types of events that
 * can be received from the server.
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

// Towns Timeline Event
export enum ZTEvent {
    BlockchainTransaction = 'blockchain.transaction',
    MiniblockHeader = 'm.miniblockheader',
    Notice = 'm.notice',
    Reaction = 'm.reaction',
    Fulfillment = 'm.fulfillment',
    KeySolicitation = 'm.key_solicitation',
    Pin = 'm.pin',
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
    RoomMessageEncryptedWithRef = 'm.room.encrypted_with_ref',
    RoomMessageMissing = 'm.room.missing',
    RoomName = 'm.room.name',
    RoomProperties = 'm.room.properties',
    RoomTopic = 'm.room.topic',
    SpaceChild = 'm.space.child',
    SpaceUpdateAutojoin = 'm.space.update_autojoin',
    SpaceUpdateHideUserJoinLeaves = 'm.space.update_channel_hide_user_join_leaves',
    SpaceImage = 'm.space.image',
    SpaceParent = 'm.space.parent',
    SpaceUsername = 'm.space.username',
    SpaceDisplayName = 'm.space.display_name',
    SpaceEnsAddress = 'm.space.ens_name',
    SpaceNft = 'm.space.nft',
    Unpin = 'm.unpin',
}

/// a timeline event should have one or none of the following fields set
export type TimelineEvent_OneOf =
    | MiniblockHeaderEvent
    | NoticeEvent
    | ReactionEvent
    | FulfillmentEvent
    | KeySolicitationEvent
    | PinEvent
    | RedactedEvent
    | RedactionActionEvent
    | RoomCanonicalAliasEvent
    | RoomEncryptionEvent
    | RoomAvatarEvent
    | RoomCreateEvent
    | RoomMessageEncryptedEvent
    | RoomMessageMissingEvent
    | RoomMemberEvent
    | RoomMessageEvent
    | RoomNameEvent
    | RoomPropertiesEvent
    | RoomTopicEvent
    | SpaceChildEvent
    | SpaceUpdateAutojoinEvent
    | SpaceUpdateHideUserJoinLeavesEvent
    | SpaceImageEvent
    | SpaceParentEvent
    | SpaceUsernameEvent
    | SpaceDisplayNameEvent
    | SpaceEnsAddressEvent
    | SpaceNftEvent
    | RoomMessageEncryptedRefEvent
    | UnpinEvent

export interface MiniblockHeaderEvent {
    kind: ZTEvent.MiniblockHeader
    message: MiniblockHeader
}

export interface FulfillmentEvent {
    kind: ZTEvent.Fulfillment
    sessionIds: string[]
    deviceKey: string
    to: string
    from: string
}

export interface KeySolicitationEvent {
    kind: ZTEvent.KeySolicitation
    sessionIds: string[]
    deviceKey: string
    isNewDevice: boolean
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

export interface RoomPropertiesEvent {
    kind: ZTEvent.RoomProperties
    properties: ChannelProperties
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
    error?: DecryptionSessionError
}

export interface RoomMessageMissingEvent {
    kind: ZTEvent.RoomMessageMissing
    eventId: string
}

export interface RoomMemberEvent {
    kind: ZTEvent.RoomMember
    userId: string
    initiatorId: string
    membership: Membership
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

export interface SpaceEnsAddressEvent {
    kind: ZTEvent.SpaceEnsAddress
    userId: string
    ensAddress: Uint8Array
}

export interface SpaceNftEvent {
    kind: ZTEvent.SpaceNft
    userId: string
    contractAddress: string
    tokenId: string
    chainId: number
}

export interface PinEvent {
    kind: ZTEvent.Pin
    userId: string
    pinnedEventId: string
}

export interface UnpinEvent {
    kind: ZTEvent.Unpin
    userId: string
    unpinnedEventId: string
}

export interface RoomMessageEncryptedRefEvent {
    kind: ZTEvent.RoomMessageEncryptedWithRef
    refEventId: string
}

// mentions should always have a user id, but it's data over the wire
// and we can't guarantee that it will be there (we have issues in prod as i write this)
export type OTWMention = Omit<Mention, 'userId'> & { userId?: string }

export interface RoomMessageEventContent_Image {
    msgType: MessageType.Image
    info?:
        | ChannelMessage_Post_Content_Image_Info
        | PlainMessage<ChannelMessage_Post_Content_Image_Info>
    thumbnail?:
        | ChannelMessage_Post_Content_Image_Info
        | PlainMessage<ChannelMessage_Post_Content_Image_Info>
}

export interface RoomMessageEventContent_GM {
    msgType: MessageType.GM
    data?: Uint8Array
}

export interface RoomMessageEventContent_Text {
    msgType: MessageType.Text
}

export type RoomMessageEventContentOneOf =
    | RoomMessageEventContent_Image
    | RoomMessageEventContent_GM
    | RoomMessageEventContent_Text

export interface RoomMessageEvent {
    kind: ZTEvent.RoomMessage
    threadId?: string
    threadPreview?: string
    replyId?: string
    replyPreview?: string
    body: string
    mentions: OTWMention[]
    editsEventId?: string
    content: RoomMessageEventContentOneOf
    attachments?: Attachment[]
}

export interface RoomNameEvent {
    kind: ZTEvent.RoomName
    name: string
}

export interface RoomTopicEvent {
    kind: ZTEvent.RoomTopic
    topic: string
}

// original event: the event that was redacted
export interface RedactedEvent {
    kind: ZTEvent.RedactedEvent
    isAdminRedaction: boolean
}

// the event that redacted the original event
export interface RedactionActionEvent {
    kind: ZTEvent.RedactionActionEvent
    refEventId: string
    adminRedaction: boolean
}

export interface SpaceChildEvent {
    kind: ZTEvent.SpaceChild
    childId: string
    channelOp?: ChannelOp
    channelSettings?: SpacePayload_ChannelSettings
}

export interface SpaceUpdateAutojoinEvent {
    kind: ZTEvent.SpaceUpdateAutojoin
    channelId: string
    autojoin: boolean
}

export interface SpaceUpdateHideUserJoinLeavesEvent {
    kind: ZTEvent.SpaceUpdateHideUserJoinLeaves
    channelId: string
    hideUserJoinLeaves: boolean
}

export interface SpaceImageEvent {
    kind: ZTEvent.SpaceImage
}

export interface SpaceParentEvent {
    kind: ZTEvent.SpaceParent
    parentId: string
}

export interface TimelineEvent {
    eventId: string
    localEventId?: string // if this event was created locally and appended before addEvent, this will be set
    eventNum: bigint
    latestEventId: string // if a message was edited or deleted, this will be set to the latest event id
    latestEventNum: bigint // if a message was edited or deleted, this will be set to the latest event id
    status?: EventStatus
    createdAtEpochMs: number // created at times are generated client side, do not trust them
    updatedAtEpochMs?: number // updated at times are generated client side, do not trust them
    content?: TimelineEvent_OneOf
    fallbackContent: string
    isEncrypting: boolean // local only, isLocalPending should also be true
    isLocalPending: boolean /// true if we're waiting for the event to get sent back from the server
    isSendFailed: boolean
    confirmedEventNum?: bigint
    confirmedInBlockNum?: bigint
    threadParentId?: string
    replyParentId?: string
    reactionParentId?: string
    isMentioned: boolean
    isRedacted: boolean
    sender: {
        displayName: string
        avatarUrl?: string
        id: string
    }
    sessionId?: string
}

export interface TimelineEventConfirmation {
    eventId: string
    confirmedEventNum: bigint
    confirmedInBlockNum: bigint
}

export interface ThreadStats {
    /// Thread Parent
    replyEventIds: Set<string>
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

export interface IgnoredNoticeEvent {
    kind: ZTEvent.Notice
    message: string
    contentKind?: string
}

export type NoticeEvent = IgnoredNoticeEvent

export type MediaInfo = Pick<
    MediaInfoStruct,
    'filename' | 'mimetype' | 'sizeBytes' | 'widthPixels' | 'heightPixels'
>

export type ImageInfo = Pick<ChannelMessage_Post_Content_Image_Info, 'url' | 'width' | 'height'>

export type ImageAttachment = {
    type: 'image'
    info: ImageInfo
    id: string
}

export type ChunkedMediaAttachment = {
    type: 'chunked_media'
    streamId: string
    encryption: PlainMessage<ChunkedMedia_AESGCM>
    info: MediaInfo
    id: string
    thumbnail?: { content: Uint8Array; info: MediaInfo }
}

export type EmbeddedMediaAttachment = {
    type: 'embedded_media'
    info: MediaInfo
    content: Uint8Array
    id: string
}

export type EmbeddedMessageAttachment = {
    type: 'embedded_message'
    url: string
    post?: ChannelMessage_Post | PlainMessage<ChannelMessage_Post>
    roomMessageEvent?: RoomMessageEvent
    info: PlainMessage<ChannelMessage_Post_Content_EmbeddedMessage_Info>
    staticInfo?: PlainMessage<ChannelMessage_Post_Content_EmbeddedMessage_StaticInfo>
    id: string
}

export type UnfurledLinkAttachment = {
    type: 'unfurled_link'
    url: string
    description?: string
    title?: string
    image?: { height?: number; width?: number; url?: string }
    id: string
    info?: string
}

export type Attachment =
    | ImageAttachment
    | ChunkedMediaAttachment
    | EmbeddedMediaAttachment
    | EmbeddedMessageAttachment
    | UnfurledLinkAttachment

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
        case ZTEvent.RoomMember: {
            return `[${content.membership}] userId: ${content.userId} initiatorId: ${content.initiatorId}`
        }
        case ZTEvent.RoomMessage:
            return `${senderDisplayName}: ${content.body}`
        case ZTEvent.RoomName:
            return `newValue: ${content.name}`
        case ZTEvent.RoomProperties:
            return `properties: ${content.properties.name ?? ''} ${content.properties.topic ?? ''}`
        case ZTEvent.SpaceUsername:
            return `username: ${content.username}`
        case ZTEvent.SpaceDisplayName:
            return `username: ${content.displayName}`
        case ZTEvent.SpaceEnsAddress:
            return `ensAddress: ${bin_toHexString(content.ensAddress)}`
        case ZTEvent.SpaceNft:
            return `contractAddress: ${content.contractAddress}, tokenId: ${content.tokenId}, chainId: ${content.chainId}`
        case ZTEvent.RoomTopic:
            return `newValue: ${content.topic}`
        case ZTEvent.RedactedEvent:
            return `~Redacted~`
        case ZTEvent.RedactionActionEvent:
            return `Redacts ${content.refEventId} adminRedaction: ${content.adminRedaction}`
        case ZTEvent.SpaceChild:
            if (content.channelSettings !== undefined) {
                return `childId: ${content.childId} autojoin: ${content.channelSettings.autojoin} hideUserJoinLeaves: ${content.channelSettings.hideUserJoinLeaveEvents}`
            }
            return `childId: ${content.childId}`
        case ZTEvent.SpaceUpdateAutojoin:
            return `channelId: ${content.channelId} autojoin: ${content.autojoin}`
        case ZTEvent.SpaceUpdateHideUserJoinLeaves:
            return `channelId: ${content.channelId} hideUserJoinLeaves: ${content.hideUserJoinLeaves}`
        case ZTEvent.SpaceImage:
            return `SpaceImage`
        case ZTEvent.SpaceParent:
            return `parentId: ${content.parentId}`
        case ZTEvent.Notice:
            return `Notice: msgType: ${content.contentKind ?? 'unknown'}, message: ${
                content.message
            }`
        case ZTEvent.Fulfillment:
            return `Fulfillment sessionIds: ${
                content.sessionIds.length ? content.sessionIds.join(',') : 'forNewDevice: true'
            }, from: ${content.from} to: ${content.deviceKey}`
        case ZTEvent.KeySolicitation:
            if (content.isNewDevice) {
                return `KeySolicitation deviceKey: ${content.deviceKey}, newDevice: true`
            }
            return `KeySolicitation deviceKey: ${content.deviceKey} sessionIds: ${content.sessionIds.length}`
        case ZTEvent.RoomMessageMissing:
            return `eventId: ${content.eventId}`
        case ZTEvent.RoomMessageEncryptedWithRef:
            return `refEventId: ${content.refEventId}`
        case ZTEvent.Pin:
            return `pinnedEventId: ${content.pinnedEventId} by: ${content.userId}`
        case ZTEvent.Unpin:
            return `unpinnedEventId: ${content.unpinnedEventId} by: ${content.userId}`
        default:
            staticAssertNever(content)
    }
}

export function transformAttachments(attachments?: Attachment[]): ChannelMessage_Post_Attachment[] {
    if (!attachments) {
        return []
    }

    return attachments
        .map((attachment) => {
            switch (attachment.type) {
                case 'chunked_media':
                    return new ChannelMessage_Post_Attachment({
                        content: {
                            case: 'chunkedMedia',
                            value: {
                                info: attachment.info,
                                streamId: attachment.streamId,
                                encryption: {
                                    case: 'aesgcm',
                                    value: attachment.encryption,
                                },
                                thumbnail: {
                                    info: attachment.thumbnail?.info,
                                    content: attachment.thumbnail?.content,
                                },
                            },
                        },
                    })

                case 'embedded_media':
                    return new ChannelMessage_Post_Attachment({
                        content: {
                            case: 'embeddedMedia',
                            value: {
                                info: attachment.info,
                                content: attachment.content,
                            },
                        },
                    })
                case 'image':
                    return new ChannelMessage_Post_Attachment({
                        content: {
                            case: 'image',
                            value: {
                                info: attachment.info,
                            },
                        },
                    })
                case 'embedded_message': {
                    const { roomMessageEvent, ...content } = attachment
                    if (!roomMessageEvent) {
                        return
                    }
                    const post = new ChannelMessage_Post({
                        threadId: roomMessageEvent.threadId,
                        threadPreview: roomMessageEvent.threadPreview,
                        content: {
                            case: 'text' as const,
                            value: {
                                ...roomMessageEvent,
                                attachments: transformAttachments(roomMessageEvent.attachments),
                            },
                        },
                    })
                    const value = new ChannelMessage_Post_Attachment({
                        content: {
                            case: 'embeddedMessage',
                            value: {
                                ...content,
                                post,
                            },
                        },
                    })
                    return value
                }
                case 'unfurled_link':
                    return new ChannelMessage_Post_Attachment({
                        content: {
                            case: 'unfurledUrl',
                            value: {
                                url: attachment.url,
                                title: attachment.title,
                                description: attachment.description,
                                image: attachment.image
                                    ? {
                                          height: attachment.image.height,
                                          width: attachment.image.width,
                                          url: attachment.image.url,
                                      }
                                    : undefined,
                            },
                        },
                    })
                //
                default:
                    return undefined
            }
        })
        .filter(isDefined)
}
