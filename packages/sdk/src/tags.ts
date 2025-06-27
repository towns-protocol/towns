import {
    BlockchainTransaction_TokenTransfer,
    ChannelMessage,
    GroupMentionType,
    MessageInteractionType,
    Tags,
    PlainMessage,
} from '@towns-protocol/proto'
import { StreamStateView } from './streamStateView'
import { addressFromUserId } from './id'
import { bin_fromHexString, bin_toHexString, check } from '@towns-protocol/dlog'
import { TipEventObject } from '@towns-protocol/generated/dev/typings/ITipping'
import { isDefined } from './check'
import { bytesToHex } from 'ethereum-cryptography/utils'
import { RiverTimelineEvent } from './views/models/timelineTypes'

/**
 * Unsafe way to create tags. Possibly used in scenarios where we dont have access to the stream view.
 * Usages of this function may create messages with the wrong tags.
 */
export function unsafe_makeTags(message: PlainMessage<ChannelMessage>): PlainMessage<Tags> {
    return {
        messageInteractionType: getMessageInteractionType(message),
        groupMentionTypes: getGroupMentionTypes(message),
        mentionedUserAddresses: getMentionedUserAddresses(message),
        participatingUserAddresses: [],
        threadId:
            message.payload.case === 'post'
                ? message.payload.value.threadId
                    ? bin_fromHexString(message.payload.value.threadId)
                    : undefined
                : undefined,
    } satisfies PlainMessage<Tags>
}

export function makeTags(
    message: PlainMessage<ChannelMessage>,
    streamView: StreamStateView,
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
    streamView: StreamStateView,
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

export function makeTransferTags(
    event: PlainMessage<BlockchainTransaction_TokenTransfer>,
    streamView: StreamStateView,
): PlainMessage<Tags> | undefined {
    check(isDefined(streamView), 'stream not found')
    return {
        messageInteractionType: MessageInteractionType.TRADE,
        groupMentionTypes: [],
        mentionedUserAddresses: [],
        participatingUserAddresses: participantsFromParentEventId(
            bin_toHexString(event.messageId),
            streamView,
        ),
        threadId: getParentThreadId(bytesToHex(event.messageId), streamView),
    } satisfies PlainMessage<Tags>
}

function getThreadId(
    message: PlainMessage<ChannelMessage>,
    streamView: StreamStateView,
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
    streamView: StreamStateView,
): Uint8Array[] {
    switch (message.payload.case) {
        case 'reaction': {
            const refEventId = message.payload.value.refEventId
            const event = streamView.timeline.find((x) => x.eventId === refEventId)
            if (event) {
                return [addressFromUserId(event.sender.id)]
            }
            return []
        }
        case 'post': {
            const parentId = message.payload.value.threadId || message.payload.value.replyId
            if (parentId) {
                return participantsFromParentEventId(parentId, streamView)
            }
            return []
        }
        default:
            return []
    }
}

function participantsFromParentEventId(
    parentId: string,
    streamView: StreamStateView,
): Uint8Array[] {
    const participating = new Set<Uint8Array>()
    const parentEvent = streamView.timeline.find((x) => x.eventId === parentId)
    if (parentEvent && parentEvent.sender.id) {
        participating.add(addressFromUserId(parentEvent.sender.id))
    }
    streamView.timeline.forEach((event) => {
        if (
            event.content?.kind === RiverTimelineEvent.ChannelMessage &&
            event.content.threadId === parentId
        ) {
            participating.add(addressFromUserId(event.sender.id))
        }
    })
    return Array.from(participating)
}

function getParentThreadId(
    eventId: string | undefined,
    streamView: StreamStateView,
): Uint8Array | undefined {
    if (!eventId) {
        return undefined
    }
    const event = streamView.timeline.find((x) => x.eventId === eventId)
    if (!event) {
        return undefined
    }
    if (event.content?.kind === RiverTimelineEvent.ChannelMessage) {
        if (event.content.threadId) {
            return bin_fromHexString(event.content.threadId)
        }
    }
    return undefined
}
