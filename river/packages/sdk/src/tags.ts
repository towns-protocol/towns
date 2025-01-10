import { PlainMessage } from '@bufbuild/protobuf'
import { ChannelMessage, GroupMentionType, MessageInteractionType, Tags } from '@river-build/proto'
import { IStreamStateView } from './streamStateView'
import { addressFromUserId } from './id'
import { bin_fromHexString, check } from '@river-build/dlog'
import { TipEventObject } from '@river-build/generated/dev/typings/ITipping'
import { isDefined } from './check'

export function makeTags(
    message: PlainMessage<ChannelMessage>,
    streamView: IStreamStateView,
): PlainMessage<Tags> {
    return {
        messageInteractionType: getMessageInteractionType(message),
        groupMentionTypes: getGroupMentionTypes(message),
        mentionedUserAddresses: getMentionedUserAddresses(message),
        participatingUserAddresses: getParticipatingUserAddresses(message, streamView),
        threadId: getThreadId(message, streamView),
    } satisfies PlainMessage<Tags>
}

export function makeTipTags(
    event: TipEventObject,
    toUserId: string,
    streamView: IStreamStateView,
): PlainMessage<Tags> | undefined {
    check(isDefined(streamView), 'stream not found')
    return {
        messageInteractionType: MessageInteractionType.TIP,
        groupMentionTypes: [],
        mentionedUserAddresses: [],
        participatingUserAddresses: [addressFromUserId(toUserId)],
        threadId: getParentThreadId(event.messageId, streamView),
    } satisfies PlainMessage<Tags>
}

function getThreadId(
    message: PlainMessage<ChannelMessage>,
    streamView: IStreamStateView,
): Uint8Array | undefined {
    switch (message.payload.case) {
        case 'post':
            if (message.payload.value.threadId) {
                return bin_fromHexString(message.payload.value.threadId)
            }
            break
        case 'reaction':
            return getParentThreadId(message.payload.value.refEventId, streamView)
        case 'edit':
            return getParentThreadId(message.payload.value.refEventId, streamView)
        case 'redaction':
            return getParentThreadId(message.payload.value.refEventId, streamView)
        default:
            break
    }
    return undefined
}

function getMessageInteractionType(message: PlainMessage<ChannelMessage>): MessageInteractionType {
    switch (message.payload.case) {
        case 'reaction':
            return MessageInteractionType.REACTION
        case 'post':
            if (message.payload.value.threadId) {
                return MessageInteractionType.REPLY
            } else if (message.payload.value.replyId) {
                return MessageInteractionType.REPLY
            } else {
                return MessageInteractionType.POST
            }
        case 'edit':
            return MessageInteractionType.EDIT
        case 'redaction':
            return MessageInteractionType.REDACTION
        default:
            return MessageInteractionType.UNSPECIFIED
    }
}

function getGroupMentionTypes(message: PlainMessage<ChannelMessage>): GroupMentionType[] {
    const types: GroupMentionType[] = []
    if (
        message.payload.case === 'post' &&
        message.payload.value.content.case === 'text' &&
        message.payload.value.content.value.mentions.find(
            (m) => m.mentionBehavior.case === 'atChannel',
        )
    ) {
        types.push(GroupMentionType.AT_CHANNEL)
    }
    return types
}

function getMentionedUserAddresses(message: PlainMessage<ChannelMessage>): Uint8Array[] {
    if (message.payload.case === 'post' && message.payload.value.content.case === 'text') {
        return message.payload.value.content.value.mentions
            .filter((m) => m.mentionBehavior.case === undefined && m.userId.length > 0)
            .map((m) => addressFromUserId(m.userId))
    }
    return []
}

function getParticipatingUserAddresses(
    message: PlainMessage<ChannelMessage>,
    streamView: IStreamStateView,
): Uint8Array[] {
    switch (message.payload.case) {
        case 'reaction': {
            const event = streamView.events.get(message.payload.value.refEventId)
            if (event && event.remoteEvent?.event.creatorAddress) {
                return [event.remoteEvent.event.creatorAddress]
            }
            return []
        }
        case 'post': {
            const participating = new Set<Uint8Array>()
            const parentId = message.payload.value.threadId || message.payload.value.replyId
            if (parentId) {
                const parentEvent = streamView.events.get(parentId)
                if (parentEvent && parentEvent.remoteEvent?.event.creatorAddress) {
                    participating.add(parentEvent.remoteEvent.event.creatorAddress)
                }
                streamView.timeline.forEach((event) => {
                    if (
                        event.decryptedContent?.kind === 'channelMessage' &&
                        event.decryptedContent.content.payload.case === 'post' &&
                        event.decryptedContent.content.payload.value.threadId === parentId &&
                        event.remoteEvent?.event.creatorAddress
                    ) {
                        participating.add(event.remoteEvent.event.creatorAddress)
                    } else if (
                        event.decryptedContent?.kind === 'channelMessage' &&
                        event.decryptedContent.content.payload.case === 'reaction' &&
                        event.decryptedContent.content.payload.value.refEventId === parentId &&
                        event.remoteEvent?.event.creatorAddress
                    ) {
                        participating.add(event.remoteEvent.event.creatorAddress)
                    }
                })
            }
            return Array.from(participating)
        }
        default:
            return []
    }
}

function getParentThreadId(
    eventId: string | undefined,
    streamView: IStreamStateView,
): Uint8Array | undefined {
    if (!eventId) {
        return undefined
    }
    const event = streamView.events.get(eventId)
    if (!event) {
        return undefined
    }
    if (
        event.decryptedContent?.kind === 'channelMessage' &&
        event.decryptedContent.content.payload.case === 'post'
    ) {
        if (event.decryptedContent.content.payload.value.threadId) {
            return bin_fromHexString(event.decryptedContent.content.payload.value.threadId)
        }
    }
    return undefined
}
