/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Stream } from '@zion/client'
import { FullEvent } from '@zion/core'
import {
    ReactionEvent,
    RoomMessageEvent,
    TimelineEvent,
    TimelineEvent_OneOf,
    ZTEvent,
} from '../../types/timeline-types'
import { Room } from '../../types/matrix-types'
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

function getEventContent(event: FullEvent): TimelineEvent_OneOf | undefined {
    switch (event.base.payload.kind) {
        // cb type message
        case 'message': {
            const msgEvent = JSON.parse(event.base.payload.text)
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
                        replacedMsgId: msgEvent.replacedMsgId,
                        mentions: [],
                        content: [],
                    } as RoomMessageEvent
            }
        }
    }
    return undefined
}

export function toZionEventFromCsbEvent(event: FullEvent): TimelineEvent {
    const sender = {
        id: event.base.creatorAddress,
        displayName: '',
        avatarUrl: undefined,
    }

    return {
        eventId: event.hash,
        originServerTs: 0,
        content: getEventContent(event),
        fallbackContent: '',
        isLocalPending: false,
        isMentioned: false,
        sender,
    }
}
