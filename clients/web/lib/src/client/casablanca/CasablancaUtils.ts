/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { getMessagePayload, Stream } from '@zion/client'
import { ParsedEvent } from '@zion/client'
import {
    ReactionEvent,
    RoomMessageEvent,
    TimelineEvent,
    TimelineEvent_OneOf,
    ZTEvent,
} from '../../types/timeline-types'
import { Mention, Room } from '../../types/zion-types'
import { makeCasablancaStreamIdentifier } from '../../types/room-identifier'

export function toZionRoomFromStream(stream: Stream): Room {
    // todo casablanca: implement this
    return {
        id: makeCasablancaStreamIdentifier(stream.streamId),
        name: '',
        membership: '',
        inviter: '',
        members: [],
        membersMap: {},
        isSpaceRoom: false,
    }
}

function getEventContent(event: ParsedEvent): TimelineEvent_OneOf | undefined {
    const messagePayload = getMessagePayload(event)
    if (messagePayload !== undefined) {
        const msgEvent = JSON.parse(messagePayload.text)
        switch (msgEvent.kind) {
            case ZTEvent.Reaction:
                return {
                    kind: msgEvent.kind,
                    reaction: msgEvent.reaction,
                    targetEventId: msgEvent.targetEventId,
                } as ReactionEvent
            case ZTEvent.RoomMessage:
                return {
                    kind: msgEvent.kind,
                    body: msgEvent.body,
                    msgType: msgEvent.msgType,
                    inReplyTo: msgEvent.inReplyTo,
                    replacedMsgId: msgEvent.replacedMsgId,
                    mentions: msgEvent.mentions as Mention[],
                    content: {},
                    wireContent: {},
                } as RoomMessageEvent
        }
    }
    return undefined
}

export function toZionEventFromCsbEvent(event: ParsedEvent): TimelineEvent {
    const sender = {
        id: event.creatorUserId,
        displayName: '',
        avatarUrl: undefined,
    }

    return {
        eventId: event.hashStr,
        originServerTs: 0,
        content: getEventContent(event),
        fallbackContent: '',
        isLocalPending: false,
        isMentioned: false,
        sender,
    }
}
