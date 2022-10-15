import {
    ChannelInceptionData,
    CreateChannelParams,
    CreateChannelResult,
    findLeafEventHashes,
    InceptionPayload,
    JoinStreamPayload,
    makeEvent,
    makeEventRef,
    StreamKind,
    TypedFullEvent,
} from '@zion/core'
import { ZionServer } from '../server'
import { addJoinedEventToUserStream, checkStreamCreationParams } from './streamUtils'

export const createChannel = async (
    server: ZionServer,
    { events }: CreateChannelParams,
): Promise<CreateChannelResult> => {
    const channelId = await checkStreamCreationParams(server, events, StreamKind.Channel, 'join')

    const syncCookie = await server.store.createEventStream(channelId, events)

    // Add corresponding event to space stream
    const payload = events[0].base.payload as InceptionPayload
    const spaceId = (payload.data as ChannelInceptionData).spaceId
    const spaceStream = await server.store.getEventStream(spaceId)
    await server.store.addEvents(spaceId, [
        makeEvent(
            server.wallet,
            {
                kind: 'channel-created',
                channelId,
                eventRef: makeEventRef(channelId, events[0]),
            },
            findLeafEventHashes(spaceId, spaceStream.events),
        ),
    ])

    // Add corresponding event to the user stream
    await addJoinedEventToUserStream(
        server,
        channelId,
        events[1] as TypedFullEvent<JoinStreamPayload>,
    )

    return { syncCookie }
}
