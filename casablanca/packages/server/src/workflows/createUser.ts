import {
    check,
    CreateUserParams,
    CreateUserResult,
    Err,
    makeUserStreamId,
    StreamKind,
} from '@zion/core'
import debug from 'debug'
import { ZionServer } from '../server'
import { checkStreamCreationParams } from './streamUtils'

const log = debug('server:createUser')

export const createUser = async (
    server: ZionServer,
    { events }: CreateUserParams,
): Promise<CreateUserResult> => {
    log('server:createUser', events.length > 0 ? events[0] : null)

    const streamId = await checkStreamCreationParams(server, events, StreamKind.User)

    // TODO: check permissions
    check(
        makeUserStreamId(events[0].base.creatorAddress) === streamId,
        'streamId of user stream must match userId',
        Err.BAD_STREAM_CREATION_PARAMS,
    )

    const syncCookie = await server.store.createEventStream(streamId, events)
    return { syncCookie }
}
