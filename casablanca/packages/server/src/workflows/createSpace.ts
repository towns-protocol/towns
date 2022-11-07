import {
    CreateSpaceParams,
    CreateSpaceResult,
    InceptionPayload,
    JoinStreamPayload,
    StreamKind,
    TypedFullEvent,
} from '@zion/core'
import { ZionServer } from '../server'
import { addJoinedEventToUserStream, checkStreamCreationParams } from './streamUtils'

export const createSpace = async (
    server: ZionServer,
    { events }: CreateSpaceParams,
): Promise<CreateSpaceResult> => {
    const streamId = await checkStreamCreationParams(server, events, StreamKind.Space, 'join')
    const syncCookie = await server.store.createEventStream(streamId, events)

    await addJoinedEventToUserStream(
        server,
        (events[0].base.payload as InceptionPayload).streamId,
        events[1] as TypedFullEvent<JoinStreamPayload>,
    )

    return { syncCookie }
}
