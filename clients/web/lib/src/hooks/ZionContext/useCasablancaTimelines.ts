import { Client as CasablancaClient, ParsedEvent, isCiphertext } from '@river/sdk'
import {
    MembershipOp,
    ChannelMessage_Post,
    PayloadCaseType,
    ToDeviceOp,
    UserPayload,
    ChannelPayload,
    EncryptedData,
    SpacePayload,
    MiniblockHeader,
} from '@river/proto'
import { useEffect } from 'react'
import { Membership, MessageType } from '../../types/zion-types'
import {
    TimelineStoreInterface,
    getIsMentioned,
    getReactionParentId,
    getRedactsId,
    getReplacedId,
    getThreadParentId,
    useTimelineStore,
} from '../../store/use-timeline-store'
import {
    getFallbackContent,
    MiniblockHeaderEvent,
    ReactionEvent,
    ReceiptEvent,
    RoomCreateEvent,
    RoomMemberEvent,
    RoomMessageEncryptedEvent,
    RoomMessageEvent,
    RoomRedactionEvent,
    SpaceChildEvent,
    TimelineEvent,
    TimelineEvent_OneOf,
    ZTEvent,
} from '../../types/timeline-types'
import { staticAssertNever } from '../../utils/zion-utils'
import { RiverEvent } from '@river/sdk'

type SuccessResult = {
    content: TimelineEvent_OneOf
    error?: never
}

type ErrorResult = {
    content?: never
    error: string
}

type TownsContentResult = SuccessResult | ErrorResult

export function useCasablancaTimelines(casablancaClient: CasablancaClient | undefined) {
    const setState = useTimelineStore((s) => s.setState)
    useEffect(() => {
        if (!casablancaClient) {
            return
        }
        const userId = casablancaClient.userId

        const streamIds = new Set<string>()

        const onStreamEvents = (streamId: string, timelineEvents: TimelineEvent[]) => {
            timelineEvents.forEach((event) => {
                processEvent(event, userId, streamId, setState)
            })
        }

        const onStreamInitialized = (
            streamId: string,
            kind: PayloadCaseType,
            messages: ParsedEvent[],
        ) => {
            if (kind === 'channelPayload' || kind === 'spacePayload') {
                streamIds.add(streamId)
                const timelineEvents = messages.map((message) => toEvent(message, userId))
                setState.initializeRoom(userId, streamId, [])
                onStreamEvents(streamId, timelineEvents)
            }
        }

        const onStreamUpdated = (
            streamId: string,
            kind: PayloadCaseType,
            messages: ParsedEvent[],
        ) => {
            if (kind === 'channelPayload' || kind === 'spacePayload') {
                streamIds.add(streamId)
                const timelineEvents = messages.map((message) => toEvent(message, userId))
                onStreamEvents(streamId, timelineEvents)
            }
        }

        const onEventDecrypted = (riverEvent: object, err: Error | undefined) => {
            if (err) {
                console.error('$$$ useCasablancaTimelines onEventDecrypted', err)
                return
            }
            const message = riverEvent as RiverEvent
            if (message.getStreamType() === 'channelPayload') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
                const streamId: string | undefined = message.getStreamId()
                if (!streamId) {
                    console.error('$$$ useCasablancaTimelines onEventDecrypted no streamId')
                    return
                }
                const timelineEvent = toEvent_FromRiverEvent(message, userId)

                // get replace Id and remove/replace state or if redaction delete, or
                // just replace if no replaceId.
                processEvent(timelineEvent, userId, streamId, setState, timelineEvent.eventId)
            }
        }

        //TODO: this should be discussed with the team - if there is a chance for duplicates/lost events
        const timelineEvents: Map<string, TimelineEvent[]> = new Map()
        //Step 1: get all the events which are already in the river before listeners started
        casablancaClient?.streams.forEach((stream) => {
            if (
                stream.view.payloadKind === 'channelPayload' ||
                stream.view.payloadKind === 'spacePayload'
            ) {
                streamIds.add(stream.streamId)
                timelineEvents.set(stream.streamId, [])
                stream.view.timeline.forEach((event) => {
                    const parsedEvent = toEvent(event, casablancaClient.userId)
                    timelineEvents.get(stream.streamId)?.push(parsedEvent)
                })
            }
        })

        //Step 2: add them into the timeline
        timelineEvents.forEach((events, streamId) => {
            events.forEach((event) => {
                processEvent(event, userId, streamId, setState)
            })
        })

        casablancaClient.on('streamInitialized', onStreamInitialized)
        casablancaClient.on('streamUpdated', onStreamUpdated)
        casablancaClient.on('eventDecrypted', onEventDecrypted)

        return () => {
            casablancaClient.off('streamInitialized', onStreamInitialized)
            casablancaClient.off('streamUpdated', onStreamUpdated)
            casablancaClient.off('eventDecrypted', onEventDecrypted)
            setState.reset(Array.from(streamIds))
        }
    }, [casablancaClient, setState])
}

export function toEvent_FromRiverEvent(message: RiverEvent, userId: string): TimelineEvent {
    const eventId = message.getId() ?? ''
    const creatorUserId = message.getSender()
    const sender = {
        id: creatorUserId,
        displayName: creatorUserId, // todo displayName
        avatarUrl: undefined, // todo avatarUrl
    }
    const { content, error } = toTownsContent_fromRiverEvent(eventId, message)

    const isSender = sender.id === userId
    const fbc = `${content?.kind ?? '??'} ${getFallbackContent(sender.displayName, content, error)}`
    return {
        eventId: eventId,
        status: isSender ? undefined : undefined, // todo: set status for events this user sent
        originServerTs: Date.now(), // todo: timestamps
        updatedServerTs: Date.now(), // todo: timestamps
        content: content,
        fallbackContent: fbc,
        isLocalPending: eventId.startsWith('~'),
        threadParentId: getThreadParentId(content),
        reactionParentId: getReactionParentId(content),
        isMentioned: getIsMentioned(content, userId),
        isRedacted: content?.kind === ZTEvent.RoomRedaction,
        sender,
    }
}

export function toEvent(message: ParsedEvent, userId: string): TimelineEvent {
    const eventId = message.hashStr
    const creatorUserId = message.creatorUserId
    const sender = {
        id: creatorUserId,
        displayName: creatorUserId, // todo displayName
        avatarUrl: undefined, // todo avatarUrl
    }
    const { content, error } = toTownsContent(eventId, message)

    const isSender = sender.id === userId
    const fbc = `${content?.kind ?? '??'} ${getFallbackContent(sender.displayName, content, error)}`
    return {
        eventId: eventId,
        status: isSender ? undefined : undefined, // todo: set status for events this user sent
        originServerTs: Date.now(), // todo: timestamps
        updatedServerTs: Date.now(), // todo: timestamps
        content: content,
        fallbackContent: fbc,
        isLocalPending: eventId.startsWith('~'),
        threadParentId: getThreadParentId(content),
        reactionParentId: getReactionParentId(content),
        isMentioned: getIsMentioned(content, userId),
        isRedacted: content?.kind === ZTEvent.RoomRedaction,
        sender,
    }
}

function validateEvent_fromRiverEvent(
    eventId: string,
    message: RiverEvent,
): Partial<ErrorResult> & { description?: string } {
    let error: ErrorResult
    // handle RiverEvent
    const payloadCase = message.getStreamType() ?? 'unknown payload case'
    if (!message.event.payload || !message.event.payload.parsed_event) {
        error = { error: 'payloadless payload' }
        return error
    }
    if (!message.event.payload.parsed_event.case) {
        error = { error: 'caseless payload' }
        return error
    }
    if (!message.event.payload.parsed_event.value) {
        error = { error: `${payloadCase} - caseless payload content` }
        return error
    }
    const description = `${payloadCase}::${message.event.payload.parsed_event.case} id: ${eventId}`
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

function toTownsContent_fromRiverEvent(eventId: string, message: RiverEvent): TownsContentResult {
    const { error, description } = validateEvent_fromRiverEvent(eventId, message)
    if (error) {
        return { error }
    }
    if (!description) {
        return { error: 'no description' }
    }
    // handle RiverEvents which store potentially decrypted contents of the original parsed event
    const payloadCase = message.getStreamType() ?? 'unknown payload case'
    switch (payloadCase) {
        case 'channelPayload':
            return toTownsContent_ChanelPayload_Message_fromRiverEvent(message, description)
        case 'userPayload':
            return {
                error: `${description} user payload not supported yet`,
            }
        default:
            console.error('$$$ useCasablancaTimelines unknown case', {
                payload: payloadCase,
            })
            return { error: `unknown payload case ${payloadCase}` }
    }
}

function toTownsContent(eventId: string, message: ParsedEvent): TownsContentResult {
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
        default:
            try {
                if (message.event.payload && message.event.payload.value) {
                    staticAssertNever(message.event.payload)
                }
            } catch (e) {
                console.error('$$$ useCasablancaTimelines unknown case', {
                    payload: message.event.payload,
                })
            }
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            return { error: `unknown payload case ${message.event.payload.case}` }
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
            try {
                staticAssertNever(value.content)
            } catch (e) {
                return {
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    error: `${description} unknown message kind`,
                }
            }
        }
    }
}

function toTownsContent_ChannelPayload(
    eventId: string,
    message: ParsedEvent,
    value: ChannelPayload,
    description: string,
): TownsContentResult {
    switch (value.content.case) {
        case 'receipt': {
            return {
                content: {
                    kind: ZTEvent.Receipt,
                    originOp: ToDeviceOp[value.content.value.originOp],
                    originEventHash: '0x' + value.content.value.originHash.toString(),
                } satisfies ReceiptEvent,
            }
        }
        case 'inception': {
            const payload = value.content.value
            return {
                content: {
                    kind: ZTEvent.RoomCreate,
                    creator: message.creatorUserId,
                    predecessor: undefined, // todo is this needed?
                    type: message.event.payload.case,
                    spaceId: payload.spaceId,
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
            try {
                staticAssertNever(value.content)
            } catch (e) {
                return { error: `${description} unknown payload case` }
            }
    }
}

function toTownsContent_ChanelPayload_Message_fromRiverEvent(
    payload: RiverEvent,
    description: string,
): TownsContentResult {
    try {
        const channelMessage = payload.getClearContent_ChannelMessage()
        if (!channelMessage.payload) {
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

        switch (channelMessage?.payload?.case) {
            case 'post':
                return (
                    toTownsContent_ChannelPayload_Message_Post(
                        new ChannelMessage_Post(channelMessage?.payload.value),
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
                        kind: ZTEvent.RoomRedaction,
                        inReplyTo: channelMessage.payload.value.refEventId,
                        content: {},
                    } satisfies RoomRedactionEvent,
                }
            case 'edit': {
                const newPost = channelMessage.payload.value.post
                if (!newPost) {
                    return { error: `${description} no post in edit` }
                }
                const newContent = toTownsContent_ChannelPayload_Message_Post(
                    new ChannelMessage_Post(newPost),
                    channelMessage.payload.value.refEventId,
                )
                return newContent ?? { error: `${description} no content in edit` }
            }
            case undefined:
                return { error: `${description} undefined message kind` }
            default: {
                try {
                    staticAssertNever(channelMessage.payload)
                } catch (e) {
                    return {
                        error: `${description} unknown message kind`,
                    }
                }
            }
        }
    } catch (e) {
        return { error: `${description} message text invalid channel message` }
    }
}

function toTownsContent_ChannelPayload_Message(
    payload: EncryptedData,
    description: string,
): TownsContentResult {
    if (isCiphertext(payload.text)) {
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
    value: ChannelMessage_Post,
    replacedMsgId?: string,
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
                    replacedMsgId: replacedMsgId,
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
                    replacedMsgId: replacedMsgId,
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
                    replacedMsgId: replacedMsgId,
                    content: {
                        data: value.content.value.value,
                    },
                    wireContent: {},
                } satisfies RoomMessageEvent,
            }
        default:
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
        case undefined:
            return { error: `${description} undefined payload case` }
        default:
            try {
                staticAssertNever(value.content)
            } catch (e) {
                return { error: `${description} unknown payload case` }
            }
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

function processEvent(
    event: TimelineEvent,
    userId: string,
    streamId: string,
    setState: TimelineStoreInterface,
    decryptedFromEventId?: string,
) {
    const replacedEventId = getReplacedId(event.content)
    const redactsEventId = getRedactsId(event.content)
    if (redactsEventId) {
        if (decryptedFromEventId) {
            // remove the formerly encrypted event
            setState.removeEvent(streamId, decryptedFromEventId)
        }
        setState.removeEvent(streamId, redactsEventId)
        setState.appendEvent(userId, streamId, event)
    } else if (replacedEventId) {
        if (decryptedFromEventId) {
            setState.removeEvent(streamId, decryptedFromEventId)
        }
        setState.replaceEvent(userId, streamId, replacedEventId, event)
    } else {
        if (decryptedFromEventId) {
            // replace the formerly encrypted event
            setState.replaceEvent(userId, streamId, decryptedFromEventId, event)
        } else {
            setState.appendEvent(userId, streamId, event)
        }
    }
}
