import type {
    ChannelMessage_Post_Content_EmbeddedMessage_StaticInfo,
    ChannelMessage_Post,
    ChannelMessage_Post_Content_EmbeddedMessage_Info,
    FullyReadMarker,
    ChunkedMedia_AESGCM,
    ChannelMessage_Post_Content_Image_Info,
    MediaInfo as MediaInfoStruct,
    MiniblockHeader,
    PayloadCaseType,
    ChannelOp,
    SpacePayload_ChannelSettings,
    ChannelProperties,
    BlockchainTransaction,
    UserPayload_ReceivedBlockchainTransaction,
    BlockchainTransaction_Tip,
} from '@river-build/proto'
import type { PlainMessage } from '@bufbuild/protobuf'
import type { DecryptionSessionError } from '@river-build/encryption'

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
    | FulfillmentEvent
    | InceptionEvent
    | KeySolicitationEvent
    | MiniblockHeaderEvent
    | MemberBlockchainTransactionEvent
    | MlsEvent
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
    Fulfillment = 'm.fulfillment',
    Inception = 'm.inception', // TODO: would be great to name this after space / channel name
    KeySolicitation = 'm.key_solicitation',
    MemberBlockchainTransaction = 'm.member_blockchain_transaction',
    MiniblockHeader = 'm.miniblockheader',
    Mls = 'm.mls',
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
    StreamEncryptionAlgorithm = 'm.stream_encryption_algorithm',
    StreamMembership = 'm.stream_membership',
    TipEvent = 'm.tip_event',
    Unpin = 'm.unpin',
    UserBlockchainTransaction = 'm.user_blockchain_transaction',
    UserReceivedBlockchainTransaction = 'm.user_received_blockchain_transaction',
}

export interface MiniblockHeaderEvent {
    kind: RiverTimelineEvent.MiniblockHeader
    message: MiniblockHeader
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

export interface MlsEvent {
    kind: RiverTimelineEvent.Mls
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

export interface ChannelMessageMissingEvent {
    kind: RiverTimelineEvent.ChannelMessageMissing
    eventId: string
}

// TODO: membership here doenst map 1-1 to MembershipOp
export enum Membership {
    Join = 'join',
    Invite = 'invite',
    Leave = 'leave',
    Ban = 'ban',
    None = '',
}

export interface StreamMembershipEvent {
    kind: RiverTimelineEvent.StreamMembership
    userId: string
    initiatorId: string
    membership: Membership
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
    channelId: string // NOTE: dispreancy with useCasablancaTimeline, where channel is ChannelData
    timestamp: number
}

/// MessageReactions: { reactionName: { userId: { eventId: string } } }
export type MessageReactions = Record<string, Record<string, { eventId: string }>>

export type MentionResult = {
    type: 'mention'
    unread: boolean
    channelId: string // NOTE: dispreancy with useCasablancaTimeline, where channel is ChannelData
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

export type Attachment =
    | ImageAttachment
    | ChunkedMediaAttachment
    | EmbeddedMediaAttachment
    | EmbeddedMessageAttachment
    | UnfurledLinkAttachment
