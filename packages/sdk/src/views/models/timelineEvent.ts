import {
    ChannelMessage,
    ChannelMessage_Post,
    ChannelMessage_Post_Attachment,
    ChannelPayload,
    DmChannelPayload,
    GdmChannelPayload,
    SpacePayload,
    EncryptedData,
    MemberPayload,
    MiniblockHeader,
    UserPayload,
    MembershipOp,
    BlockchainTransaction,
    PlainMessage,
} from '@towns-protocol/proto'
import {
    TimelineEvent,
    ChunkedMediaAttachment,
    Attachment,
    ChannelCreateEvent,
    EventStatus,
    InceptionEvent,
    RiverTimelineEvent,
    SpaceImageEvent,
    SpaceUpdateAutojoinEvent,
    SpaceUpdateHideUserJoinLeavesEvent,
    TimelineEvent_OneOf,
    MiniblockHeaderEvent,
    StreamMembershipEvent,
    KeySolicitationEvent,
    SpaceDisplayNameEvent,
    FulfillmentEvent,
    SpaceUsernameEvent,
    SpaceEnsAddressEvent,
    SpaceNftEvent,
    PinEvent,
    UnpinEvent,
    TipEvent,
    SpaceReviewEvent,
    TokenTransferEvent,
    MemberBlockchainTransactionEvent,
    UserBlockchainTransactionEvent,
    UserReceivedBlockchainTransactionEvent,
    RedactionActionEvent,
    ReactionEvent,
    ChannelMessageEncryptedEvent,
    ChannelPropertiesEvent,
    MessageType,
    ChannelMessageEvent,
    EmbeddedMediaAttachment,
    ImageAttachment,
    EmbeddedMessageAttachment,
    TickerAttachment,
    EncryptedChannelPropertiesEvent,
    Membership,
    getIsMentioned,
    getReactionParentId,
    getReplyParentId,
    getThreadParentId,
} from './timelineTypes'
import { checkNever, isDefined, logNever } from '../../check'
import {
    isLocalEvent,
    isRemoteEvent,
    ParsedEvent,
    RemoteTimelineEvent,
    StreamTimelineEvent,
} from '../../types'
import { streamIdAsString, streamIdFromBytes, userIdFromAddress } from '../../id'
import { bin_toHexString, dlogger } from '@towns-protocol/dlog'
import { getSpaceReviewEventDataBin } from '@towns-protocol/web3'
import { DecryptedContent } from '../../encryptedContentTypes'
import { DecryptionSessionError } from '../../decryptionExtensions'

const logger = dlogger('csb:timeline')

type SuccessResult = {
    content: TimelineEvent_OneOf
    error?: never
}

type ErrorResult = {
    content?: never
    error: string
}

type TownsContentResult = SuccessResult | ErrorResult

export function toEvent(timelineEvent: StreamTimelineEvent, userId: string): TimelineEvent {
    const eventId = timelineEvent.hashStr
    const senderId = getSenderId(timelineEvent)

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

        return payload.value.content.value.sessionIdBytes.length > 0
            ? bin_toHexString(payload.value.content.value.sessionIdBytes)
            : payload.value.content.value.sessionId
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

function getSenderId(timelineEvent: StreamTimelineEvent): string {
    const payload = timelineEvent.remoteEvent?.event.payload
    if (
        payload?.case === 'memberPayload' &&
        payload?.value.content.case === 'memberBlockchainTransaction'
    ) {
        return userIdFromAddress(payload.value.content.value.fromUserAddress)
    }
    return timelineEvent.creatorUserId
}

function toTownsContent(timelineEvent: StreamTimelineEvent): TownsContentResult {
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
): TownsContentResult {
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
                error: `${description} userMetadataPayload not implemented`,
            }
        case 'userSettingsPayload':
            return {
                error: `${description} userSettingsPayload not implemented`,
            }
        case 'userInboxPayload':
            return {
                error: `${description} userInboxPayload not implemented`,
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
        case 'metadataPayload':
            return {
                error: `${description} metadataPayload not supported for timeline events`,
            }
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
): TownsContentResult {
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
): TownsContentResult {
    switch (value.content.case) {
        case 'membership':
            return {
                content: {
                    kind: RiverTimelineEvent.StreamMembership,
                    userId: userIdFromAddress(value.content.value.userAddress),
                    initiatorId: userIdFromAddress(value.content.value.initiatorAddress),
                    membership: toMembership(value.content.value.op),
                    reason: value.content.value.reason,
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
        case 'memberBlockchainTransaction': {
            const fromUserAddress = value.content.value.fromUserAddress
            const transaction = value.content.value.transaction
            if (!transaction) {
                return { error: `${description} no transaction` }
            }
            switch (transaction.content.case) {
                case 'tip': {
                    if (!transaction.receipt?.transactionHash) {
                        return { error: `${description} no transactionHash` }
                    }
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
                case 'tokenTransfer': {
                    const transferContent = transaction.content.value
                    return {
                        content: {
                            kind: RiverTimelineEvent.TokenTransfer,
                            transaction: transaction,
                            transfer: transferContent,
                            fromUserId: userIdFromAddress(fromUserAddress),
                            createdAtEpochMs: event.createdAtEpochMs,
                            threadParentId: bin_toHexString(transferContent.messageId),
                        } satisfies TokenTransferEvent,
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
        case 'encryptionAlgorithm':
            return {
                error: `Encryption Algorithm not supported: ${description}`,
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
): TownsContentResult {
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
            return {
                content: {
                    kind: RiverTimelineEvent.UserBlockchainTransaction,
                    transaction: value.content.value,
                } satisfies UserBlockchainTransactionEvent,
            }
        }
        case 'receivedBlockchainTransaction': {
            return {
                content: {
                    kind: RiverTimelineEvent.UserReceivedBlockchainTransaction,
                    receivedTransaction: value.content.value,
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
): TownsContentResult {
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
): TownsContentResult {
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
    _description: string,
): TownsContentResult {
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

function toTownsContent_ChannelPayload_ChannelProperties(
    timelineEvent: StreamTimelineEvent,
    _payload: EncryptedData,
    _description: string,
): TownsContentResult {
    if (timelineEvent.decryptedContent?.kind === 'channelProperties') {
        return {
            content: {
                kind: RiverTimelineEvent.ChannelProperties,
                properties: timelineEvent.decryptedContent.content,
            } satisfies ChannelPropertiesEvent,
        }
    }
    // If the payload is encrypted, we display nothing.
    return {
        content: {
            kind: RiverTimelineEvent.EncryptedChannelProperties,
            error: timelineEvent.decryptedContentError,
        } satisfies EncryptedChannelPropertiesEvent,
    }
}

function toTownsContent_ChannelPayload_Message_Post(
    value: ChannelMessage_Post,
    eventId: string,
    editsEventId: string | undefined,
    description: string,
): TownsContentResult {
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
): TownsContentResult {
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
            const childId = streamIdAsString(payload.channelId)
            return {
                content: {
                    kind: RiverTimelineEvent.ChannelCreate,
                    creatorId: message.creatorUserId,
                    channelId: childId,
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
        logger.error('$$$ timelineStoreEvents unknown event status', { timelineEvent })
        return EventStatus.NOT_SENT
    }
}

function toAttachments(
    attachments: ChannelMessage_Post_Attachment[],
    parentEventId: string,
): Attachment[] {
    return attachments
        .map((attachment, index) => toAttachment(attachment, parentEventId, index))
        .filter(isDefined)
}

function toAttachment(
    attachment: ChannelMessage_Post_Attachment,
    parentEventId: string,
    index: number,
): Attachment | undefined {
    const id = `${parentEventId}-${index}`
    switch (attachment.content.case) {
        case 'chunkedMedia': {
            const info = attachment.content.value.info

            if (!info) {
                logger.error('$$$ timelineStoreEvents invalid chunkedMedia attachment', {
                    attachment,
                })
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
                logger.error('$$$ timelineStoreEvents invalid chunkedMedia encryption', {
                    attachment,
                })
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
        case 'ticker': {
            const content = attachment.content.value
            return {
                id,
                type: 'ticker',
                address: content.address,
                chainId: content.chainId,
            } satisfies TickerAttachment
        }
        default:
            return undefined
    }
}

/// fill in the event with the decrypted content
/// i don't love this since it duplicates code, but it makes it so that we don't have to keep the
/// original RemoteTimelineEvent around in memory
export function toDecryptedEvent(
    event: TimelineEvent,
    decryptedContent: DecryptedContent,
    userId: string,
): TimelineEvent {
    if (!event.content) {
        logger.error('$$$ timelineStoreEvents invalid event in toDecryptedEvent', {
            event,
            decryptedContent,
        })
        return event
    }
    switch (event.content.kind) {
        case RiverTimelineEvent.ChannelMessageEncrypted:
        case RiverTimelineEvent.ChannelMessageEncryptedWithRef: {
            if (decryptedContent.kind === 'channelMessage') {
                const { content, error } = toTownsContent_FromChannelMessage(
                    decryptedContent.content,
                    `ChannelMessage: ${event.eventId}`,
                    event.eventId,
                )
                if (error) {
                    return event
                }
                return {
                    ...event,
                    content,
                    threadParentId: getThreadParentId(content),
                    replyParentId: getReplyParentId(content),
                    reactionParentId: getReactionParentId(content),
                    isMentioned: getIsMentioned(content, userId),
                }
            } else {
                logger.error('$$$ timelineStoreEvents invalid channelMessageEncrypted', {
                    event,
                    decryptedContent,
                })
                return event
            }
        }
        case RiverTimelineEvent.SpaceDisplayName: {
            if (decryptedContent.kind === 'text') {
                return {
                    ...event,
                    content: {
                        ...event.content,
                        displayName: decryptedContent.content,
                    },
                }
            } else {
                logger.error('$$$ timelineStoreEvents invalid spaceDisplayName', {
                    event,
                    decryptedContent,
                })
                return event
            }
        }
        case RiverTimelineEvent.SpaceUsername: {
            if (decryptedContent.kind === 'text') {
                return {
                    ...event,
                    content: {
                        ...event.content,
                        username: decryptedContent.content,
                    },
                }
            } else {
                logger.error('$$$ timelineStoreEvents invalid spaceUsername', {
                    event,
                    decryptedContent,
                })
                return event
            }
        }
        case RiverTimelineEvent.EncryptedChannelProperties: {
            if (decryptedContent.kind === 'channelProperties') {
                return {
                    ...event,
                    content: {
                        kind: RiverTimelineEvent.ChannelProperties,
                        properties: decryptedContent.content,
                    } satisfies ChannelPropertiesEvent,
                }
            } else {
                logger.error('$$$ timelineStoreEvents invalid encryptedChannelProperties', {
                    event,
                    decryptedContent,
                })
                return event
            }
        }
        case RiverTimelineEvent.ChannelCreate:
        case RiverTimelineEvent.ChannelMessage:
        case RiverTimelineEvent.ChannelMessageMissing:
        case RiverTimelineEvent.ChannelProperties:
        case RiverTimelineEvent.Inception:
        case RiverTimelineEvent.KeySolicitation:
        case RiverTimelineEvent.Fulfillment:
        case RiverTimelineEvent.MemberBlockchainTransaction:
        case RiverTimelineEvent.MiniblockHeader:
        case RiverTimelineEvent.Pin:
        case RiverTimelineEvent.Reaction:
        case RiverTimelineEvent.RedactedEvent:
        case RiverTimelineEvent.RedactionActionEvent:
        case RiverTimelineEvent.SpaceEnsAddress:
        case RiverTimelineEvent.SpaceNft:
        case RiverTimelineEvent.SpaceReview:
        case RiverTimelineEvent.TokenTransfer:
        case RiverTimelineEvent.TipEvent:
        case RiverTimelineEvent.SpaceUpdateAutojoin:
        case RiverTimelineEvent.SpaceUpdateHideUserJoinLeaves:
        case RiverTimelineEvent.SpaceImage:
        case RiverTimelineEvent.StreamEncryptionAlgorithm:
        case RiverTimelineEvent.StreamMembership:
        case RiverTimelineEvent.Unpin:
        case RiverTimelineEvent.UserBlockchainTransaction:
        case RiverTimelineEvent.UserReceivedBlockchainTransaction:
            return event
        default:
            logNever(event.content)
            return event
    }
}

export function toDecryptedContentErrorEvent(
    event: TimelineEvent,
    error: DecryptionSessionError,
): TimelineEvent {
    switch (event.content?.kind) {
        case RiverTimelineEvent.ChannelMessageEncrypted:
        case RiverTimelineEvent.EncryptedChannelProperties:
            return {
                ...event,
                content: {
                    ...event.content,
                    error,
                },
            }
            break
    }
    return event
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
            return (
                `[${content.membership}] userId: ${content.userId} initiatorId: ${content.initiatorId}` +
                (content.reason ? ` reason: ${content.reason}` : '')
            )
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
