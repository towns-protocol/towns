import { PlainMessage } from '@bufbuild/protobuf'
import {
    Client as CasablancaClient,
    ParsedEvent,
    StreamTimelineEvent,
    getStreamPayloadCase,
    isCiphertext,
    isRemoteEvent,
    logNever,
    RiverEventV2,
    bin_toString,
    isDecryptedEvent,
    isLocalEvent,
    LocalTimelineEvent,
    StreamChange,
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
} from '../../types/timeline-types'
import { EventStatus } from 'matrix-js-sdk'

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
        casablancaClient?.streams.forEach((stream) => {
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
        casablancaClient.on('streamLocalEventIdReplaced', onStreamLocalEventIdReplaced)

        return () => {
            casablancaClient.off('streamInitialized', onStreamInitialized)
            casablancaClient.off('streamUpdated', onStreamUpdated)
            casablancaClient.off('streamLocalEventIdReplaced', onStreamLocalEventIdReplaced)
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
        status: isSender ? getEventStatus(timelineEvent) : undefined, // todo: set status for events this user sent
        createdAtEpocMs: Number(timelineEvent.createdAtEpocMs),
        updatedAtEpocMs: undefined,
        content: content,
        fallbackContent: fbc,
        isEncrypting: eventId.startsWith('~'),
        isLocalPending: timelineEvent.remoteEvent === undefined,
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
        )
    } else if (isDecryptedEvent(timelineEvent)) {
        return toTownsContent_fromRiverEvent(timelineEvent.hashStr, timelineEvent.decryptedContent)
    } else if (isRemoteEvent(timelineEvent)) {
        return toTownsContent_fromParsedEvent(timelineEvent.hashStr, timelineEvent.remoteEvent)
    } else {
        return { error: 'unknown event content type' }
    }
}

function validateEvent_fromRiverEventV2(
    eventId: string,
    message: RiverEventV2,
): Partial<ErrorResult> & { description?: string } {
    let error: ErrorResult
    // handle RiverEventV2
    const streamId = message.getStreamId()
    const payloadCase = getStreamPayloadCase(streamId)

    const content = message.getWireContent()
    if (!content.text || !message.wireEvent?.event.payload?.value) {
        error = { error: 'payloadless payload' }
        return error
    }
    if (!message.wireEvent?.event.payload?.case) {
        error = { error: 'caseless payload' }
        return error
    }

    const description = `${payloadCase ?? 'unknown payload case'}::${
        message.wireEvent.event.payload.case
    } id: ${eventId}`
    return { description }
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

function toTownsContent_fromRiverEvent(eventId: string, message: RiverEventV2): TownsContentResult {
    const { error, description } = validateEvent_fromRiverEventV2(eventId, message)
    if (error) {
        return { error }
    }
    if (!description) {
        return { error: 'no description' }
    }
    // return decryption failures
    if (message.isDecryptionFailure()) {
        console.log(`$$$ useCasablancaTimelines decryption failure`, message.getContent())
        return {
            content: { kind: ZTEvent.RoomMessageEncrypted } satisfies RoomMessageEncryptedEvent,
        }
    }
    // handle RiverEventV2s which store potentially decrypted contents of the original parsed event
    const payloadCase = getStreamPayloadCase(message.getStreamId())
    switch (payloadCase) {
        case 'channelPayload':
        case 'dmChannelPayload':
        case 'gdmChannelPayload':
            return toTownsContent_ChanelPayload_Message_fromRiverEventV2(message, description)
        case 'userPayload':
            return {
                error: `${description} user payload not supported yet`,
            }
        default:
            console.error('$$$ useCasablancaTimelines unknown case', {
                payload: payloadCase,
            })
            return { error: `unknown payload case ${payloadCase ?? ''}` }
    }
}

function toTownsContent_fromParsedEvent(eventId: string, message: ParsedEvent): TownsContentResult {
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
                message,
                message.event.payload.value,
                description,
            )
        case 'dmChannelPayload':
            return toTownsContent_ChannelPayload(
                eventId,
                message,
                message.event.payload.value,
                description,
            )
        case 'gdmChannelPayload':
            return toTownsContent_ChannelPayload(
                eventId,
                message,
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
        case undefined:
            return { error: `${description} undefined payload case` }
        default:
            logNever(message.event.payload)
            return { error: `unknown payload case ${description}` }
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
        case 'toDevice': {
            return { error: `${description} unknown message kind` }
        }
        case undefined: {
            return { error: `${description} unknown message kind` }
        }
        default: {
            logNever(value.content)
            return {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                error: `${description} unknown message kind`,
            }
        }
    }
}

function toTownsContent_ChannelPayload(
    eventId: string,
    message: ParsedEvent,
    value: ChannelPayload | DmChannelPayload | GdmChannelPayload,
    description: string,
): TownsContentResult {
    switch (value.content.case) {
        case 'fulfillment': {
            return {
                content: {
                    from: message.creatorUserId,
                    kind: ZTEvent.Fulfillment,
                    sessionIds: value.content.value.sessionIds,
                    originEventHash: bin_toString(value.content.value.originHash),
                } satisfies FulfillmentEvent,
            }
        }
        case 'keySolicitation': {
            return {
                content: {
                    kind: ZTEvent.KeySolicitation,
                    sessionId: value.content.value.sessionId,
                    senderKey: value.content.value.senderKey,
                } satisfies KeySolicitationEvent,
            }
        }
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
            return toTownsContent_ChannelPayload_Message(payload, description)
        }
        case undefined: {
            return { error: `${description} undefined message kind` }
        }
        default:
            logNever(value.content)
            return { error: `${description} unknown payload case` }
    }
}

function toTownsContent_FromChannelMessage(
    channelMessage: ChannelMessage,
    description: string,
): TownsContentResult {
    switch (channelMessage.payload?.case) {
        case 'post':
            return (
                toTownsContent_ChannelPayload_Message_Post(channelMessage.payload.value) ?? {
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
                channelMessage.payload.value.refEventId,
            )
            return newContent ?? { error: `${description} no content in edit` }
        }
        case undefined:
            return { error: `${description} undefined message kind` }
        default: {
            logNever(channelMessage.payload)
            return {
                error: `${description} unknown message kind`,
            }
        }
    }
}

function toTownsContent_ChanelPayload_Message_fromRiverEventV2(
    payload: RiverEventV2,
    description: string,
): TownsContentResult {
    const channelMessage = payload.getContent()
    if (!channelMessage) {
        // if we don't have clear content available, we either have a decryption failure or we should attempt decryption
        if (payload.shouldAttemptDecryption() || payload.isDecryptionFailure()) {
            return {
                content: {
                    kind: ZTEvent.RoomMessageEncrypted,
                } satisfies RoomMessageEncryptedEvent,
            }
        }
        return { error: `${description} no clear text in message` }
    }

    if (!channelMessage.content) {
        return { error: `${description} no content in clear text in message` }
    }

    return toTownsContent_FromChannelMessage(channelMessage.content, description)
}

function toTownsContent_ChannelPayload_Message(
    payload: EncryptedData,
    description: string,
): TownsContentResult {
    if (isCiphertext(payload.text)) {
        console.log(
            `$$$ useCasablancaTimelines toTownsContent_ChannelPayload_Message ciphertext`,
            payload.sessionId,
        )
        return {
            // if payload is an EncryptedData message, than it is encrypted content kind
            content: { kind: ZTEvent.RoomMessageEncrypted } satisfies RoomMessageEncryptedEvent,
        }
    }
    // do not handle non-encrypted messages that should be encrypted
    //return toTownsContent_ChannelPayload_Message_from_EncryptedData(payload, description)
    return { error: `${description} message text invalid channel message` }
}

function toTownsContent_ChannelPayload_Message_Post(
    value: ChannelMessage_Post | PlainMessage<ChannelMessage_Post>,
    editsEventId?: string,
) {
    switch (value.content.case) {
        case 'text':
            return {
                content: {
                    kind: ZTEvent.RoomMessage,
                    body: value.content.value.body,
                    msgType: MessageType.Text,
                    inReplyTo: value.threadId,
                    threadPreview: value.threadPreview,
                    mentions: value.content.value.mentions,
                    editsEventId: editsEventId,
                    content: {},
                    wireContent: {},
                } satisfies RoomMessageEvent,
            }
        case 'image':
            return {
                content: {
                    kind: ZTEvent.RoomMessage,
                    body: value.content.value.title,
                    msgType: MessageType.Image,
                    inReplyTo: value.threadId,
                    threadPreview: value.threadPreview,
                    mentions: [],
                    editsEventId: editsEventId,
                    content: {
                        info: value.content.value.info,
                        thumbnail: value.content.value.thumbnail,
                    },
                    wireContent: {},
                } satisfies RoomMessageEvent,
            }

        case 'gm':
            return {
                content: {
                    kind: ZTEvent.RoomMessage,
                    body: value.content.value.typeUrl,
                    msgType: MessageType.GM,
                    inReplyTo: value.threadId,
                    threadPreview: value.threadPreview,
                    mentions: [],
                    editsEventId: editsEventId,
                    content: {
                        data: value.content.value.value,
                    },
                    wireContent: {},
                } satisfies RoomMessageEvent,
            }
        case 'embeddedMedia':
            return {
                content: {
                    kind: ZTEvent.RoomMessage,
                    body: '',
                    msgType: MessageType.EmbeddedMedia,
                    inReplyTo: value.threadId,
                    threadPreview: value.threadPreview,
                    mentions: [],
                    editsEventId: editsEventId,
                    content: {
                        content: value.content.value.content,
                        mimetype: value.content.value.info?.mimetype,
                        widthPixels: value.content.value.info?.widthPixels,
                        heightPixels: value.content.value.info?.heightPixels,
                        sizeBytes: value.content.value.info?.sizeBytes,
                    },
                    wireContent: {},
                } satisfies RoomMessageEvent,
            }
        case 'chunkedMedia':
            return {
                content: {
                    kind: ZTEvent.RoomMessage,
                    body: '',
                    msgType: MessageType.ChunkedMedia,
                    inReplyTo: value.threadId,
                    threadPreview: value.threadPreview,
                    mentions: [],
                    editsEventId: editsEventId,
                    content: {
                        streamId: value.content.value.streamId,
                        mimetype: value.content.value.info?.mimetype,
                        widthPixels: value.content.value.info?.widthPixels,
                        heightPixels: value.content.value.info?.heightPixels,
                        sizeBytes: value.content.value.info?.sizeBytes,
                        iv: value.content.value.encryption.value?.iv,
                        secretKey: value.content.value.encryption.value?.secretKey,
                        thumbnail: value.content.value.thumbnail?.content,
                    },
                    wireContent: {},
                } satisfies RoomMessageEvent,
            }
        case undefined:
            return undefined
        default:
            logNever(value.content)
            return undefined
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
                    username: payload.text,
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
                    displayName: payload.text,
                } satisfies SpaceDisplayNameEvent,
            }
        }
        case undefined:
            return { error: `${description} undefined payload case` }
        default:
            logNever(value.content)
            return { error: `${description} unknown payload case` }
    }
}

function getEventStatus(timelineEvent: StreamTimelineEvent): EventStatus {
    if (timelineEvent.remoteEvent) {
        return EventStatus.SENT
    } else if (timelineEvent.localEvent && timelineEvent.hashStr.startsWith('~')) {
        return EventStatus.ENCRYPTING
    } else if (timelineEvent.localEvent) {
        return EventStatus.SENDING
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
