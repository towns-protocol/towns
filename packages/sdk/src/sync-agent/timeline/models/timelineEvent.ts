import { bin_toHexString } from '@towns-protocol/dlog'
import {
    ChannelMessage_Post_Attachment,
    ChannelMessage_Post,
    type ChannelMessage,
    type ChannelPayload,
    type DmChannelPayload,
    type EncryptedData,
    type GdmChannelPayload,
    type MemberPayload,
    type MiniblockHeader,
    type SpacePayload,
    type UserPayload,
    MembershipOp,
    BlockchainTransaction,
    PlainMessage,
    ChannelMessage_Post_AttachmentSchema,
    ChannelMessage_PostSchema,
} from '@towns-protocol/proto'
import { isDefined, logNever, checkNever } from '../../../check'
import {
    type TimelineEvent_OneOf,
    type Attachment,
    EventStatus,
    MessageType,
    type ChunkedMediaAttachment,
    type EmbeddedMediaAttachment,
    type EmbeddedMessageAttachment,
    type FulfillmentEvent,
    type ImageAttachment,
    type KeySolicitationEvent,
    type MiniblockHeaderEvent,
    type PinEvent,
    type ReactionEvent,
    type RedactionActionEvent,
    type ChannelMessageEvent,
    type SpaceDisplayNameEvent,
    type SpaceEnsAddressEvent,
    type SpaceNftEvent,
    type SpaceUsernameEvent,
    type TimelineEvent,
    type UnpinEvent,
    type ChannelCreateEvent,
    type InceptionEvent,
    type StreamMembershipEvent,
    Membership,
    type ChannelMessageEncryptedEvent,
    type ChannelPropertiesEvent,
    RiverTimelineEvent,
    type RedactedEvent,
    type SpaceUpdateAutojoinEvent,
    type SpaceUpdateHideUserJoinLeavesEvent,
    type SpaceImageEvent,
    UserBlockchainTransactionEvent,
    MemberBlockchainTransactionEvent,
    UserReceivedBlockchainTransactionEvent,
    StreamEncryptionAlgorithmEvent,
    TipEvent,
    SpaceReviewEvent,
    TokenTransferEvent,
} from './timeline-types'
import { userIdFromAddress, streamIdFromBytes, streamIdAsString } from '../../../id'
import {
    type StreamTimelineEvent,
    isLocalEvent,
    isRemoteEvent,
    type ParsedEvent,
    type RemoteTimelineEvent,
    isCiphertext,
} from '../../../types'

import { getSpaceReviewEventDataBin } from '@towns-protocol/web3'
import { create } from '@bufbuild/protobuf'

type SuccessResult = {
    content: TimelineEvent_OneOf
    error?: never
}

type ErrorResult = {
    content?: never
    error: string
}

type EventContentResult = SuccessResult | ErrorResult

export function toEventSA(timelineEvent: StreamTimelineEvent, userId: string): TimelineEvent {
    const eventId = timelineEvent.hashStr
    const senderId = timelineEvent.creatorUserId

    // TODO: get sender metadata from store
    const sender = {
        id: senderId,
    }

    const { content, error } = toTownsContent(timelineEvent)
    const isSender = sender.id === userId
    const fbc = `${content?.kind ?? '??'} ${getFallbackContent(sender.id, content, error)}`

    function extractSessionId(event: StreamTimelineEvent): string | undefined {
        const payload = event.remoteEvent?.event.payload
        if (
            !payload ||
            payload.case !== 'channelPayload' ||
            payload.value.content.case !== 'message'
        ) {
            return undefined
        }

        return payload.value.content.value.sessionId
    }

    const sessionId = extractSessionId(timelineEvent)

    return {
        eventId: eventId,
        localEventId: timelineEvent.localEvent?.localId,
        eventNum: timelineEvent.eventNum,
        latestEventId: eventId,
        latestEventNum: timelineEvent.eventNum,
        status: isSender ? getEventStatus(timelineEvent) : EventStatus.RECEIVED,
        createdAtEpochMs: Number(timelineEvent.createdAtEpochMs),
        updatedAtEpochMs: undefined,
        content: content,
        fallbackContent: fbc,
        isEncrypting: eventId.startsWith('~'),
        isLocalPending: timelineEvent.remoteEvent === undefined,
        isSendFailed: timelineEvent.localEvent?.status === 'failed',
        confirmedEventNum: timelineEvent.confirmedEventNum,
        confirmedInBlockNum: timelineEvent.miniblockNum,
        threadParentId: getThreadParentId(content),
        replyParentId: getReplyParentId(content),
        reactionParentId: getReactionParentId(content),
        isMentioned: getIsMentioned(content, userId),
        isRedacted: false, // redacted is handled in use timeline store when the redaction event is received
        sender,
        sessionId,
    }
}

function toTownsContent(timelineEvent: StreamTimelineEvent): EventContentResult {
    if (isLocalEvent(timelineEvent)) {
        return toTownsContent_FromChannelMessage(
            timelineEvent.localEvent.channelMessage,
            'local event',
            timelineEvent.hashStr,
        )
    } else if (isRemoteEvent(timelineEvent)) {
        return toTownsContent_fromParsedEvent(timelineEvent.hashStr, timelineEvent)
    } else {
        return { error: 'unknown event content type' }
    }
}

function validateEvent(
    eventId: string,
    message: ParsedEvent,
): Partial<ErrorResult> & { description?: string } {
    let error: ErrorResult
    if (!message.event.payload || !message.event.payload.value) {
        error = { error: 'payloadless payload' }
        return error
    }
    if (!message.event.payload.case) {
        error = { error: 'caseless payload' }
        return error
    }
    if (!message.event.payload.value.content.case) {
        error = { error: `${message.event.payload.case} - caseless payload content` }
        return error
    }
    const description = `${message.event.payload.case}::${message.event.payload.value.content.case} id: ${eventId}`
    return { description }
}

function toTownsContent_fromParsedEvent(
    eventId: string,
    timelineEvent: RemoteTimelineEvent,
): EventContentResult {
    const message = timelineEvent.remoteEvent
    const { error, description } = validateEvent(eventId, message)
    if (error) {
        return { error }
    }
    if (!description) {
        return { error: 'no description' }
    }

    switch (message.event.payload.case) {
        case 'userPayload':
            return toTownsContent_UserPayload(
                timelineEvent,
                message,
                message.event.payload.value,
                description,
            )
        case 'channelPayload':
            return toTownsContent_ChannelPayload(
                eventId,
                timelineEvent,
                message.event.payload.value,
                description,
            )
        case 'dmChannelPayload':
            return toTownsContent_ChannelPayload(
                eventId,
                timelineEvent,
                message.event.payload.value,
                description,
            )
        case 'gdmChannelPayload':
            return toTownsContent_ChannelPayload(
                eventId,
                timelineEvent,
                message.event.payload.value,
                description,
            )
        case 'spacePayload':
            return toTownsContent_SpacePayload(
                eventId,
                message,
                message.event.payload.value,
                description,
            )
        case 'userMetadataPayload':
            return {
                error: `${description} userMetadataPayload not supported?`,
            }
        case 'userSettingsPayload':
            return {
                error: `${description} userSettingsPayload not supported?`,
            }
        case 'userInboxPayload':
            return {
                error: `${description} userInboxPayload not supported?`,
            }
        case 'miniblockHeader':
            return toTownsContent_MiniblockHeader(
                eventId,
                message,
                message.event.payload.value,
                description,
            )
        case 'mediaPayload':
            return {
                error: `${description} mediaPayload not supported?`,
            }
        case 'memberPayload':
            return toTownsContent_MemberPayload(
                timelineEvent,
                message,
                message.event.payload.value,
                description,
            )
        case undefined:
            return { error: `Undefined payload case: ${description}` }
        default:
            logNever(message.event.payload)
            return { error: `Unknown payload case: ${description}` }
    }
}

function toTownsContent_MiniblockHeader(
    eventId: string,
    message: ParsedEvent,
    value: MiniblockHeader,
    _description: string,
): EventContentResult {
    return {
        content: {
            kind: RiverTimelineEvent.MiniblockHeader,
            miniblockNum: value.miniblockNum,
            hasSnapshot: value.snapshot !== undefined || value.snapshotHash !== undefined,
        } satisfies MiniblockHeaderEvent,
    }
}

function toTownsContent_MemberPayload(
    event: StreamTimelineEvent,
    message: ParsedEvent,
    value: MemberPayload,
    description: string,
): EventContentResult {
    switch (value.content.case) {
        case 'membership':
            return {
                content: {
                    kind: RiverTimelineEvent.StreamMembership,
                    userId: userIdFromAddress(value.content.value.userAddress),
                    initiatorId: userIdFromAddress(value.content.value.initiatorAddress),
                    membership: toMembership(value.content.value.op),
                } satisfies StreamMembershipEvent,
            }
        case 'keySolicitation':
            return {
                content: {
                    kind: RiverTimelineEvent.KeySolicitation,
                    sessionIds: value.content.value.sessionIds,
                    deviceKey: value.content.value.deviceKey,
                    isNewDevice: value.content.value.isNewDevice,
                } satisfies KeySolicitationEvent,
            }
        case 'keyFulfillment':
            return {
                content: {
                    kind: RiverTimelineEvent.Fulfillment,
                    sessionIds: value.content.value.sessionIds,
                    deviceKey: value.content.value.deviceKey,
                    to: userIdFromAddress(value.content.value.userAddress),
                    from: message.creatorUserId,
                } satisfies FulfillmentEvent,
            }

        case 'displayName':
            return {
                content: {
                    kind: RiverTimelineEvent.SpaceDisplayName,
                    userId: message.creatorUserId,
                    displayName:
                        event.decryptedContent?.kind === 'text'
                            ? event.decryptedContent.content
                            : value.content.value.ciphertext,
                } satisfies SpaceDisplayNameEvent,
            }

        case 'username':
            return {
                content: {
                    kind: RiverTimelineEvent.SpaceUsername,
                    userId: message.creatorUserId,
                    username:
                        event.decryptedContent?.kind === 'text'
                            ? event.decryptedContent.content
                            : value.content.value.ciphertext,
                } satisfies SpaceUsernameEvent,
            }
        case 'ensAddress':
            return {
                content: {
                    kind: RiverTimelineEvent.SpaceEnsAddress,
                    userId: message.creatorUserId,
                    ensAddress: value.content.value,
                } satisfies SpaceEnsAddressEvent,
            }
        case 'nft':
            return {
                content: {
                    kind: RiverTimelineEvent.SpaceNft,
                    userId: message.creatorUserId,
                    contractAddress: bin_toHexString(value.content.value.contractAddress),
                    tokenId: bin_toHexString(value.content.value.tokenId),
                    chainId: value.content.value.chainId,
                } satisfies SpaceNftEvent,
            }
        case 'pin':
            return {
                content: {
                    kind: RiverTimelineEvent.Pin,
                    userId: message.creatorUserId,
                    pinnedEventId: bin_toHexString(value.content.value.eventId),
                } satisfies PinEvent,
            }
        case 'unpin':
            return {
                content: {
                    kind: RiverTimelineEvent.Unpin,
                    userId: message.creatorUserId,
                    unpinnedEventId: bin_toHexString(value.content.value.eventId),
                } satisfies UnpinEvent,
            }
        case 'encryptionAlgorithm':
            return {
                content: {
                    kind: RiverTimelineEvent.StreamEncryptionAlgorithm,
                    algorithm: value.content.value.algorithm,
                } satisfies StreamEncryptionAlgorithmEvent,
            }
        case 'memberBlockchainTransaction': {
            const fromUserAddress = value.content.value.fromUserAddress
            const transaction = value.content.value.transaction
            if (!transaction) {
                return { error: `${description} no transaction` }
            }
            if (!transaction.receipt?.transactionHash) {
                return { error: `${description} no transactionHash` }
            }
            switch (transaction.content.case) {
                case 'tip': {
                    const tipContent = transaction.content.value
                    if (!tipContent.event) {
                        return { error: `${description} no event in tip` }
                    }
                    return {
                        content: {
                            kind: RiverTimelineEvent.TipEvent,
                            transaction: transaction,
                            tip: tipContent,
                            transactionHash: bin_toHexString(transaction.receipt.transactionHash),
                            fromUserId: userIdFromAddress(fromUserAddress),
                            refEventId: bin_toHexString(tipContent.event.messageId),
                            toUserId: userIdFromAddress(tipContent.toUserAddress),
                        } satisfies TipEvent,
                    }
                }
                case 'tokenTransfer':
                    return {
                        content: {
                            kind: RiverTimelineEvent.TokenTransfer,
                            transaction: transaction,
                            transfer: transaction.content.value,
                            fromUserId: userIdFromAddress(fromUserAddress),
                            createdAtEpochMs: event.createdAtEpochMs,
                            threadParentId: bin_toHexString(transaction.content.value.messageId),
                        } satisfies TokenTransferEvent,
                    }
                case 'spaceReview': {
                    if (!transaction.receipt) {
                        return { error: `${description} no receipt` }
                    }
                    const reviewContent = transaction.content.value
                    if (!reviewContent.event) {
                        return { error: `${description} no event in space review` }
                    }
                    const { comment, rating } = getSpaceReviewEventDataBin(
                        transaction.receipt.logs,
                        reviewContent.event.user,
                    )
                    return {
                        content: {
                            kind: RiverTimelineEvent.SpaceReview,
                            action: reviewContent.action,
                            rating: rating,
                            comment: comment,
                            fromUserId: userIdFromAddress(fromUserAddress),
                        } satisfies SpaceReviewEvent,
                    }
                }
                case undefined:
                    return {
                        content: {
                            kind: RiverTimelineEvent.MemberBlockchainTransaction,
                            transaction: value.content.value.transaction,
                            fromUserId: bin_toHexString(value.content.value.fromUserAddress),
                        } satisfies MemberBlockchainTransactionEvent,
                    }
                default:
                    logNever(transaction.content)
                    return { error: `${description} unknown transaction content` }
            }
        }
        case undefined:
            return { error: `Undefined payload case: ${description}` }
        default:
            logNever(value.content)
            return {
                error: `Unknown payload case: ${description}`,
            }
    }
}

function toTownsContent_UserPayload(
    event: RemoteTimelineEvent,
    message: ParsedEvent,
    value: UserPayload,
    description: string,
): EventContentResult {
    switch (value.content.case) {
        case 'inception': {
            return {
                content: {
                    kind: RiverTimelineEvent.Inception,
                    creatorId: message.creatorUserId,
                    type: message.event.payload.case,
                } satisfies InceptionEvent,
            }
        }
        case 'userMembership': {
            const payload = value.content.value
            const streamId = streamIdFromBytes(payload.streamId)
            return {
                content: {
                    kind: RiverTimelineEvent.StreamMembership,
                    userId: '', // this is just the current user
                    initiatorId: '',
                    membership: toMembership(payload.op),
                    streamId: streamId,
                } satisfies StreamMembershipEvent,
            }
        }
        case 'userMembershipAction': {
            // these are admin actions where you can invite, join, or kick someone
            const payload = value.content.value
            return {
                content: {
                    kind: RiverTimelineEvent.StreamMembership,
                    userId: userIdFromAddress(payload.userId),
                    initiatorId: event.remoteEvent.creatorUserId,
                    membership: toMembership(payload.op),
                } satisfies StreamMembershipEvent,
            }
        }
        case 'blockchainTransaction': {
            const payload = value.content.value
            return {
                content: {
                    kind: RiverTimelineEvent.UserBlockchainTransaction,
                    transaction: payload,
                } satisfies UserBlockchainTransactionEvent,
            }
        }
        case 'receivedBlockchainTransaction': {
            const payload = value.content.value
            return {
                content: {
                    kind: RiverTimelineEvent.UserReceivedBlockchainTransaction,
                    receivedTransaction: payload,
                } satisfies UserReceivedBlockchainTransactionEvent,
            }
        }
        case undefined: {
            return { error: `Undefined payload case: ${description}` }
        }
        default: {
            logNever(value.content)
            return {
                error: `Unknown payload case: ${description}`,
            }
        }
    }
}

function toTownsContent_ChannelPayload(
    eventId: string,
    timelineEvent: RemoteTimelineEvent,
    value: ChannelPayload | DmChannelPayload | GdmChannelPayload,
    description: string,
): EventContentResult {
    const message = timelineEvent.remoteEvent
    switch (value.content.case) {
        case 'inception': {
            return {
                content: {
                    kind: RiverTimelineEvent.Inception,
                    creatorId: message.creatorUserId,
                    type: message.event.payload.case,
                } satisfies InceptionEvent,
            }
        }
        case 'message': {
            if (timelineEvent.decryptedContent?.kind === 'channelMessage') {
                return toTownsContent_FromChannelMessage(
                    timelineEvent.decryptedContent.content,
                    description,
                    eventId,
                )
            }
            const payload = value.content.value
            return toTownsContent_ChannelPayload_Message(timelineEvent, payload, description)
        }
        case 'channelProperties': {
            const payload = value.content.value
            return toTownsContent_ChannelPayload_ChannelProperties(
                timelineEvent,
                payload,
                description,
            )
        }
        case 'redaction':
            return {
                content: {
                    kind: RiverTimelineEvent.RedactionActionEvent,
                    refEventId: bin_toHexString(value.content.value.eventId),
                    adminRedaction: true,
                } satisfies RedactionActionEvent,
            }
        case undefined: {
            return { error: `Undefined payload case: ${description}` }
        }
        default:
            logNever(value.content)
            return { error: `Unknown payload case: ${description}` }
    }
}

function toTownsContent_FromChannelMessage(
    channelMessage: ChannelMessage,
    description: string,
    eventId: string,
): EventContentResult {
    switch (channelMessage.payload?.case) {
        case 'post':
            return (
                toTownsContent_ChannelPayload_Message_Post(
                    channelMessage.payload.value,
                    eventId,
                    undefined,
                    description,
                ) ?? {
                    error: `${description} unknown message type`,
                }
            )
        case 'reaction':
            return {
                content: {
                    kind: RiverTimelineEvent.Reaction,
                    reaction: channelMessage.payload.value.reaction,
                    targetEventId: channelMessage.payload.value.refEventId,
                } satisfies ReactionEvent,
            }
        case 'redaction':
            return {
                content: {
                    kind: RiverTimelineEvent.RedactionActionEvent,
                    refEventId: channelMessage.payload.value.refEventId,
                    adminRedaction: false,
                } satisfies RedactionActionEvent,
            }
        case 'edit': {
            const newPost = channelMessage.payload.value.post
            if (!newPost) {
                return { error: `${description} no post in edit` }
            }
            const newContent = toTownsContent_ChannelPayload_Message_Post(
                newPost,
                eventId,
                channelMessage.payload.value.refEventId,
                description,
            )
            return newContent ?? { error: `${description} no content in edit` }
        }
        case undefined:
            return { error: `Undefined payload case: ${description}` }
        default: {
            logNever(channelMessage.payload)
            return {
                error: `Unknown payload case: ${description}`,
            }
        }
    }
}

function toTownsContent_ChannelPayload_Message(
    timelineEvent: StreamTimelineEvent,
    payload: EncryptedData,
    description: string,
): EventContentResult {
    if (isCiphertext(payload.ciphertext)) {
        if (payload.refEventId) {
            return {
                content: {
                    kind: RiverTimelineEvent.ChannelMessageEncryptedWithRef,
                    refEventId: payload.refEventId,
                },
            }
        }
        return {
            // if payload is an EncryptedData message, than it is encrypted content kind
            content: {
                kind: RiverTimelineEvent.ChannelMessageEncrypted,
                error: timelineEvent.decryptedContentError,
            } satisfies ChannelMessageEncryptedEvent,
        }
    }
    // do not handle non-encrypted messages that should be encrypted
    return { error: `${description} message text invalid channel message` }
}

function toTownsContent_ChannelPayload_ChannelProperties(
    timelineEvent: StreamTimelineEvent,
    payload: EncryptedData,
    description: string,
): EventContentResult {
    if (timelineEvent.decryptedContent?.kind === 'channelProperties') {
        return {
            content: {
                kind: RiverTimelineEvent.ChannelProperties,
                properties: timelineEvent.decryptedContent.content,
            } satisfies ChannelPropertiesEvent,
        }
    }
    // If the payload is encrypted, we display nothing.
    return { error: `${description} encrypted channel properties` }
}

function toTownsContent_ChannelPayload_Message_Post(
    value: PlainMessage<ChannelMessage_Post>,
    eventId: string,
    editsEventId: string | undefined,
    description: string,
): EventContentResult {
    switch (value.content.case) {
        case 'text':
            return {
                content: {
                    kind: RiverTimelineEvent.ChannelMessage,
                    body: value.content.value.body,
                    threadId: value.threadId,
                    threadPreview: value.threadPreview,
                    replyId: value.replyId,
                    replyPreview: value.replyPreview,
                    mentions: value.content.value.mentions,
                    editsEventId: editsEventId,
                    content: {
                        msgType: MessageType.Text,
                    },
                    attachments: toAttachments(value.content.value.attachments, eventId),
                } satisfies ChannelMessageEvent,
            }
        case 'image':
            return {
                content: {
                    kind: RiverTimelineEvent.ChannelMessage,
                    body: value.content.value.title,
                    threadId: value.threadId,
                    threadPreview: value.threadPreview,
                    mentions: [],
                    editsEventId: editsEventId,
                    content: {
                        msgType: MessageType.Image,
                        info: value.content.value.info,
                        thumbnail: value.content.value.thumbnail,
                    },
                } satisfies ChannelMessageEvent,
            }

        case 'gm':
            return {
                content: {
                    kind: RiverTimelineEvent.ChannelMessage,
                    body: value.content.value.typeUrl,
                    threadId: value.threadId,
                    threadPreview: value.threadPreview,
                    mentions: [],
                    editsEventId: editsEventId,
                    content: {
                        msgType: MessageType.GM,
                        data: value.content.value.value,
                    },
                } satisfies ChannelMessageEvent,
            }
        case undefined:
            return { error: `Undefined payload case: ${description}` }
        default:
            logNever(value.content)
            return { error: `Unknown payload case: ${description}` }
    }
}

function toTownsContent_SpacePayload(
    eventId: string,
    message: ParsedEvent,
    value: SpacePayload,
    description: string,
): EventContentResult {
    switch (value.content.case) {
        case 'inception': {
            return {
                content: {
                    kind: RiverTimelineEvent.Inception,
                    creatorId: message.creatorUserId,
                    type: message.event.payload.case,
                } satisfies InceptionEvent,
            }
        }
        case 'channel': {
            const payload = value.content.value
            const channelId = streamIdAsString(payload.channelId)
            return {
                content: {
                    kind: RiverTimelineEvent.ChannelCreate,
                    creatorId: message.creatorUserId,
                    channelId,
                    channelOp: payload.op,
                    channelSettings: payload.settings,
                } satisfies ChannelCreateEvent,
            }
        }
        case 'updateChannelAutojoin': {
            const payload = value.content.value
            const channelId = streamIdAsString(payload.channelId)
            return {
                content: {
                    kind: RiverTimelineEvent.SpaceUpdateAutojoin,
                    autojoin: payload.autojoin,
                    channelId: channelId,
                } satisfies SpaceUpdateAutojoinEvent,
            }
        }
        case 'updateChannelHideUserJoinLeaveEvents': {
            const payload = value.content.value
            const channelId = streamIdAsString(payload.channelId)
            return {
                content: {
                    kind: RiverTimelineEvent.SpaceUpdateHideUserJoinLeaves,
                    hideUserJoinLeaves: payload.hideUserJoinLeaveEvents,
                    channelId: channelId,
                } satisfies SpaceUpdateHideUserJoinLeavesEvent,
            }
        }
        case 'spaceImage': {
            return {
                content: {
                    kind: RiverTimelineEvent.SpaceImage,
                } satisfies SpaceImageEvent,
            }
        }
        case undefined:
            return { error: `Undefined payload case: ${description}` }
        default:
            logNever(value.content)
            return { error: `Unknown payload case: ${description}` }
    }
}

function getEventStatus(timelineEvent: StreamTimelineEvent): EventStatus {
    if (timelineEvent.remoteEvent) {
        return EventStatus.SENT
    } else if (timelineEvent.localEvent && timelineEvent.hashStr.startsWith('~')) {
        return EventStatus.ENCRYPTING
    } else if (timelineEvent.localEvent) {
        switch (timelineEvent.localEvent.status) {
            case 'failed':
                return EventStatus.NOT_SENT
            case 'sending':
                return EventStatus.SENDING
            case 'sent':
                return EventStatus.SENT
            default:
                logNever(timelineEvent.localEvent.status)
                return EventStatus.NOT_SENT
        }
    } else {
        return EventStatus.NOT_SENT
    }
}

function toAttachments(
    attachments: PlainMessage<ChannelMessage_Post_Attachment>[],
    parentEventId: string,
): Attachment[] {
    return attachments
        .map((attachment, index) => toAttachment(attachment, parentEventId, index))
        .filter(isDefined)
}

function toAttachment(
    attachment: PlainMessage<ChannelMessage_Post_Attachment>,
    parentEventId: string,
    index: number,
): Attachment | undefined {
    const id = `${parentEventId}-${index}`
    switch (attachment.content.case) {
        case 'chunkedMedia': {
            const info = attachment.content.value.info

            if (!info) {
                return undefined
            }

            const thumbnailInfo = attachment.content.value.thumbnail?.info
            const thumbnailContent = attachment.content.value.thumbnail?.content
            const thumbnail =
                thumbnailInfo && thumbnailContent
                    ? {
                          info: thumbnailInfo,
                          content: thumbnailContent,
                      }
                    : undefined

            const encryption =
                attachment.content.value.encryption.case === 'aesgcm'
                    ? attachment.content.value.encryption.value
                    : undefined
            if (!encryption) {
                return undefined
            }

            return {
                type: 'chunked_media',
                info,
                streamId: attachment.content.value.streamId,
                encryption,
                id,
                thumbnail: thumbnail,
            } satisfies ChunkedMediaAttachment
        }
        case 'embeddedMedia': {
            const info = attachment.content.value.info
            if (!info) {
                return undefined
            }
            return {
                type: 'embedded_media',
                info,
                content: attachment.content.value.content,
                id,
            } satisfies EmbeddedMediaAttachment
        }
        case 'image': {
            const info = attachment.content.value.info
            if (!info) {
                return undefined
            }
            return { type: 'image', info, id } satisfies ImageAttachment
        }
        case 'embeddedMessage': {
            const content = attachment.content.value
            if (!content?.post || !content?.info) {
                return undefined
            }
            const channelMessageEvent = toTownsContent_ChannelPayload_Message_Post(
                content.post,
                content.info.messageId,
                undefined,
                '',
            ).content

            return channelMessageEvent?.kind === RiverTimelineEvent.ChannelMessage
                ? ({
                      type: 'embedded_message',
                      ...content,
                      info: content.info,
                      channelMessageEvent: channelMessageEvent,
                      id,
                  } satisfies EmbeddedMessageAttachment)
                : undefined
        }
        case 'unfurledUrl': {
            const content = attachment.content.value
            return {
                type: 'unfurled_link',
                url: content.url,
                title: content.title,
                description: content.description,
                image: content.image,
                id,
            }
        }
        default:
            return undefined
    }
}

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
            return `Miniblock miniblockNum:${
                content.miniblockNum
            }, hasSnapshot:${content.hasSnapshot.toString()}`
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
        case RiverTimelineEvent.EncryptedChannelProperties:
            return `Decrypting Channel Properties...`
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
                return `channelId: ${content.channelId} autojoin: ${content.channelSettings.autojoin} hideUserJoinLeaves: ${content.channelSettings.hideUserJoinLeaveEvents}`
            }
            return `channelId: ${content.channelId}`
        case RiverTimelineEvent.SpaceUpdateAutojoin:
            return `channelId: ${content.channelId} autojoin: ${content.autojoin}`
        case RiverTimelineEvent.SpaceUpdateHideUserJoinLeaves:
            return `channelId: ${content.channelId} hideUserJoinLeaves: ${content.hideUserJoinLeaves}`
        case RiverTimelineEvent.SpaceImage:
            return `SpaceImage`
        case RiverTimelineEvent.Fulfillment:
            return `Fulfillment from: ${content.from} to: ${content.deviceKey} count: ${content.sessionIds.length} sessionIds: ${
                content.sessionIds.length ? content.sessionIds.join(',') : 'forNewDevice: true'
            }`
        case RiverTimelineEvent.KeySolicitation:
            return `KeySolicitation deviceKey: ${content.deviceKey} sessionIds: ${content.sessionIds.length} isNewDevice: ${content.isNewDevice}`
        case RiverTimelineEvent.ChannelMessageMissing:
            return `eventId: ${content.eventId}`
        case RiverTimelineEvent.ChannelMessageEncryptedWithRef:
            return `refEventId: ${content.refEventId}`
        case RiverTimelineEvent.Pin:
            return `pinnedEventId: ${content.pinnedEventId} by: ${content.userId}`
        case RiverTimelineEvent.Unpin:
            return `unpinnedEventId: ${content.unpinnedEventId} by: ${content.userId}`
        case RiverTimelineEvent.UserBlockchainTransaction:
            return getFallbackContent_BlockchainTransaction(content.transaction)
        case RiverTimelineEvent.MemberBlockchainTransaction:
            return `memberTransaction from: ${
                content.fromUserId
            } ${getFallbackContent_BlockchainTransaction(content.transaction)}`
        case RiverTimelineEvent.TipEvent:
            return `tip from: ${content.fromUserId} to: ${content.toUserId} refEventId: ${
                content.refEventId
            } amount: ${content.tip.event?.amount.toString() ?? '??'}`
        case RiverTimelineEvent.TokenTransfer:
            return `tokenTransfer from: ${content.fromUserId} amount: ${content.transfer.amount}`
        case RiverTimelineEvent.SpaceReview:
            return `spaceReview from: ${content.fromUserId} rating: ${content.rating} comment: ${content.comment}`
        case RiverTimelineEvent.UserReceivedBlockchainTransaction:
            return `kind: ${
                content.receivedTransaction.transaction?.content?.case ?? '??'
            } fromUserAddress: ${
                content.receivedTransaction.fromUserAddress
                    ? bin_toHexString(content.receivedTransaction.fromUserAddress)
                    : ''
            }`
        case RiverTimelineEvent.StreamEncryptionAlgorithm:
            return `algorithm: ${content.algorithm}`
        default:
            checkNever(content) // these are client side after parsing events, everything should be covered
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

function getThreadParentId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === RiverTimelineEvent.ChannelMessage ? content.threadId : undefined
}

function getReplyParentId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === RiverTimelineEvent.ChannelMessage ? content.replyId : undefined
}

function getReactionParentId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === RiverTimelineEvent.Reaction ? content.targetEventId : undefined
}

function getIsMentioned(content: TimelineEvent_OneOf | undefined, userId: string): boolean {
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

export function toMembership(membershipOp?: MembershipOp): Membership {
    switch (membershipOp) {
        case MembershipOp.SO_JOIN:
            return Membership.Join
        case MembershipOp.SO_INVITE:
            return Membership.Invite
        case MembershipOp.SO_LEAVE:
            return Membership.Leave
        case MembershipOp.SO_UNSPECIFIED:
            return Membership.None
        case undefined:
            return Membership.None
        default:
            checkNever(membershipOp)
    }
}

export function toReplacedMessageEvent(prev: TimelineEvent, next: TimelineEvent): TimelineEvent {
    if (!canReplaceEvent(prev, next)) {
        return prev
    } else if (
        next.content?.kind === RiverTimelineEvent.ChannelMessage &&
        prev.content?.kind === RiverTimelineEvent.ChannelMessage
    ) {
        // when we replace an event, we copy the content up to the root event
        // so we keep the prev id, but use the next content
        const isLocalId = prev.eventId.startsWith('~')
        const eventId = !isLocalId ? prev.eventId : next.eventId

        return {
            ...next,
            eventId: eventId,
            eventNum: prev.eventNum,
            latestEventId: next.eventId,
            latestEventNum: next.eventNum,
            confirmedEventNum: prev.confirmedEventNum ?? next.confirmedEventNum,
            confirmedInBlockNum: prev.confirmedInBlockNum ?? next.confirmedInBlockNum,
            createdAtEpochMs: prev.createdAtEpochMs,
            updatedAtEpochMs: next.createdAtEpochMs,
            content: {
                ...next.content,
                threadId: prev.content.threadId,
            },
            threadParentId: prev.threadParentId,
            reactionParentId: prev.reactionParentId,
            sender: prev.sender,
        }
    } else if (next.content?.kind === RiverTimelineEvent.RedactedEvent) {
        // for redacted events, carry over previous pointers to content
        // we don't want to lose thread info
        return {
            ...next,
            eventId: prev.eventId,
            eventNum: prev.eventNum,
            latestEventId: next.eventId,
            latestEventNum: next.eventNum,
            confirmedEventNum: prev.confirmedEventNum ?? next.confirmedEventNum,
            confirmedInBlockNum: prev.confirmedInBlockNum ?? next.confirmedInBlockNum,
            createdAtEpochMs: prev.createdAtEpochMs,
            updatedAtEpochMs: next.createdAtEpochMs,
            threadParentId: prev.threadParentId,
            reactionParentId: prev.reactionParentId,
        }
    } else if (prev.content?.kind === RiverTimelineEvent.RedactedEvent) {
        // replacing a redacted event should maintain the redacted state
        return {
            ...prev,
            latestEventId: next.eventId,
            latestEventNum: next.eventNum,
            confirmedEventNum: prev.confirmedEventNum ?? next.confirmedEventNum,
            confirmedInBlockNum: prev.confirmedInBlockNum ?? next.confirmedInBlockNum,
        }
    } else {
        // make sure we carry the createdAtEpochMs of the previous event
        // so we don't end up with a timeline that has events out of order.
        return {
            ...next,
            eventId: prev.eventId,
            eventNum: prev.eventNum,
            latestEventId: next.eventId,
            latestEventNum: next.eventNum,
            confirmedEventNum: prev.confirmedEventNum ?? next.confirmedEventNum,
            confirmedInBlockNum: prev.confirmedInBlockNum ?? next.confirmedInBlockNum,
            createdAtEpochMs: prev.createdAtEpochMs,
            updatedAtEpochMs: next.createdAtEpochMs,
        }
    }
}

function canReplaceEvent(prev: TimelineEvent, next: TimelineEvent): boolean {
    if (next.content?.kind === RiverTimelineEvent.RedactedEvent && next.content.isAdminRedaction) {
        return true
    }
    if (next.sender.id === prev.sender.id) {
        return true
    }
    return false
}

export function makeRedactionEvent(redactionAction: TimelineEvent): TimelineEvent {
    if (redactionAction.content?.kind !== RiverTimelineEvent.RedactionActionEvent) {
        throw new Error('makeRedactionEvent called with non-redaction action event')
    }
    const newContent = {
        kind: RiverTimelineEvent.RedactedEvent,
        isAdminRedaction: redactionAction.content.adminRedaction,
    } satisfies RedactedEvent

    return {
        ...redactionAction,
        content: newContent,
        fallbackContent: getFallbackContent('', newContent),
        isRedacted: true,
    }
}

export function getMessageSenderId(event: TimelineEvent): string | undefined {
    if (!getChannelMessageContent(event)) {
        return undefined
    }
    return event.sender.id
}

export function getChannelMessageContent(event?: TimelineEvent): ChannelMessageEvent | undefined {
    return event?.content?.kind === RiverTimelineEvent.ChannelMessage ? event.content : undefined
}
