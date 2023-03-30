import { Client as CasablancaClient, ParsedEvent } from '@towns/client'
import { StreamKind, MembershipOp } from '@towns/proto'
import { useEffect } from 'react'
import { Membership, Mention } from '../../types/zion-types'
import {
    getIsMentioned,
    getReactionParentId,
    getThreadParentId,
    useTimelineStore,
} from '../../store/use-timeline-store'
import {
    getFallbackContent,
    ReactionEvent,
    RoomMessageEvent,
    TimelineEvent,
    TimelineEvent_OneOf,
    ZTEvent,
} from '../../types/timeline-types'
import { staticAssertNever } from '../../utils/zion-utils'

export function useCasablancaTimelines(casablancaClient: CasablancaClient | undefined) {
    const setState = useTimelineStore((s) => s.setState)
    useEffect(() => {
        if (!casablancaClient) {
            return
        }
        const userId = casablancaClient.userId

        const streamIds = new Set<string>()

        const onStreamInitialized = (
            streamId: string,
            kind: StreamKind,
            messages: ParsedEvent[],
        ) => {
            if (kind === StreamKind.SK_CHANNEL || kind === StreamKind.SK_SPACE) {
                streamIds.add(streamId)
                const timelineEvents = messages.map((message) => toEvent(streamId, message, userId))
                setState.initializeRoom(userId, streamId, timelineEvents)
            }
        }

        const onStreamUpdated = (streamId: string, kind: StreamKind, messages: ParsedEvent[]) => {
            if (kind === StreamKind.SK_CHANNEL || kind === StreamKind.SK_SPACE) {
                streamIds.add(streamId)
                const timelineEvents = messages.map((message) => toEvent(streamId, message, userId))
                timelineEvents.forEach((event) => {
                    setState.appendEvent(userId, streamId, event)
                })
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

function toEvent(streamId: string, message: ParsedEvent, userId: string): TimelineEvent {
    const eventId = message.hashStr
    const { content, error } = toZionContent(streamId, eventId, message)
    const sender = {
        id: message.creatorUserId,
        displayName: message.creatorUserId, // todo displayName
        avatarUrl: undefined, // todo avatarUrl
    }
    const isSender = sender.id === userId
    const fbc = `${message.event.payload?.payload.case ?? '??'} ${getFallbackContent(
        sender.displayName,
        content,
        error,
    )}`
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

function toZionContent(
    streamId: string,
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
            const msgEvent = JSON.parse(payload.text)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            switch (msgEvent.kind) {
                case ZTEvent.Reaction:
                    return {
                        content: {
                            kind: ZTEvent.Reaction,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            reaction: msgEvent.reaction as string,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            targetEventId: msgEvent.targetEventId as string,
                        } satisfies ReactionEvent,
                    }
                case ZTEvent.RoomMessage:
                    return {
                        content: {
                            kind: ZTEvent.RoomMessage,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                            body: msgEvent.body,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                            msgType: msgEvent.msgType,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                            inReplyTo: msgEvent.inReplyTo,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                            replacedMsgId: msgEvent.replacedMsgId,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                            mentions: msgEvent.mentions as Mention[],
                            content: {},
                            wireContent: {},
                        } satisfies RoomMessageEvent,
                    }
            }
            return { error: `${description} unknown message kind` }
        }
        case 'userSetting': {
            throw new Error('userSetting should only happen in a userSettingStream')
        }
        default: {
            console.error('$$$ onChannelMessage', {
                streamId,
                payload: message.event.payload,
            })
            staticAssertNever(message.event.payload.payload)
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
