import { PlainMessage } from '@bufbuild/protobuf'
import {
    Client as CasablancaClient,
    ParsedEvent,
    StreamTimelineEvent,
    isCiphertext,
    isDefined,
    isRemoteEvent,
    isDecryptedEvent,
    isLocalEvent,
    logNever,
    LocalTimelineEvent,
    StreamChange,
    DecryptedTimelineEvent,
    RemoteTimelineEvent,
} from '@river/sdk'
import {
    MembershipOp,
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
    CommonPayload,
    ChannelProperties,
    ChannelMessage_Post_Attachment,
} from '@river/proto'
import { useEffect } from 'react'
import { Membership, MessageType } from '../../types/zion-types'
import {
    getIsMentioned,
    getReactionParentId,
    getThreadParentId,
    useTimelineStore,
} from '../../store/use-timeline-store'
import {
    getFallbackContent,
    MiniblockHeaderEvent,
    ReactionEvent,
    FulfillmentEvent,
    RedactionActionEvent,
    RoomCreateEvent,
    RoomMemberEvent,
    RoomMessageEncryptedEvent,
    RoomMessageEvent,
    SpaceChildEvent,
    SpaceDisplayNameEvent,
    SpaceUsernameEvent,
    TimelineEvent,
    TimelineEvent_OneOf,
    ZTEvent,
    KeySolicitationEvent,
    RoomPropertiesEvent,
    Attachment,
    ChunkedMediaAttachment,
    EmbeddedMediaAttachment,
    ImageAttachment,
    EventStatus,
    RoomMessageEventContent_ChunkedMedia,
} from '../../types/timeline-types'

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
    eventFilter?: Set<ZTEvent>,
) {
    const setState = useTimelineStore((s) => s.setState)
    useEffect(() => {
        if (!casablancaClient) {
            return
        }
        const userId = casablancaClient.userId

        const streamIds = new Set<string>()

        const filterFn = (event: TimelineEvent) => {
            return !eventFilter || !event.content?.kind || !eventFilter.has(event.content.kind)
        }

        const onStreamInitialized = (streamId: string, kind: SnapshotCaseType) => {
            if (hasTimelineContent(kind)) {
                streamIds.add(streamId)
                const messages = casablancaClient.stream(streamId)?.view.timeline ?? []
                const timelineEvents = messages
                    .map((event) => toEvent(event, userId))
                    .filter(filterFn)
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
                    const events = prepended.map((event) => toEvent(event, userId)).filter(filterFn)
                    setState.prependEvents(events, userId, streamId)
                }
                if (appended) {
                    const events = appended.map((event) => toEvent(event, userId)).filter(filterFn)
                    setState.appendEvents(events, userId, streamId)
                }
                if (updated) {
                    const events = updated.map((event) => toEvent(event, userId)).filter(filterFn)
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

        const onStreamLocalEventIdReplaced = (
            streamId: string,
            kind: SnapshotCaseType,
            localEventId: string,
            localEvent: LocalTimelineEvent,
        ) => {
            if (hasTimelineContent(kind)) {
                streamIds.add(streamId)
                const event = toEvent(localEvent, userId)
                if (filterFn(event)) {
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
                    timelineEvents.get(stream.streamId)?.push(parsedEvent)
                })
            }
        })

        //Step 2: add them into the timeline
        timelineEvents.forEach((events, streamId) => {
            setState.initializeStream(userId, streamId)
            setState.appendEvents(events.filter(filterFn), userId, streamId)
        })

        casablancaClient.on('streamInitialized', onStreamInitialized)
        casablancaClient.on('streamUpdated', onStreamUpdated)
        casablancaClient.on('streamLocalEventUpdated', onStreamLocalEventIdReplaced)

        return () => {
            casablancaClient.off('streamInitialized', onStreamInitialized)
            casablancaClient.off('streamUpdated', onStreamUpdated)
            casablancaClient.off('streamLocalEventUpdated', onStreamLocalEventIdReplaced)
            setState.reset(Array.from(streamIds))
        }
    }, [casablancaClient, setState, eventFilter])
}

export function toEvent(timelineEvent: StreamTimelineEvent, userId: string): TimelineEvent {
    const eventId = timelineEvent.hashStr
    const creatorUserId = timelineEvent.creatorUserId
    const sender = {
        id: creatorUserId,
        displayName: creatorUserId, // todo displayName
        avatarUrl: undefined, // todo avatarUrl
    }

    const { content, error } = toTownsContent(timelineEvent)
    const isSender = sender.id === userId
    const fbc = `${content?.kind ?? '??'} ${getFallbackContent(sender.displayName, content, error)}`

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
        status: isSender ? getEventStatus(timelineEvent) : undefined,
        createdAtEpocMs: Number(timelineEvent.createdAtEpocMs),
        updatedAtEpocMs: undefined,
        content: content,
        fallbackContent: fbc,
        isEncrypting: eventId.startsWith('~'),
        isLocalPending: timelineEvent.remoteEvent === undefined,
        isSendFailed: timelineEvent.localEvent?.status === 'failed',
        confirmedEventNum: timelineEvent.confirmedEventNum,
        confirmedInBlockNum: timelineEvent.miniblockNum,
        threadParentId: getThreadParentId(content),
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
    } else if (isDecryptedEvent(timelineEvent)) {
        return toTownsContent_fromDecryptedEvent(timelineEvent.hashStr, timelineEvent)
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

function toTownsContent_fromDecryptedEvent(
    eventId: string,
    message: DecryptedTimelineEvent,
): TownsContentResult {
    const description = `${message.decryptedContent.kind} id: ${eventId}`

    switch (message.decryptedContent.kind) {
        case 'text':
            return { error: `payload contains only text: ${message.decryptedContent.content}` }
        case 'channelMessage':
            return toTownsContent_FromChannelMessage(
                message.decryptedContent.content,
                description,
                eventId,
            )
        case 'channelProperties':
            return toTownsContent_FromChannelProperties(message.decryptedContent.content)
        default:
            logNever(message.decryptedContent)
            return { error: `Unknown payload case: ${description}` }
    }
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
                eventId,
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
        case 'userDeviceKeyPayload':
            return {
                error: `${description} userDeviceKeyPayload not supported?`,
            }
        case 'userSettingsPayload':
            return {
                error: `${description} userSettingsPayload not supported?`,
            }
        case 'userToDevicePayload':
            return {
                error: `${description} userToDevicePayload not supported?`,
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
        case 'commonPayload':
            return toTownsContent_CommonPayload(
                eventId,
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
            kind: ZTEvent.MiniblockHeader,
            message: value,
        } satisfies MiniblockHeaderEvent,
    }
}

function toTownsContent_CommonPayload(
    eventId: string,
    message: ParsedEvent,
    value: CommonPayload,
    description: string,
): TownsContentResult {
    switch (value.content.case) {
        case 'keySolicitation':
            return {
                content: {
                    kind: ZTEvent.KeySolicitation,
                    sessionIds: value.content.value.sessionIds,
                    deviceKey: value.content.value.deviceKey,
                    isNewDevice: value.content.value.isNewDevice,
                } satisfies KeySolicitationEvent,
            }
        case 'keyFulfillment':
            return {
                content: {
                    kind: ZTEvent.Fulfillment,
                    sessionIds: value.content.value.sessionIds,
                    deviceKey: value.content.value.deviceKey,
                    to: value.content.value.userId,
                    from: message.creatorUserId,
                } satisfies FulfillmentEvent, // make a real thing
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
    eventId: string,
    message: ParsedEvent,
    value: UserPayload,
    description: string,
): TownsContentResult {
    switch (value.content.case) {
        case 'inception': {
            return {
                content: {
                    kind: ZTEvent.RoomCreate,
                    creator: message.creatorUserId,
                    predecessor: undefined, // todo is this needed?
                    type: message.event.payload.case,
                } satisfies RoomCreateEvent,
            }
        }
        case 'userMembership': {
            const payload = value.content.value
            return {
                content: {
                    kind: ZTEvent.RoomMember,
                    userId: payload.inviterId, // TODO: this is incorrect, userId should be set to the owner of the stream. Somebody else could have invited the user.
                    avatarUrl: undefined, // todo avatarUrl
                    displayName: '---TODO---', // todo displayName
                    isDirect: undefined, // todo is this needed?
                    membership: toMembership(payload.op),
                    streamId: payload.streamId,
                } satisfies RoomMemberEvent,
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
                    kind: ZTEvent.RoomCreate,
                    creator: message.creatorUserId,
                    predecessor: undefined, // todo is this needed?
                    type: message.event.payload.case,
                } satisfies RoomCreateEvent,
            }
        }
        case 'membership': {
            const payload = value.content.value
            return {
                content: {
                    kind: ZTEvent.RoomMember,
                    userId: payload.userId,
                    avatarUrl: undefined, // todo avatarUrl
                    displayName: payload.userId, // todo displayName
                    isDirect: undefined, // todo is this needed?
                    membership: toMembership(payload.op),
                    reason: undefined, // todo is this needed?
                } satisfies RoomMemberEvent,
            }
        }
        case 'message': {
            const payload = value.content.value
            return toTownsContent_ChannelPayload_Message(timelineEvent, payload, description)
        }
        case 'displayName':
        case 'username':
            return { error: `${description} displayName/username not supported` }
        case 'channelProperties': {
            const payload = value.content.value
            return toTownsContent_ChannelPayload_ChannelProperties(
                timelineEvent,
                payload,
                description,
            )
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
                    kind: ZTEvent.Reaction,
                    reaction: channelMessage.payload.value.reaction,
                    targetEventId: channelMessage.payload.value.refEventId,
                } satisfies ReactionEvent,
            }
        case 'redaction':
            return {
                content: {
                    kind: ZTEvent.RedactionActionEvent,
                    refEventId: channelMessage.payload.value.refEventId,
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

function toTownsContent_FromChannelProperties(
    channelProperties: ChannelProperties,
): TownsContentResult {
    return {
        content: {
            kind: ZTEvent.RoomProperties,
            properties: channelProperties,
        } satisfies RoomPropertiesEvent,
    }
}

function toTownsContent_ChannelPayload_Message(
    timelineEvent: StreamTimelineEvent,
    payload: EncryptedData,
    description: string,
): TownsContentResult {
    if (isCiphertext(payload.ciphertext)) {
        return {
            // if payload is an EncryptedData message, than it is encrypted content kind
            content: {
                kind: ZTEvent.RoomMessageEncrypted,
                error: timelineEvent.decryptedContentError,
            } satisfies RoomMessageEncryptedEvent,
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
    // If the payload is encrypted, we display nothing.
    return { error: `${description} invalid channel properties` }
}

function toTownsContent_ChannelPayload_Message_Post(
    value: ChannelMessage_Post | PlainMessage<ChannelMessage_Post>,
    eventId: string,
    editsEventId: string | undefined,
    description: string,
): TownsContentResult {
    switch (value.content.case) {
        case 'text':
            return {
                content: {
                    kind: ZTEvent.RoomMessage,
                    body: value.content.value.body,
                    inReplyTo: value.threadId,
                    threadPreview: value.threadPreview,
                    mentions: value.content.value.mentions,
                    editsEventId: editsEventId,
                    content: {
                        msgType: MessageType.Text,
                    },
                    attachments: toAttachments(value.content.value.attachments, eventId),
                } satisfies RoomMessageEvent,
            }
        case 'image':
            return {
                content: {
                    kind: ZTEvent.RoomMessage,
                    body: value.content.value.title,
                    inReplyTo: value.threadId,
                    threadPreview: value.threadPreview,
                    mentions: [],
                    editsEventId: editsEventId,
                    content: {
                        msgType: MessageType.Image,
                        info: value.content.value.info,
                        thumbnail: value.content.value.thumbnail,
                    },
                } satisfies RoomMessageEvent,
            }

        case 'gm':
            return {
                content: {
                    kind: ZTEvent.RoomMessage,
                    body: value.content.value.typeUrl,
                    inReplyTo: value.threadId,
                    threadPreview: value.threadPreview,
                    mentions: [],
                    editsEventId: editsEventId,
                    content: {
                        msgType: MessageType.GM,
                        data: value.content.value.value,
                    },
                } satisfies RoomMessageEvent,
            }
        case 'embeddedMedia':
            return {
                content: {
                    kind: ZTEvent.RoomMessage,
                    body: '',
                    inReplyTo: value.threadId,
                    threadPreview: value.threadPreview,
                    mentions: [],
                    editsEventId: editsEventId,
                    content: {
                        msgType: MessageType.EmbeddedMedia,
                        content: value.content.value.content,
                        mimetype: value.content.value.info?.mimetype,
                        widthPixels: value.content.value.info?.widthPixels,
                        heightPixels: value.content.value.info?.heightPixels,
                        sizeBytes: value.content.value.info?.sizeBytes,
                    },
                } satisfies RoomMessageEvent,
            }
        case 'chunkedMedia':
            return {
                content: {
                    kind: ZTEvent.RoomMessage,
                    body: '',
                    inReplyTo: value.threadId,
                    threadPreview: value.threadPreview,
                    mentions: [],
                    editsEventId: editsEventId,
                    content: {
                        msgType: MessageType.ChunkedMedia,
                        streamId: value.content.value.streamId,
                        mimetype: value.content.value.info?.mimetype,
                        widthPixels: value.content.value.info?.widthPixels,
                        heightPixels: value.content.value.info?.heightPixels,
                        filename: value.content.value.info?.filename,
                        sizeBytes: value.content.value.info?.sizeBytes,
                        iv: value.content.value.encryption.value?.iv,
                        secretKey: value.content.value.encryption.value?.secretKey,
                        thumbnail: value.content.value.thumbnail?.content,
                    } satisfies RoomMessageEventContent_ChunkedMedia,
                } satisfies RoomMessageEvent,
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
                    kind: ZTEvent.RoomCreate,
                    creator: message.creatorUserId,
                    predecessor: undefined, // todo is this needed?
                    type: message.event.payload.case,
                } satisfies RoomCreateEvent,
            }
        }
        case 'channel': {
            const payload = value.content.value
            const childId = payload.channelId
            return {
                content: {
                    kind: ZTEvent.SpaceChild,
                    childId: childId,
                    channelOp: payload.op,
                } satisfies SpaceChildEvent,
            }
        }
        case 'membership': {
            const payload = value.content.value
            return {
                content: {
                    kind: ZTEvent.RoomMember,
                    userId: payload.userId,
                    avatarUrl: undefined, // todo avatarUrl
                    displayName: payload.userId, // todo displayName
                    isDirect: undefined, // todo is this needed?
                    membership: toMembership(payload.op),
                    reason: undefined, // todo is this needed?
                } satisfies RoomMemberEvent,
            }
        }
        case 'username': {
            // todo: HNT-2845 - implementation for reflecting username changes in app
            // todo: HNT-2774 - integration with encryption module
            const payload = value.content.value
            return {
                content: {
                    kind: ZTEvent.SpaceUsername,
                    userId: message.creatorUserId,
                    username: payload.ciphertext,
                } satisfies SpaceUsernameEvent,
            }
        }
        case 'displayName': {
            // todo: HNT-2845 - implementation for reflecting username changes in app
            // todo: HNT-2774 - integration with encryption module
            const payload = value.content.value
            return {
                content: {
                    kind: ZTEvent.SpaceDisplayName,
                    userId: message.creatorUserId,
                    displayName: payload.ciphertext,
                } satisfies SpaceDisplayNameEvent,
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

function toMembership(op: MembershipOp): Membership {
    switch (op) {
        case MembershipOp.SO_JOIN:
            return Membership.Join
        case MembershipOp.SO_LEAVE:
            return Membership.Leave
        case MembershipOp.SO_INVITE:
            return Membership.Invite
    }
    return Membership.None
}

function hasTimelineContent(kind: SnapshotCaseType): boolean {
    return (
        kind === 'channelContent' ||
        kind === 'spaceContent' ||
        kind === 'dmChannelContent' ||
        kind === 'gdmChannelContent'
    )
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
            const encryption = attachment.content.value.encryption.value
            if (!info || !encryption) {
                return undefined
            }
            return {
                type: 'chunked_media',
                info,
                streamId: attachment.content.value.streamId,
                encryption: encryption,
                id,
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
        default:
            return undefined
    }
}
