import { PlainMessage } from '@bufbuild/protobuf'
import { ChannelMessage, GroupMentionType, MessageInteractionType, Tags } from '@river-build/proto'
import { IStreamStateView } from './streamStateView'
import { addressFromUserId } from './id'

export function makeTags(
    message: PlainMessage<ChannelMessage>,
    streamView: IStreamStateView,
): PlainMessage<Tags> {
    return {
        messageInteractionType: getMessageInteractionType(message),
        groupMentionTypes: getGroupMentionTypes(message),
        mentionedUserAddresses: getMentionedUserIds(message),
        participatingUserAddresses: getParticipatingUserAddresses(message, streamView),
    } satisfies PlainMessage<Tags>
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

function getMentionedUserIds(message: PlainMessage<ChannelMessage>): Uint8Array[] {
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
