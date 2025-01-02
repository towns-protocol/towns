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
    BlockchainTransaction,
    UserPayload_ReceivedBlockchainTransaction,
    BlockchainTransaction_Tip,
} from '@river-build/proto'
import { PlainMessage } from '@bufbuild/protobuf'
import { Channel, Membership, Mention, MessageType } from './towns-types'
import { staticAssertNever } from '../utils/towns-utils'
import { DecryptionSessionError } from '@river-build/encryption'
import { EventStatus, isDefined, RiverTimelineEvent } from '@river-build/sdk'
import { bin_toHexString } from '@river-build/dlog'

/**************************************************************************
 * We're using a union type to represent the different types of events that
 * can be received from the server.
 * you can read about union types
 * here: https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html
 * and here: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types
 **************************************************************************/

/// a timeline event should have one or none of the following fields set
export type TimelineEvent_OneOf =
    | ChannelMessageEncryptedEvent
    | ChannelMessageEncryptedRefEvent
    | ChannelMessageMissingEvent
    | ChannelMessageEvent
    | ChannelPropertiesEvent
    | FulfillmentEvent
    | InceptionEvent
    | KeySolicitationEvent
    | MemberBlockchainTransactionEvent
    | MiniblockHeaderEvent
    | ReactionEvent
    | PinEvent
    | RedactedEvent
    | RedactionActionEvent
    | StreamMembershipEvent
    | ChannelCreateEvent
    | SpaceUpdateAutojoinEvent
    | SpaceUpdateHideUserJoinLeavesEvent
    | SpaceImageEvent
    | SpaceUsernameEvent
    | SpaceDisplayNameEvent
    | SpaceEnsAddressEvent
    | SpaceNftEvent
    | TipEvent
    | UnpinEvent
    | UserBlockchainTransactionEvent
    | UserReceivedBlockchainTransactionEvent

export interface TipEvent {
    kind: RiverTimelineEvent.TipEvent
    transaction: PlainMessage<BlockchainTransaction>
    tip: PlainMessage<BlockchainTransaction_Tip>
    transactionHash: string
    fromUserId: string
    refEventId: string
    toUserId: string
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

export interface ReactionEvent {
    kind: RiverTimelineEvent.Reaction
    targetEventId: string
    reaction: string
}

export interface InceptionEvent {
    kind: RiverTimelineEvent.Inception
    creatorId: string
    type?: PayloadCaseType
    spaceId?: string // valid on casablanca channel streams
}

export interface ChannelPropertiesEvent {
    kind: RiverTimelineEvent.ChannelProperties
    properties: ChannelProperties
}

export interface ChannelMessageEncryptedEvent {
    kind: RiverTimelineEvent.ChannelMessageEncrypted
    error?: DecryptionSessionError
}

export interface ChannelMessageMissingEvent {
    kind: RiverTimelineEvent.ChannelMessageMissing
    eventId: string
}

export interface StreamMembershipEvent {
    kind: RiverTimelineEvent.StreamMembership
    userId: string
    initiatorId: string
    membership: Membership
    streamId?: string // in a case of an invitation to a channel with a streamId
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

export interface ChannelMessageEncryptedRefEvent {
    kind: RiverTimelineEvent.ChannelMessageEncryptedWithRef
    refEventId: string
}

// mentions should always have a user id, but it's data over the wire
// and we can't guarantee that it will be there (we have issues in prod as i write this)
export type OTWMention = Omit<Mention, 'userId'> & { userId?: string }

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

export interface TimelineEvent {
    eventId: string
    localEventId?: string // if this event was created locally and appended before addEvent, this will be set
    eventNum: bigint
    latestEventId: string // if a message was edited or deleted, this will be set to the latest event id
    latestEventNum: bigint // if a message was edited or deleted, this will be set to the latest event id
    status: EventStatus
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
        id: string
    }
    sessionId?: string
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
    channel: Channel
    timestamp: number
}

/// MessageReactions: { reactionName: { userId: { eventId: string } } }
export type MessageReactions = Record<string, Record<string, { eventId: string }>>

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
        case RiverTimelineEvent.MiniblockHeader:
            return `Miniblock miniblockNum:${content.message.miniblockNum}, hasSnapshot:${(content
                .message.snapshot
                ? true
                : false
            ).toString()}`
        case RiverTimelineEvent.Reaction:
            return `${senderDisplayName} reacted with ${content.reaction} to ${content.targetEventId}`
        case RiverTimelineEvent.Inception:
            return content.type ? `type: ${content.type}` : ''
        case RiverTimelineEvent.ChannelMessageEncrypted:
            return `Decrypting...`
        case RiverTimelineEvent.StreamMembership: {
            return `[${content.membership}] userId: ${content.userId} initiatorId: ${content.initiatorId}`
        }
        case RiverTimelineEvent.ChannelMessage:
            return `${senderDisplayName}: ${content.body}`
        case RiverTimelineEvent.ChannelProperties:
            return `properties: ${content.properties.name ?? ''} ${content.properties.topic ?? ''}`
        case RiverTimelineEvent.SpaceUsername:
            return `username: ${content.username}`
        case RiverTimelineEvent.SpaceDisplayName:
            return `username: ${content.displayName}`
        case RiverTimelineEvent.SpaceEnsAddress:
            return `ensAddress: ${bin_toHexString(content.ensAddress)}`
        case RiverTimelineEvent.SpaceNft:
            return `contractAddress: ${content.contractAddress}, tokenId: ${content.tokenId}, chainId: ${content.chainId}`
        case RiverTimelineEvent.RedactedEvent:
            return `~Redacted~`
        case RiverTimelineEvent.RedactionActionEvent:
            return `Redacts ${content.refEventId} adminRedaction: ${content.adminRedaction}`
        case RiverTimelineEvent.ChannelCreate:
            if (content.channelSettings !== undefined) {
                return `childId: ${content.channelId} autojoin: ${content.channelSettings.autojoin} hideUserJoinLeaves: ${content.channelSettings.hideUserJoinLeaveEvents}`
            }
            return `childId: ${content.channelId}`
        case RiverTimelineEvent.SpaceUpdateAutojoin:
            return `channelId: ${content.channelId} autojoin: ${content.autojoin}`
        case RiverTimelineEvent.SpaceUpdateHideUserJoinLeaves:
            return `channelId: ${content.channelId} hideUserJoinLeaves: ${content.hideUserJoinLeaves}`
        case RiverTimelineEvent.SpaceImage:
            return `SpaceImage`
        case RiverTimelineEvent.Fulfillment:
            return `Fulfillment sessionIds: ${
                content.sessionIds.length ? content.sessionIds.join(',') : 'forNewDevice: true'
            }, from: ${content.from} to: ${content.deviceKey}`
        case RiverTimelineEvent.KeySolicitation:
            if (content.isNewDevice) {
                return `KeySolicitation deviceKey: ${content.deviceKey}, newDevice: true`
            }
            return `KeySolicitation deviceKey: ${content.deviceKey} sessionIds: ${content.sessionIds.length}`
        case RiverTimelineEvent.ChannelMessageMissing:
            return `eventId: ${content.eventId}`
        case RiverTimelineEvent.ChannelMessageEncryptedWithRef:
            return `refEventId: ${content.refEventId}`
        case RiverTimelineEvent.Pin:
            return `pinnedEventId: ${content.pinnedEventId} by: ${content.userId}`
        case RiverTimelineEvent.Unpin:
            return `unpinnedEventId: ${content.unpinnedEventId} by: ${content.userId}`
        case RiverTimelineEvent.TipEvent:
            return `tip from: ${content.fromUserId} to: ${content.toUserId} refEventId: ${
                content.refEventId
            } amount: ${content.tip.event?.amount.toString() ?? '??'}`
        case RiverTimelineEvent.MemberBlockchainTransaction:
            return `memberTransaction from: ${
                content.fromUserId
            } ${getFallbackContent_BlockchainTransaction(content.transaction)}`
        case RiverTimelineEvent.UserBlockchainTransaction:
            return getFallbackContent_BlockchainTransaction(content.transaction)
        case RiverTimelineEvent.UserReceivedBlockchainTransaction:
            return `kind: ${
                content.receivedTransaction.transaction?.content.case ?? '??'
            } fromUserAddress: ${
                content.receivedTransaction.fromUserAddress
                    ? bin_toHexString(content.receivedTransaction.fromUserAddress)
                    : ''
            }`
        default:
            staticAssertNever(content)
    }
}

function getFallbackContent_BlockchainTransaction(
    transaction: PlainMessage<BlockchainTransaction> | undefined,
) {
    if (!transaction) {
        return '??'
    }
    switch (transaction.content.case) {
        case 'tip':
            if (!transaction.content.value?.event) {
                return '??'
            }
            return `kind: ${transaction.content.case} messageId: ${bin_toHexString(
                transaction.content.value.event.messageId,
            )} receiver: ${bin_toHexString(
                transaction.content.value.event.receiver,
            )} amount: ${transaction.content.value.event.amount.toString()}`
        default:
            return `kind: ${transaction.content.case ?? 'unspecified'}`
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
                    const { channelMessageEvent, ...content } = attachment
                    if (!channelMessageEvent) {
                        return
                    }
                    const post = new ChannelMessage_Post({
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
