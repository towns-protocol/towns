import { PlainMessage } from '@bufbuild/protobuf'
import {
    Client as CasablancaClient,
    EventStatus,
    ParsedEvent,
    StreamTimelineEvent,
    isCiphertext,
    isDefined,
    isRemoteEvent,
    isLocalEvent,
    logNever,
    LocalTimelineEvent,
    StreamChange,
    RemoteTimelineEvent,
    userIdFromAddress,
    streamIdFromBytes,
    streamIdAsString,
    RiverTimelineEvent,
} from '@river-build/sdk'
import {
    ChannelMessage_Post,
    UserPayload,
    ChannelPayload,
    EncryptedData,
    SpacePayload,
    MiniblockHeader,
    SnapshotCaseType,
    DmChannelPayload,
    GdmChannelPayload,
    ChannelMessage,
    ChannelMessage_Post_Attachment,
    MemberPayload,
} from '@river-build/proto'
import { useEffect } from 'react'
import { MessageType, toMembership } from '../../types/towns-types'
import {
    getIsMentioned,
    getReactionParentId,
    getThreadParentId,
    getReplyParentId,
    useTimelineStore,
} from '../../store/use-timeline-store'
import {
    getFallbackContent,
    MiniblockHeaderEvent,
    ReactionEvent,
    FulfillmentEvent,
    RedactionActionEvent,
    InceptionEvent,
    StreamMembershipEvent,
    ChannelMessageEncryptedEvent,
    ChannelMessageEvent,
    ChannelCreateEvent,
    SpaceDisplayNameEvent,
    SpaceUsernameEvent,
    TimelineEvent,
    TimelineEvent_OneOf,
    KeySolicitationEvent,
    ChannelPropertiesEvent,
    Attachment,
    ChunkedMediaAttachment,
    EmbeddedMediaAttachment,
    ImageAttachment,
    EmbeddedMessageAttachment,
    MemberBlockchainTransactionEvent,
    SpaceEnsAddressEvent,
    SpaceNftEvent,
    PinEvent,
    UnpinEvent,
    SpaceImageEvent,
    SpaceUpdateAutojoinEvent,
    SpaceUpdateHideUserJoinLeavesEvent,
    UserBlockchainTransactionEvent,
    UserReceivedBlockchainTransactionEvent,
    TipEvent,
} from '../../types/timeline-types'
import { useCallback } from 'react'
import { bin_toHexString, check } from '@river-build/dlog'

type SuccessResult = {
    content: TimelineEvent_OneOf
    error?: never
}

type ErrorResult = {
    content?: never
    error: string
}

type TownsContentResult = SuccessResult | ErrorResult

export function useCasablancaTimelines(
    casablancaClient: CasablancaClient | undefined,
    eventFilter?: Set<RiverTimelineEvent>,
    streamFilter?: Set<SnapshotCaseType>,
) {
    const hasTimelineContent = useCallback(
        (kind: SnapshotCaseType) => {
            if (!streamFilter) {
                return (
                    kind === 'channelContent' ||
                    kind === 'spaceContent' ||
                    kind === 'dmChannelContent' ||
                    kind === 'gdmChannelContent'
                )
            }
            if (streamFilter.size === 0) {
                return true
            }
            return streamFilter.has(kind)
        },
        [streamFilter],
    )
    const setState = useTimelineStore((s) => s.setState)
    useEffect(() => {
        if (!casablancaClient) {
            return
        }
        const userId = casablancaClient.userId

        const streamIds = new Set<string>()

        const filterFn = (event: TimelineEvent, kind: SnapshotCaseType | undefined) => {
            if (isDMMessageEventBlocked(event, kind, casablancaClient)) {
                return false
            }
            return !eventFilter || !event.content?.kind || !eventFilter.has(event.content.kind)
        }

        const onStreamInitialized = (streamId: string, kind: SnapshotCaseType) => {
            if (hasTimelineContent(kind)) {
                streamIds.add(streamId)
                const messages = casablancaClient.stream(streamId)?.view.timeline ?? []
                const timelineEvents = messages
                    .map((event) => toEvent(event, userId))
                    .filter((event) => filterFn(event, kind))
                setState.initializeStream(userId, streamId)
                setState.appendEvents(timelineEvents, userId, streamId)
            }
        }

        const onStreamUpdated = (
            streamId: string,
            kind: SnapshotCaseType,
            change: StreamChange,
        ) => {
            if (hasTimelineContent(kind)) {
                const { prepended, appended, updated, confirmed } = change
                streamIds.add(streamId)
                if (prepended) {
                    const events = prepended
                        .map((event) => toEvent(event, userId))
                        .filter((event) => filterFn(event, kind))
                    setState.prependEvents(events, userId, streamId)
                }
                if (appended) {
                    const events = appended
                        .map((event) => toEvent(event, userId))
                        .filter((event) => filterFn(event, kind))
                    setState.appendEvents(events, userId, streamId)
                }
                if (updated) {
                    const events = updated
                        .map((event) => toEvent(event, userId))
                        .filter((event) => filterFn(event, kind))
                    setState.updateEvents(events, userId, streamId)
                }
                if (confirmed) {
                    const confirmations = confirmed.map((event) => ({
                        eventId: event.hashStr,
                        confirmedInBlockNum: event.miniblockNum,
                        confirmedEventNum: event.confirmedEventNum,
                    }))
                    setState.confirmEvents(confirmations, streamId)
                }
            }
        }

        const onStreamLocalEventUpdated = (
            streamId: string,
            kind: SnapshotCaseType,
            localEventId: string,
            localEvent: LocalTimelineEvent,
        ) => {
            if (hasTimelineContent(kind)) {
                streamIds.add(streamId)
                const event = toEvent(localEvent, userId)
                if (filterFn(event, kind)) {
                    setState.updateEvent(event, userId, streamId, localEventId)
                }
            }
        }

        //Initialize events that already exist in the client before the listeners started
        const timelineEvents: Map<string, TimelineEvent[]> = new Map()
        //Step 1: get all the events which are already in the river before listeners started
        casablancaClient?.streams.getStreams().forEach((stream) => {
            if (hasTimelineContent(stream.view.contentKind)) {
                streamIds.add(stream.streamId)
                timelineEvents.set(stream.streamId, [])
                console.log('$$$ useCasablancaTimelines load streamId', stream.streamId)
                stream.view.timeline.forEach((event) => {
                    const parsedEvent = toEvent(event, casablancaClient.userId)
                    if (
                        !isDMMessageEventBlocked(
                            parsedEvent,
                            stream.view.contentKind,
                            casablancaClient,
                        )
                    ) {
                        timelineEvents.get(stream.streamId)?.push(parsedEvent)
                    }
                })
            }
        })

        //Step 2: add them into the timeline
        timelineEvents.forEach((events, streamId) => {
            setState.initializeStream(userId, streamId)
            setState.appendEvents(
                events.filter((event) =>
                    filterFn(event, casablancaClient?.streams.get(streamId)?.view.contentKind),
                ),
                userId,
                streamId,
            )
        })

        casablancaClient.on('streamInitialized', onStreamInitialized)
        casablancaClient.on('streamUpdated', onStreamUpdated)
        casablancaClient.on('streamLocalEventUpdated', onStreamLocalEventUpdated)

        return () => {
            casablancaClient.off('streamInitialized', onStreamInitialized)
            casablancaClient.off('streamUpdated', onStreamUpdated)
            casablancaClient.off('streamLocalEventUpdated', onStreamLocalEventUpdated)
            setState.reset(Array.from(streamIds))
        }
    }, [casablancaClient, setState, eventFilter, hasTimelineContent])
}

export function toEvent(timelineEvent: StreamTimelineEvent, userId: string): TimelineEvent {
    const eventId = timelineEvent.hashStr
    const senderId = timelineEvent.creatorUserId

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
): TownsContentResult {
    return {
        content: {
            kind: RiverTimelineEvent.MiniblockHeader,
            message: value,
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
        case 'mls':
            return {
                error: `MLS not supported: ${description}`,
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
    description: string,
): TownsContentResult {
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
    return { error: `${description} encrypted channel properties` }
}

function toTownsContent_ChannelPayload_Message_Post(
    value: PlainMessage<ChannelMessage_Post>,
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
        console.error('$$$ useCasablancaTimelines unknown event status', { timelineEvent })
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
                console.error('$$$ useCasablancaTimelines invalid chunkedMedia attachment', {
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
                console.error('$$$ useCasablancaTimelines invalid chunkedMedia encryption', {
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
        default:
            return undefined
    }
}

function isDMMessageEventBlocked(
    event: TimelineEvent,
    kind: SnapshotCaseType,
    casablancaClient: CasablancaClient,
) {
    if (kind !== 'dmChannelContent') {
        return false
    }
    if (!casablancaClient?.userSettingsStreamId) {
        return false
    }
    const stream = casablancaClient.stream(casablancaClient.userSettingsStreamId)
    check(isDefined(stream), 'stream must be defined')
    return stream.view.userSettingsContent.isUserBlockedAt(event.sender.id, event.eventNum)
}
