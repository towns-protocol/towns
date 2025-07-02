import {
    type ChannelMessage_Post_Content_EmbeddedMessage_StaticInfo,
    type ChannelMessage_Post,
    type ChannelMessage_Post_Content_EmbeddedMessage_Info,
    type FullyReadMarker,
    type ChunkedMedia_AESGCM,
    type ChannelMessage_Post_Content_Image_Info,
    type MediaInfo as MediaInfoStruct,
    type PayloadCaseType,
    type ChannelOp,
    type SpacePayload_ChannelSettings,
    type ChannelProperties,
    type BlockchainTransaction,
    type UserPayload_ReceivedBlockchainTransaction,
    type BlockchainTransaction_Tip,
    type BlockchainTransaction_SpaceReview_Action,
    type BlockchainTransaction_TokenTransfer,
    type PlainMessage,
    ChannelMessage_Post_AttachmentSchema,
    ChannelMessage_Post_Attachment,
    ChannelMessage_PostSchema,
    MembershipReason,
} from '@towns-protocol/proto'
import type { DecryptionSessionError } from '../../decryptionExtensions'
import { isDefined, logNever } from '../../check'
import { create } from '@bufbuild/protobuf'

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
    /** We received this event */
    RECEIVED = 'received',
}

export interface TimelineEvent {
    eventId: string
    localEventId?: string // if this event was created locally and appended before addEvent, this will be set
    eventNum: bigint
    latestEventId: string // if a message was edited or deleted, this will be set to the latest event id
    latestEventNum: bigint // if a message was edited or deleted, this will be set to the latest event id
    status: EventStatus
    createdAtEpochMs: number // created at times are generated client side, do not trust them
    updatedAtEpochMs?: number // updated at times are generated client side, do not trust them
    content: TimelineEvent_OneOf | undefined // TODO: would be great to have this non optional
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
        id: string
    }
    sessionId?: string
}

/// a timeline event should have one or none of the following fields set
export type TimelineEvent_OneOf =
    | ChannelCreateEvent
    | ChannelMessageEncryptedEvent
    | ChannelMessageEncryptedRefEvent
    | ChannelMessageEvent
    | ChannelMessageMissingEvent
    | ChannelPropertiesEvent
    | EncryptedChannelPropertiesEvent
    | FulfillmentEvent
    | InceptionEvent
    | KeySolicitationEvent
    | MiniblockHeaderEvent
    | MemberBlockchainTransactionEvent
    | PinEvent
    | ReactionEvent
    | RedactedEvent
    | RedactionActionEvent
    | StreamEncryptionAlgorithmEvent
    | StreamMembershipEvent
    | SpaceDisplayNameEvent
    | SpaceEnsAddressEvent
    | SpaceImageEvent
    | SpaceNftEvent
    | SpaceUpdateAutojoinEvent
    | SpaceUpdateHideUserJoinLeavesEvent
    | SpaceUsernameEvent
    | TipEvent
    | TokenTransferEvent
    | SpaceReviewEvent
    | UserBlockchainTransactionEvent
    | UserReceivedBlockchainTransactionEvent
    | UnpinEvent

export enum RiverTimelineEvent {
    ChannelCreate = 'm.channel.create',
    ChannelMessage = 'm.channel.message',
    ChannelMessageEncrypted = 'm.channel.encrypted',
    ChannelMessageEncryptedWithRef = 'm.channel.encrypted_with_ref',
    ChannelMessageMissing = 'm.channel.missing',
    ChannelProperties = 'm.channel.properties',
    EncryptedChannelProperties = 'm.channel.encrypted_properties',
    Fulfillment = 'm.fulfillment',
    Inception = 'm.inception', // TODO: would be great to name this after space / channel name
    KeySolicitation = 'm.key_solicitation',
    MemberBlockchainTransaction = 'm.member_blockchain_transaction',
    MiniblockHeader = 'm.miniblockheader',
    Pin = 'm.pin',
    Reaction = 'm.reaction',
    RedactedEvent = 'm.redacted_event',
    RedactionActionEvent = 'm.redaction_action',
    SpaceUpdateAutojoin = 'm.space.update_autojoin',
    SpaceUpdateHideUserJoinLeaves = 'm.space.update_channel_hide_user_join_leaves',
    SpaceImage = 'm.space.image',
    SpaceUsername = 'm.space.username',
    SpaceDisplayName = 'm.space.display_name',
    SpaceEnsAddress = 'm.space.ens_name',
    SpaceNft = 'm.space.nft',
    SpaceReview = 'm.space.review',
    StreamEncryptionAlgorithm = 'm.stream_encryption_algorithm',
    StreamMembership = 'm.stream_membership',
    TipEvent = 'm.tip_event',
    TokenTransfer = 'm.token_transfer',
    Unpin = 'm.unpin',
    UserBlockchainTransaction = 'm.user_blockchain_transaction',
    UserReceivedBlockchainTransaction = 'm.user_received_blockchain_transaction',
}

export interface MiniblockHeaderEvent {
    kind: RiverTimelineEvent.MiniblockHeader
    miniblockNum: bigint
    hasSnapshot: boolean
}

export interface FulfillmentEvent {
    kind: RiverTimelineEvent.Fulfillment
    sessionIds: string[]
    deviceKey: string
    to: string
    from: string
}

export interface KeySolicitationEvent {
    kind: RiverTimelineEvent.KeySolicitation
    sessionIds: string[]
    deviceKey: string
    isNewDevice: boolean
}

export interface InceptionEvent {
    kind: RiverTimelineEvent.Inception
    creatorId: string
    type?: PayloadCaseType
    spaceId?: string // valid on casablanca channel streams
}

export interface ChannelCreateEvent {
    kind: RiverTimelineEvent.ChannelCreate
    creatorId: string
    channelId: string
    channelOp?: ChannelOp
    channelSettings?: SpacePayload_ChannelSettings
}

export interface SpaceUpdateAutojoinEvent {
    kind: RiverTimelineEvent.SpaceUpdateAutojoin
    channelId: string
    autojoin: boolean
}

export interface SpaceUpdateHideUserJoinLeavesEvent {
    kind: RiverTimelineEvent.SpaceUpdateHideUserJoinLeaves
    channelId: string
    hideUserJoinLeaves: boolean
}

export interface SpaceImageEvent {
    kind: RiverTimelineEvent.SpaceImage
}

export interface ReactionEvent {
    kind: RiverTimelineEvent.Reaction
    targetEventId: string
    reaction: string
}

export interface SpaceUsernameEvent {
    kind: RiverTimelineEvent.SpaceUsername
    userId: string
    username: string
}

export interface SpaceDisplayNameEvent {
    kind: RiverTimelineEvent.SpaceDisplayName
    userId: string
    displayName: string
}

export interface SpaceEnsAddressEvent {
    kind: RiverTimelineEvent.SpaceEnsAddress
    userId: string
    ensAddress: Uint8Array
}

export interface SpaceNftEvent {
    kind: RiverTimelineEvent.SpaceNft
    userId: string
    contractAddress: string
    tokenId: string
    chainId: number
}

export interface PinEvent {
    kind: RiverTimelineEvent.Pin
    userId: string
    pinnedEventId: string
}

export interface UnpinEvent {
    kind: RiverTimelineEvent.Unpin
    userId: string
    unpinnedEventId: string
}

export interface StreamEncryptionAlgorithmEvent {
    kind: RiverTimelineEvent.StreamEncryptionAlgorithm
    algorithm?: string
}

export interface ChannelMessageEncryptedEvent {
    kind: RiverTimelineEvent.ChannelMessageEncrypted
    error?: DecryptionSessionError
}

export interface ChannelMessageEncryptedRefEvent {
    kind: RiverTimelineEvent.ChannelMessageEncryptedWithRef
    refEventId: string
}

export interface ChannelPropertiesEvent {
    kind: RiverTimelineEvent.ChannelProperties
    properties: ChannelProperties
}

export interface EncryptedChannelPropertiesEvent {
    kind: RiverTimelineEvent.EncryptedChannelProperties
    error?: DecryptionSessionError
}

export interface ChannelMessageMissingEvent {
    kind: RiverTimelineEvent.ChannelMessageMissing
    eventId: string
}

// the same as MembershipOp but with a different name
export enum Membership {
    Join = 'join',
    Invite = 'invite',
    Leave = 'leave',
    None = '',
}

export interface StreamMembershipEvent {
    kind: RiverTimelineEvent.StreamMembership
    userId: string
    initiatorId: string
    membership: Membership
    reason?: MembershipReason
    streamId?: string // in a case of an invitation to a channel with a streamId
}

export interface UserBlockchainTransactionEvent {
    kind: RiverTimelineEvent.UserBlockchainTransaction
    transaction: PlainMessage<BlockchainTransaction>
}

export interface UserReceivedBlockchainTransactionEvent {
    kind: RiverTimelineEvent.UserReceivedBlockchainTransaction
    receivedTransaction: PlainMessage<UserPayload_ReceivedBlockchainTransaction>
}

export interface MemberBlockchainTransactionEvent {
    kind: RiverTimelineEvent.MemberBlockchainTransaction
    transaction?: PlainMessage<BlockchainTransaction>
    fromUserId: string
}

export interface TipEvent {
    kind: RiverTimelineEvent.TipEvent
    transaction: PlainMessage<BlockchainTransaction>
    tip: PlainMessage<BlockchainTransaction_Tip>
    transactionHash: string
    fromUserId: string
    refEventId: string
    toUserId: string
}

export interface TokenTransferEvent {
    kind: RiverTimelineEvent.TokenTransfer
    transaction: PlainMessage<BlockchainTransaction>
    transfer: PlainMessage<BlockchainTransaction_TokenTransfer>
    fromUserId: string
    createdAtEpochMs: bigint
    threadParentId: string
}

export interface SpaceReviewEvent {
    kind: RiverTimelineEvent.SpaceReview
    action: BlockchainTransaction_SpaceReview_Action
    rating: number
    comment?: string
    fromUserId: string
}

export enum MessageType {
    Text = 'm.text',
    GM = 'm.gm',
    Image = 'm.image',
}

export interface ChannelMessageEventContent_Image {
    msgType: MessageType.Image
    info?:
        | ChannelMessage_Post_Content_Image_Info
        | PlainMessage<ChannelMessage_Post_Content_Image_Info>
    thumbnail?:
        | ChannelMessage_Post_Content_Image_Info
        | PlainMessage<ChannelMessage_Post_Content_Image_Info>
}

export interface ChannelMessageEventContent_GM {
    msgType: MessageType.GM
    data?: Uint8Array
}

export interface ChannelMessageEventContent_Text {
    msgType: MessageType.Text
}

export type ChannelMessageEventContentOneOf =
    | ChannelMessageEventContent_Image
    | ChannelMessageEventContent_GM
    | ChannelMessageEventContent_Text

export interface Mention {
    displayName: string
    userId: string
    atChannel?: boolean
}

// mentions should always have a user id, but it's data over the wire
// and we can't guarantee that it will be there (we have issues in prod as i write this)
export type OTWMention = Omit<Mention, 'userId'> & { userId?: string }

export interface ChannelMessageEvent {
    kind: RiverTimelineEvent.ChannelMessage
    threadId?: string
    threadPreview?: string
    replyId?: string
    replyPreview?: string
    body: string
    mentions: OTWMention[]
    editsEventId?: string
    content: ChannelMessageEventContentOneOf
    attachments?: Attachment[]
}

// original event: the event that was redacted
export interface RedactedEvent {
    kind: RiverTimelineEvent.RedactedEvent
    isAdminRedaction: boolean
}

// the event that redacted the original event
export interface RedactionActionEvent {
    kind: RiverTimelineEvent.RedactionActionEvent
    refEventId: string
    adminRedaction: boolean
}

export interface TimelineEventConfirmation {
    eventId: string
    confirmedEventNum: bigint
    confirmedInBlockNum: bigint
}

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
    channel: { id: string; label: string }
    timestamp: number
}

/// MessageReactions: { reactionName: { userId: { eventId: string } } }
export type MessageReactions = Record<string, Record<string, { eventId: string }>>

export type MentionResult = {
    type: 'mention'
    unread: boolean
    channelId: string
    timestamp: number
    event: TimelineEvent
    thread?: TimelineEvent
}

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
    channelMessageEvent?: ChannelMessageEvent
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

export type TickerAttachment = {
    type: 'ticker'
    id: string
    address: string
    chainId: string
}

export type Attachment =
    | ImageAttachment
    | ChunkedMediaAttachment
    | EmbeddedMediaAttachment
    | EmbeddedMessageAttachment
    | UnfurledLinkAttachment
    | TickerAttachment

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

export function transformAttachments(attachments?: Attachment[]): ChannelMessage_Post_Attachment[] {
    if (!attachments) {
        return []
    }

    return attachments
        .map((attachment) => {
            switch (attachment.type) {
                case 'chunked_media':
                    return create(ChannelMessage_Post_AttachmentSchema, {
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
                    return create(ChannelMessage_Post_AttachmentSchema, {
                        content: {
                            case: 'embeddedMedia',
                            value: {
                                info: attachment.info,
                                content: attachment.content,
                            },
                        },
                    })
                case 'image':
                    return create(ChannelMessage_Post_AttachmentSchema, {
                        content: {
                            case: 'image',
                            value: {
                                info: attachment.info,
                            },
                        },
                    })
                case 'embedded_message': {
                    const { channelMessageEvent, ...content } = attachment
                    if (!channelMessageEvent) {
                        return
                    }
                    const post = create(ChannelMessage_PostSchema, {
                        threadId: channelMessageEvent.threadId,
                        threadPreview: channelMessageEvent.threadPreview,
                        content: {
                            case: 'text' as const,
                            value: {
                                ...channelMessageEvent,
                                attachments: transformAttachments(channelMessageEvent.attachments),
                            },
                        },
                    })
                    const value = create(ChannelMessage_Post_AttachmentSchema, {
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
                    return create(ChannelMessage_Post_AttachmentSchema, {
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
                case 'ticker':
                    return create(ChannelMessage_Post_AttachmentSchema, {
                        content: {
                            case: 'ticker',
                            value: {
                                chainId: attachment.chainId,
                                address: attachment.address,
                            },
                        },
                    })
                default:
                    logNever(attachment)
                    return undefined
            }
        })
        .filter(isDefined)
}

export function getEditsId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === RiverTimelineEvent.ChannelMessage ? content.editsEventId : undefined
}

export function getRedactsId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === RiverTimelineEvent.RedactionActionEvent
        ? content.refEventId
        : undefined
}

export function getThreadParentId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === RiverTimelineEvent.ChannelMessage
        ? content.threadId
        : content?.kind === RiverTimelineEvent.TokenTransfer
          ? content.threadParentId
          : undefined
}

export function getReplyParentId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === RiverTimelineEvent.ChannelMessage ? content.replyId : undefined
}

export function getReactionParentId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === RiverTimelineEvent.Reaction ? content.targetEventId : undefined
}

export function getIsMentioned(content: TimelineEvent_OneOf | undefined, userId: string): boolean {
    //TODO: comparison below should be changed as soon as this HNT-1576 will be resolved
    return content?.kind === RiverTimelineEvent.ChannelMessage
        ? content.mentions.findIndex(
              (x) =>
                  (x.userId ?? '')
                      .toLowerCase()
                      .localeCompare(userId.toLowerCase(), undefined, { sensitivity: 'base' }) == 0,
          ) >= 0
        : false
}
