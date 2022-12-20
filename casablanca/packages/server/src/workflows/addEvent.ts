import {
    AddEventParam,
    AddEventResult,
    check,
    checkEvent,
    Err,
    findLeafEventHashes,
    FullEvent,
    makeEvent,
    makeEventRef,
    makeUserStreamId,
    rollupStream,
    StreamStateView,
    throwWithCode,
} from '@zion/core'
import { ZionServer } from '../server'

export const addEvent = async (
    server: ZionServer,
    params: AddEventParam,
): Promise<AddEventResult> => {
    checkEvent(params.event, null)

    const events = await server.store.getEventStream(params.streamId)
    const rollup = rollupStream(params.streamId, events.events)

    // TODO: for now very naive chaining - first event of the bundle must referece any of the previous events in stream.
    check(params.event.base.prevEvents.length > 0, 'No prevEventHashes', Err.BAD_PREV_EVENTS)
    for (const hash of params.event.base.prevEvents) {
        check(rollup.events.has(hash), 'Invalid prevEvents', Err.BAD_PREV_EVENTS)
    }

    switch (params.event.base.payload.kind) {
        case 'inception':
            throwWithCode('Inception event cannot be added', Err.BAD_EVENT)
            break
        case 'user-invited':
        case 'user-joined':
        case 'user-left':
        case 'channel-created':
        case 'channel-deleted':
            throwWithCode('Derived event cannot be added by user', Err.BAD_EVENT)
            break
        case 'join':
        case 'invite':
        case 'leave':
            return addJoinAndFriendsEvent(server, params, rollup)

        case 'message':
            return addMessageEvent(server, params, rollup)

        default:
            const c = params.event.base.payload
            throwWithCode(`Unhandled event kind: ${c}`, Err.INTERNAL_ERROR_SWITCH)
    }
}

const addJoinAndFriendsEvent = async (
    server: ZionServer,
    params: AddEventParam,
    rollup: StreamStateView,
): Promise<AddEventResult> => {
    check(
        rollup.streamKind === 'space' || rollup.streamKind === 'channel',
        'Must be space or channel stream',
        Err.BAD_EVENT,
    )

    const { streamId } = params
    const { creatorAddress, payload } = params.event.base
    check(
        payload.kind === 'join' || payload.kind === 'invite' || payload.kind === 'leave',
        'Must be join/invite/leave',
        Err.BAD_EVENT,
    )

    // TODO: can user join somebody other than yourself?
    // TODO: can user invite yourself?

    const { userId } = payload
    const userStreamId = makeUserStreamId(userId)
    const userStream = await server.store.getEventStream(userStreamId)
    const prevHashes = findLeafEventHashes(streamId, userStream.events)

    server.store.addEvents(params.streamId, [params.event])

    const eventRef = makeEventRef(streamId, params.event)
    let derivedEvent: FullEvent
    switch (payload.kind) {
        case 'join':
            // TODO: hash
            derivedEvent = makeEvent(
                server.signerContext,
                { kind: 'user-joined', streamId, eventRef },
                prevHashes,
            )
            break

        case 'invite':
            derivedEvent = makeEvent(
                server.signerContext,
                { kind: 'user-invited', streamId, inviterId: creatorAddress, eventRef },
                prevHashes,
            )
            break

        case 'leave':
            derivedEvent = makeEvent(
                server.signerContext,
                { kind: 'user-left', streamId, eventRef },
                prevHashes,
            )
            break

        default:
            const c = payload
            throwWithCode(`Unhandled event kind: ${c}`, Err.INTERNAL_ERROR_SWITCH)
    }

    server.store.addEvents(userStreamId, [derivedEvent])

    return {}
}

const addMessageEvent = async (
    server: ZionServer,
    params: AddEventParam,
    rollup: StreamStateView,
): Promise<AddEventResult> => {
    check(rollup.streamKind === 'channel', 'Must be channel stream', Err.BAD_EVENT)
    check(
        rollup.joinedUsers.has(params.event.base.creatorAddress),
        'Not joined',
        Err.USER_CANT_POST,
    )
    server.store.addEvents(params.streamId, [params.event])
    return {}
}
