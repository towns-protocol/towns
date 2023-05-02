import { Client as CasablancaClient, ParsedEvent } from '@towns/sdk'
import { StreamKind, MembershipOp, ChannelMessage, ChannelMessage_Post } from '@towns/proto'
import { useEffect } from 'react'
import { Membership, MessageType } from '../../types/zion-types'
import {
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
import { BlockchainTransactionType } from 'types/web3-types'
import { Address } from 'wagmi'

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
            })
        }

        const onStreamInitialized = (
            streamId: string,
            kind: StreamKind,
            messages: ParsedEvent[],
        ) => {
            if (kind === StreamKind.SK_CHANNEL || kind === StreamKind.SK_SPACE) {
                streamIds.add(streamId)
                const timelineEvents = messages.map((message) => toEvent(message, userId))
                setState.initializeRoom(userId, streamId, [])
                onStreamEvents(streamId, timelineEvents)
            }
        }

        const onStreamUpdated = (streamId: string, kind: StreamKind, messages: ParsedEvent[]) => {
            if (kind === StreamKind.SK_CHANNEL || kind === StreamKind.SK_SPACE) {
                streamIds.add(streamId)
                const timelineEvents = messages.map((message) => toEvent(message, userId))
                onStreamEvents(streamId, timelineEvents)
            }
        }

        casablancaClient.on('streamInitialized', onStreamInitialized)
        casablancaClient.on('streamUpdated', onStreamUpdated)

        return () => {
            casablancaClient.off('streamInitialized', onStreamInitialized)
            casablancaClient.off('streamUpdated', onStreamUpdated)
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
        sender,
    }
}

function toTownsContent(
    eventId: string,
    message: ParsedEvent,
): {
    content?: TimelineEvent_OneOf
    error?: string
} {
    if (message.event.payload === undefined) {
        return { error: 'payloadless payload' }
    }
    if (!message.event.payload.payload.case) {
        return { error: 'caseless payload' }
    }
    const description = `${message.event.payload.payload.case} id: ${eventId}`

    switch (message.event.payload.payload.case) {
        case 'inception': {
            const payload = message.event.payload.payload.value
            return {
                content: {
                    kind: ZTEvent.RoomCreate,
                    creator: message.creatorUserId,
                    predecessor: undefined, // todo is this needed?
                    type: payload.streamKind,
                },
            }
        }
        case 'userMembershipOp': {
            throw new Error(`${description} userMembershipOp should only happen in a userStream`)
        }
        case 'joinableStream': {
            const payload = message.event.payload.payload.value
            const memberId = message.creatorUserId
            return {
                content: {
                    kind: ZTEvent.RoomMember,
                    userId: memberId,
                    avatarUrl: undefined, // todo avatarUrl
                    displayName: memberId, // todo displayName
                    isDirect: undefined, // todo is this needed?
                    membership: toMembership(payload.op),
                    reason: undefined, // todo is this needed?
                },
            }
        }
        case 'channel': {
            const payload = message.event.payload.payload.value
            const childId = payload.channelId
            return {
                content: {
                    kind: ZTEvent.SpaceChild,
                    childId: childId,
                    channelOp: payload.op,
                },
            }
        }
        case 'message': {
            const payload = message.event.payload.payload.value
            if (!payload.text) {
                return { error: `${description} no text in message` }
            }
            // todo type this out in the protobuf
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const channelMessage = ChannelMessage.fromJsonString(payload.text)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access

            switch (channelMessage.payload.case) {
                case 'post':
                    return (
                        toEvent_ChannelMessagePost(channelMessage.payload.value) ?? {
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
                    const newContent = toEvent_ChannelMessagePost(
                        newPost,
                        channelMessage.payload.value.refEventId,
                    )
                    return newContent ?? { error: `${description} no content in edit` }
                }
            }
            return { error: `${description} unknown message kind` }
        }
        case 'userSetting': {
            throw new Error('userSetting should only happen in a userSettingStream')
        }
        case 'toDevice': {
            throw new Error('toDevice should only happen in a userStream')
        }
        default: {
            console.error('$$$ onChannelMessage', {
                payload: message.event.payload,
            })
            return { error: `${description} unknown payload case` }
        }
    }
}

function toEvent_ChannelMessagePost(value: ChannelMessage_Post, replacedMsgId?: string) {
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
