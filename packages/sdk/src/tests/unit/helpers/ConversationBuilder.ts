import {
    TipEvent,
    OTWMention,
    RedactionActionEvent,
    ChannelMessageEvent,
    ChannelMessageEventContent_Text,
    TimelineEvent,
    TimelineEvent_OneOf,
    MessageType,
    EventStatus,
    RiverTimelineEvent,
    getIsMentioned,
    getReactionParentId,
    getThreadParentId,
} from '../../../views/models/timelineTypes'
import { ETH_ADDRESS } from '@towns-protocol/web3'
import { BlockchainTransaction_Tip, PlainMessage } from '@towns-protocol/proto'
import { hexToBytes } from 'ethereum-cryptography/utils'
import { getFallbackContent } from '../../../views/models/timelineEvent'
import { bin_toHexString } from '@towns-protocol/dlog'
import { randomBytes } from '../../../utils'

export class ConversationBuilder {
    events: TimelineEvent[] = []
    lastTimestamp = 0

    private get index(): number {
        return this.events.length
    }

    private nextId(): string {
        const id = `event${this.index}`
        this.checkId(id)
        return id
    }

    private checkId(id: string): string {
        if (this.events.find((e) => e.eventId === id)) {
            throw new Error(`Event with id ${id} already exists`)
        }
        return id
    }

    private nextTimestamp(): number {
        const now = Date.now()
        const timestamp = now > this.lastTimestamp ? now : this.lastTimestamp + 1
        this.lastTimestamp = timestamp
        return timestamp
    }

    getEvents(): TimelineEvent[] {
        return this.events
    }

    sendMessage(params: {
        from: string
        body: string
        mentions?: OTWMention[]
        id?: string
        threadId?: string
    }): ConversationBuilder {
        this.events.push(
            this.makeEvent({
                eventId: params.id,
                content: makeMessage({
                    body: params.body,
                    mentions: params.mentions,
                    threadId: params.threadId,
                }),
                userId: params.from,
            }),
        )
        return this
    }

    sendTip(params: {
        tip: number
        ref: `0x${string}`
        id?: string
        from: string
        to: string
    }): ConversationBuilder {
        const refEvent = this.events.find((e) => e.eventId === params.ref)
        if (!refEvent) {
            throw new Error(`Could not find event ${params.ref}`)
        }
        this.events.push(
            this.makeEvent({
                eventId: params.id,
                content: makeTip({
                    tip: params.tip,
                    messageId: params.ref,
                    fromUserId: params.from,
                    toUserId: params.to,
                }),
            }),
        )
        return this
    }

    editMessage(params: {
        edits: string
        newBody: string
        mentions?: OTWMention[]
        id?: string
        senderId?: string
    }): ConversationBuilder {
        const event = this.events.find((e) => e.eventId === params.edits)
        if (!event) {
            throw new Error(`Could not find event ${params.edits}`)
        }
        this.events.push(
            this.makeEvent({
                eventId: params.id,
                content: makeEdit({
                    body: params.newBody,
                    edits: params.edits,
                    mentions: params.mentions,
                }),
                userId: params.senderId ?? event.sender.id,
            }),
        )
        return this
    }

    redactMessage(params: {
        redacts: string
        id?: string
        senderId?: string
        isAdmin?: boolean
    }): ConversationBuilder {
        const event = this.events.find((e) => e.eventId === params.redacts)
        if (!event) {
            throw new Error(`Could not find event ${params.redacts}`)
        }
        this.events.push(
            this.makeEvent({
                eventId: params.id,
                content: makeRedaction({
                    redacts: params.redacts,
                    isAdmin: params.isAdmin,
                }),
                userId: params.senderId ?? event.sender.id,
            }),
        )
        return this
    }

    private makeEvent(params: {
        eventId?: string
        content: TimelineEvent_OneOf
        userId?: string
        sender?: { id: string; displayName: string }
        isSender?: boolean
    }): TimelineEvent {
        const oUserId = params.userId ?? '@alice:example.com'
        const eventId = params.eventId ? this.checkId(params.eventId) : this.nextId()
        const timestamp = this.nextTimestamp()
        return {
            eventId: eventId,
            eventNum: BigInt(this.index),
            latestEventId: eventId,
            latestEventNum: BigInt(this.index),
            status: params.isSender ? EventStatus.SENT : EventStatus.RECEIVED,
            createdAtEpochMs: timestamp,
            updatedAtEpochMs: timestamp,
            content: params.content,
            fallbackContent: getFallbackContent(oUserId, params.content),
            isLocalPending: eventId.startsWith('~'),
            isEncrypting: false,
            isSendFailed: false,
            threadParentId: getThreadParentId(params.content),
            reactionParentId: getReactionParentId(params.content),
            isMentioned: getIsMentioned(params.content, oUserId),
            isRedacted: false,
            sender: params.sender ?? { id: oUserId, displayName: oUserId },
        }
    }
}

function makeMessage(params: {
    body: string
    editsEventId?: string
    threadId?: string
    mentions?: OTWMention[]
}): ChannelMessageEvent {
    return {
        kind: RiverTimelineEvent.ChannelMessage,
        body: params.body,
        threadId: params.threadId,
        threadPreview: undefined,
        mentions: [],
        editsEventId: params.editsEventId,
        content: { msgType: MessageType.Text } satisfies ChannelMessageEventContent_Text,
    } satisfies ChannelMessageEvent
}

function makeEdit(params: {
    body: string
    edits: string
    threadId?: string
    mentions?: OTWMention[]
}): ChannelMessageEvent {
    return makeMessage({
        body: params.body,
        editsEventId: params.edits,
        threadId: params.threadId,
        mentions: params.mentions,
    })
}

function makeRedaction(params: { redacts: string; isAdmin?: boolean }): RedactionActionEvent {
    return {
        kind: RiverTimelineEvent.RedactionActionEvent,
        refEventId: params.redacts,
        adminRedaction: params.isAdmin ?? false,
    }
}

function makeTip(params: {
    tip: number
    messageId: `0x${string}`
    fromUserId: string
    toUserId: string
}): TipEvent {
    const tip = {
        event: {
            tokenId: 0n, // not used in this test
            amount: BigInt(params.tip),
            messageId: hexToBytes(params.messageId),
            channelId: randomBytes(32), // not used in this test
            sender: randomBytes(0), // not used in this test
            receiver: randomBytes(0), // not used in this test
            currency: hexToBytes(ETH_ADDRESS),
        },
        toUserAddress: randomBytes(0), // not used in this test
    } satisfies PlainMessage<BlockchainTransaction_Tip>
    return {
        kind: RiverTimelineEvent.TipEvent,
        transaction: {
            content: {
                case: 'tip',
                value: tip,
            },
        },
        tip,
        transactionHash: bin_toHexString(randomBytes(32)),
        fromUserId: params.fromUserId,
        refEventId: params.messageId,
        toUserId: params.toUserId, // I'm cheating here and not putting it into the transaction because we use readable names for ids
    } satisfies TipEvent
}
