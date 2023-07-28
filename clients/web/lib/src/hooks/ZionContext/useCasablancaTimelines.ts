import { Client as CasablancaClient, ParsedEvent } from '@towns/sdk'
import {
    MembershipOp,
    ChannelMessage,
    ChannelMessage_Post,
    PayloadCaseType,
    ToDeviceOp,
    UserPayload,
    ChannelPayload,
    EncryptedData,
    SpacePayload,
} from '@towns/proto'
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
    BlockchainTransactionEvent,
    getFallbackContent,
    ReactionEvent,
    RoomMessageEvent,
    RoomRedactionEvent,
    TimelineEvent,
    TimelineEvent_OneOf,
    ZTEvent,
} from '../../types/timeline-types'
import { BlockchainTransactionType } from '../../types/web3-types'
import { Address } from 'wagmi'
import { staticAssertNever } from '../../utils/zion-utils'

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

        return () => {
            casablancaClient.off('streamInitialized', onStreamInitialized)
            casablancaClient.off('streamUpdated', onStreamUpdated)
            setState.reset(Array.from(streamIds))
        }
    }, [casablancaClient, setState])
}

export function toEvent(message: ParsedEvent, userId: string): TimelineEvent {
    const eventId = message.hashStr
    const { content, error } = toTownsContent(eventId, message)
    const sender = {
        id: message.creatorUserId,
        displayName: message.creatorUserId, // todo displayName
        avatarUrl: undefined, // todo avatarUrl
    }
    const isSender = sender.id === userId
    const fbc = `${content?.kind ?? '??'} ${getFallbackContent(sender.displayName, content, error)}`
    // console.log("!!!! to event", event.getId(), fbc);
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

function toTownsContent(eventId: string, message: ParsedEvent): TownsContentResult {
    if (!message.event.payload || !message.event.payload.value) {
        return { error: 'payloadless payload' }
    }
    if (!message.event.payload.case) {
        return { error: 'caseless payload' }
    }
    if (!message.event.payload.value.content.case) {
        return { error: 'caseless payload content' }
    }
    const description = `${message.event.payload.case}::${message.event.payload.value.content.case} id: ${eventId}`

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
            return {
                error: `${description} block payload not supported?`,
            }
        default:
            try {
                staticAssertNever(message.event.payload)
            } catch (e) {
                console.error('$$$ useCasablancaTimelines unknown case', {
                    payload: message.event.payload,
                })
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                return { error: `unknown payload case ${message.event.payload}` }
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
                },
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
                },
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
                },
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
                },
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
                },
            }
        }
        case 'message': {
            const payload = value.content.value
            return toTownsContent_ChannelPayload_Message(
                eventId,
                message,
                value,
                payload,
                description,
            )
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

function toTownsContent_ChannelPayload_Message(
    eventId: string,
    message: ParsedEvent,
    value: ChannelPayload,
    payload: EncryptedData,
    description: string,
): TownsContentResult {
    if (!payload.text) {
        return { error: `${description} no text in message` }
    }
    const channelMessage = ChannelMessage.fromJsonString(payload.text)

    switch (channelMessage.payload.case) {
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
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    reaction: channelMessage.payload.value.reaction,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
                newPost,
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

        case 'blockTxn':
            return {
                content: {
                    kind: ZTEvent.BlockchainTransaction,
                    inReplyTo: value.threadId,
                    threadPreview: value.threadPreview,
                    content: {
                        hash: value.content.value.hash as Address,
                        type: value.content.value.type as BlockchainTransactionType,
                    },
                } satisfies BlockchainTransactionEvent,
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
                },
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
                },
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
                },
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
) {
    const replacedEventId = getReplacedId(event.content)
    const redactsEventId = getRedactsId(event.content)
    if (redactsEventId) {
        setState.removeEvent(streamId, redactsEventId)
        setState.appendEvent(userId, streamId, event)
    } else if (replacedEventId) {
        setState.replaceEvent(userId, streamId, replacedEventId, event)
    } else {
        setState.appendEvent(userId, streamId, event)
    }
}
