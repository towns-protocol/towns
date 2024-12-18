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
    latestEventNum: bigint | undefined // if a message was edited or deleted, this will be set to the latest event id
    status: EventStatus
    createdAtEpochMs: number // created at times are generated client side, do not trust them
    updatedAtEpochMs?: number // updated at times are generated client side, do not trust them
    content: TimelineEvent_OneOf | undefined // TODO: would be great to have this non optional
    fallbackContent: string
    isEncrypting: boolean // local only, isLocalPending should also be true
    // isLocalPending: boolean /// true if we're waiting for the event to get sent back from the server
    // isSendFailed: boolean
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
    | FulfillmentEvent
    | KeySolicitationEvent
    | MiniblockHeaderEvent
    | MemberBlockchainTransactionEvent
    | PinEvent
    | ReactionEvent
    | RedactedEvent
    | RedactionActionEvent
    | RoomCreateEvent
    | RoomMemberEvent
    | RoomMessageEncryptedEvent
    | RoomMessageEncryptedRefEvent
    | RoomMessageEvent
    | RoomMessageMissingEvent
    | RoomPropertiesEvent // TODO: maybe change this to ChannelPropertiesEvent (?)
    | SpaceDisplayNameEvent
    | SpaceEnsAddressEvent
    | SpaceImageEvent
    | SpaceNftEvent
    | SpaceUpdateAutojoinEvent
    | SpaceUpdateHideUserJoinLeavesEvent
    | SpaceUsernameEvent
    | UserBlockchainTransactionEvent
    | UserReceivedBlockchainTransactionEvent
    | UnpinEvent
    | MlsEvent

export enum RiverTimelineEvent {
    MiniblockHeader = 'm.miniblockheader',
    Reaction = 'm.reaction',
    Fulfillment = 'm.fulfillment',
    KeySolicitation = 'm.key_solicitation',
    MemberBlockchainTransaction = 'm.member_blockchain_transaction',
    Pin = 'm.pin',
    RedactedEvent = 'm.redacted_event',
    RedactionActionEvent = 'm.redaction_action',
    RoomCreate = 'm.room.create', // TODO: would be great to name this after space / channel name
    RoomJoinRules = 'm.room.join_rules',
    RoomMember = 'm.room.member',
    RoomMessage = 'm.room.message',
    RoomMessageEncrypted = 'm.room.encrypted',
    RoomMessageEncryptedWithRef = 'm.room.encrypted_with_ref',
    RoomMessageMissing = 'm.room.missing',
    RoomProperties = 'm.room.properties',
    ChannelCreate = 'm.channel.create',
    SpaceUpdateAutojoin = 'm.space.update_autojoin',
    SpaceUpdateHideUserJoinLeaves = 'm.space.update_channel_hide_user_join_leaves',
    SpaceImage = 'm.space.image',
    SpaceUsername = 'm.space.username',
    SpaceDisplayName = 'm.space.display_name',
    SpaceEnsAddress = 'm.space.ens_name',
    SpaceNft = 'm.space.nft',
    Unpin = 'm.unpin',
    UserBlockchainTransaction = 'm.user_blockchain_transaction',
    UserReceivedBlockchainTransaction = 'm.user_received_blockchain_transaction',
    Mls = 'm.mls',
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

export interface RoomCreateEvent {
    kind: RiverTimelineEvent.RoomCreate
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

export interface RoomMessageEncryptedEvent {
    kind: RiverTimelineEvent.RoomMessageEncrypted
    error?: DecryptionSessionError
}

export interface RoomMessageEncryptedRefEvent {
    kind: RiverTimelineEvent.RoomMessageEncryptedWithRef
    refEventId: string
}

export interface RoomPropertiesEvent {
    kind: RiverTimelineEvent.RoomProperties
    properties: ChannelProperties
}

export interface RoomMessageMissingEvent {
    kind: RiverTimelineEvent.RoomMessageMissing
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

export interface RoomMemberEvent {
    kind: RiverTimelineEvent.RoomMember
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

export enum MessageType {
    Text = 'm.text',
    GM = 'm.gm',
    Image = 'm.image',
}

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
    kind: RiverTimelineEvent.RoomMessage
    threadId?: string
    threadPreview?: string
    replyId?: string
    replyPreview?: string
    body: string
    mentions: {
        // mentions should always have a user id, but it's data over the wire
        // and we can't guarantee that it will be there (we have issues in prod as i write this)
        // TODO: would be nice to preprocess and dont add the mention if the user id is not there
        userId: string | undefined
        displayName: string
        atChannel?: boolean
    }[]
    editsEventId?: string
    content: RoomMessageEventContentOneOf
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
    parentMessageContent?: RoomMessageEvent
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
