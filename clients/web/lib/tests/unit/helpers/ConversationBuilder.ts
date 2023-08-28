import {
    OTWMention,
    RoomMessageEvent,
    RoomRedactionEvent,
    TimelineEvent,
    TimelineEvent_OneOf,
    ZTEvent,
    getFallbackContent,
} from '../../../src/types/timeline-types'
import { MessageType } from '../../../src/types/zion-types'
import {
    getIsMentioned,
    getReactionParentId,
    getThreadParentId,
} from '../../../src/store/use-timeline-store'

export class ConversationBuilder {
    events: TimelineEvent[] = []

    private get index(): number {
        return this.events.length
    }

    private makeId(id?: string): string {
        if (id) {
            this.checkId(id)
            return id
        }
        return this.nextId()
    }

    private nextId(): string {
        const id = `event${this.index}`
        this.checkId(id)
        return id
    }

    private checkId(id: string): void {
        if (this.events.find((e) => e.eventId === id)) {
            throw new Error(`Event with id ${id} already exists`)
        }
    }

    getEvents(): TimelineEvent[] {
        return this.events
    }

    sendMessage(params: {
        from: string
        body: string
        mentions?: OTWMention[]
        id?: string
    }): ConversationBuilder {
        this.events.push(
            makeEvent({
                eventId: this.makeId(params.id),
                content: makeMessage({
                    body: params.body,
                    mentions: params.mentions,
                }),
                userId: params.from,
            }),
        )
        return this
    }

    editMessage(params: {
        edits: string
        newBody: string
        mentions?: OTWMention[]
        id?: string
    }): ConversationBuilder {
        const event = this.events.find((e) => e.eventId === params.edits)
        if (!event) {
            throw new Error(`Could not find event ${params.edits}`)
        }
        this.events.push(
            makeEvent({
                eventId: this.makeId(params.id),
                content: makeEdit({
                    body: params.newBody,
                    edits: params.edits,
                    mentions: params.mentions,
                }),
                userId: event.sender.id,
            }),
        )
        return this
    }

    redactMessage(params: { redacts: string; id?: string }): ConversationBuilder {
        const event = this.events.find((e) => e.eventId === params.redacts)
        if (!event) {
            throw new Error(`Could not find event ${params.redacts}`)
        }
        this.events.push(
            makeEvent({
                eventId: this.makeId(params.id),
                content: makeRedaction({
                    redacts: params.redacts,
                }),
                userId: event.sender.id,
            }),
        )
        return this
    }
}

function makeEvent(params: {
    eventId: string
    content: TimelineEvent_OneOf
    userId?: string
    sender?: { id: string; displayName: string }
    isSender?: boolean
}): TimelineEvent {
    const oUserId = params.userId ?? '@alice:example.com'
    return {
        eventId: params.eventId,
        status: params.isSender ? undefined : undefined, // todo: set status for events this user sent
        originServerTs: Date.now(), // todo: timestamps
        updatedServerTs: Date.now(), // todo: timestamps
        content: params.content,
        fallbackContent: `${params.eventId} ${getFallbackContent(oUserId, params.content)}`,
        isLocalPending: params.eventId.startsWith('~'),
        threadParentId: getThreadParentId(params.content),
        reactionParentId: getReactionParentId(params.content),
        isMentioned: getIsMentioned(params.content, oUserId),
        isRedacted: false,
        sender: params.sender ?? { id: oUserId, displayName: oUserId },
    }
}

function makeMessage(params: {
    body: string
    edits?: string
    mentions?: OTWMention[]
}): RoomMessageEvent {
    return {
        kind: ZTEvent.RoomMessage,
        body: params.body,
        msgType: MessageType.Text,
        threadPreview: undefined,
        mentions: [],
        replacedMsgId: params.edits,
        content: {},
        wireContent: {},
    }
}

function makeEdit(params: {
    body: string
    edits: string
    mentions?: OTWMention[]
}): RoomMessageEvent {
    return makeMessage({
        body: params.body,
        edits: params.edits,
        mentions: params.mentions,
    })
}

function makeRedaction(params: { redacts: string }): RoomRedactionEvent {
    return {
        kind: ZTEvent.RoomRedaction,
        inReplyTo: params.redacts,
        content: {},
    }
}
