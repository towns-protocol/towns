import {
    check,
    checkEvents,
    Err,
    findLeafEventHashes,
    FullEvent,
    isValidStreamId,
    JoinStreamPayload,
    makeEvent,
    makeEventRef,
    makeUserStreamId,
    PayloadKind,
    StreamKind,
    TypedFullEvent,
} from '@zion/core'
import { ZionServer } from '../server'

/**
 * @returns streamId
 */
export const checkStreamCreationParams = async (
    server: ZionServer,
    events: FullEvent[],
    expectedStreamKind: StreamKind,
    expectedExtraEvent?: PayloadKind,
): Promise<string> => {
    checkEvents(events)

    check(events.length > 0, 'Must include inception event', Err.BAD_STREAM_CREATION_PARAMS)

    const inception = events[0].base
    check(
        inception.payload.kind === 'inception',
        'First event must be inception',
        Err.BAD_STREAM_CREATION_PARAMS,
    )

    check(
        inception.payload.data.streamKind === expectedStreamKind,
        'Wrong stream kind',
        Err.BAD_STREAM_CREATION_PARAMS,
    )

    const streamId = inception.payload.streamId
    check(isValidStreamId(streamId), 'Invalid streamId', Err.BAD_STREAM_ID)

    const expectedLength = expectedExtraEvent !== undefined ? 2 : 1
    check(
        events.length === expectedLength,
        'Wrong number of events',
        Err.BAD_STREAM_CREATION_PARAMS,
    )

    if (expectedExtraEvent !== undefined) {
        const second = events[1].base
        check(
            second.payload.kind === expectedExtraEvent,
            'Second event must be ' + expectedExtraEvent,
            Err.BAD_STREAM_CREATION_PARAMS,
        )

        check(
            second.creatorAddress === inception.creatorAddress,
            'creatorAddress mismatch',
            Err.BAD_STREAM_CREATION_PARAMS,
        )

        if (second.payload.kind === 'join') {
            check(
                second.creatorAddress === second.payload.userId,
                'User must join space or channel created by them',
                Err.BAD_STREAM_CREATION_PARAMS,
            )
        }
    }

    check(
        !(await server.store.streamExists(streamId)),
        `Stream already exists: ${streamId}`,
        Err.STREAM_ALREADY_EXISTS,
    )

    return streamId
}

export const addJoinedEventToUserStream = async (
    server: ZionServer,
    streamId: string,
    joinEvent: TypedFullEvent<JoinStreamPayload>,
) => {
    const userStreamId = makeUserStreamId(joinEvent.base.payload.userId)
    const { events } = await server.store.getEventStream(userStreamId)
    await server.store.addEvents(userStreamId, [
        makeEvent(
            server.wallet,
            {
                kind: 'user-joined',
                streamId,
                eventRef: makeEventRef(streamId, joinEvent),
            },
            findLeafEventHashes(userStreamId, events),
        ),
    ])
}
