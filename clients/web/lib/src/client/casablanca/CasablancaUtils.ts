/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Stream } from '@zion/client'
import { FullEvent } from '@zion/core'
import { TimelineEvent, TimelineEvent_OneOf, ZTEvent } from '../../types/timeline-types'
import { MessageType, Room } from '../../types/matrix-types'
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

function getContent(event: FullEvent): TimelineEvent_OneOf | undefined {
    switch (event.base.payload.kind) {
        case 'message': {
            const text = JSON.parse(event.base.payload.text)
            if (text.type === 'reaction') {
                return {
                    kind: ZTEvent.Reaction,
                    targetEventId: text.event_id,
                    reaction: text.text,
                }
            } else if (text.type === 'text') {
                return {
                    kind: ZTEvent.RoomMessage,
                    body: text.text,
                    msgType: MessageType.Text,
                    mentions: [],
                    content: {},
                }
            }
            break
        }
        default:
            break
    }
    return undefined
}

export function toZionEventFromCBEvent(event: FullEvent): TimelineEvent {
    const sender = {
        id: event.base.creatorAddress,
        displayName: '',
        avatarUrl: undefined,
    }

    return {
        eventId: event.hash,
        originServerTs: 0,
        content: getContent(event),
        fallbackContent: '',
        isLocalPending: false,
        isMentioned: false,
        sender,
    }
}
