/**
 * @group main
 */

import { makeEvent, unpackStreamEnvelopes } from './sign'
import { MembershipOp } from '@river-build/proto'
import { dlog } from '@river-build/dlog'
import {
    lastEventFiltered,
    makeRandomUserContext,
    makeTestRpcClient,
    makeUniqueSpaceStreamId,
} from './util.test'
import {
    makeUniqueChannelStreamId,
    makeUserStreamId,
    streamIdToBytes,
    userIdFromAddress,
} from './id'
import {
    getChannelUpdatePayload,
    getUserPayload_Membership,
    make_ChannelPayload_Inception,
    make_MemberPayload_Membership2,
    make_SpacePayload_Inception,
    make_UserPayload_Inception,
} from './types'
import { SignerContext } from './signerContext'

const base_log = dlog('csb:test:workflows')

describe('workflows', () => {
    let bobsContext: SignerContext

    beforeEach(async () => {
        bobsContext = await makeRandomUserContext()
    })

    test('creationSideEffects', async () => {
        const log = base_log.extend('creationSideEffects')
        log('start')

        const bob = await makeTestRpcClient()
        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamIdStr = makeUserStreamId(bobsUserId)
        const bobsUserStreamId = streamIdToBytes(bobsUserStreamIdStr)
        await bob.createStream({
            events: [
                await makeEvent(
                    bobsContext,
                    make_UserPayload_Inception({
                        streamId: bobsUserStreamId,
                    }),
                ),
            ],
            streamId: bobsUserStreamId,
        })

        log('Bob created user, about to create space')
        const spacedStreamIdStr = makeUniqueSpaceStreamId()
        const spacedStreamId = streamIdToBytes(spacedStreamIdStr)
        const spaceInceptionEvent = await makeEvent(
            bobsContext,
            make_SpacePayload_Inception({
                streamId: spacedStreamId,
            }),
        )
        await bob.createStream({
            events: [
                spaceInceptionEvent,
                await makeEvent(
                    bobsContext,
                    make_MemberPayload_Membership2({
                        userId: bobsUserId,
                        op: MembershipOp.SO_JOIN,
                        initiatorId: bobsUserId,
                    }),
                ),
            ],
            streamId: spacedStreamId,
        })

        // Now there must be "joined space" event in the user stream.
        let userResponse = await bob.getStream({ streamId: bobsUserStreamId })
        expect(userResponse.stream).toBeDefined()
        let joinPayload = lastEventFiltered(
            await unpackStreamEnvelopes(userResponse.stream!),
            getUserPayload_Membership,
        )
        expect(joinPayload).toBeDefined()
        expect(joinPayload?.op).toEqual(MembershipOp.SO_JOIN)
        expect(joinPayload?.streamId).toEqual(spacedStreamId)

        log('Bob created space, about to create channel')
        const channelIdStr = makeUniqueChannelStreamId(spacedStreamIdStr)
        const channelId = streamIdToBytes(channelIdStr)

        const channelInceptionEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId: spacedStreamId,
            }),
        )
        const channelJoinEvent = await makeEvent(
            bobsContext,
            make_MemberPayload_Membership2({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
                initiatorId: bobsUserId,
            }),
        )
        await bob.createStream({
            events: [channelInceptionEvent, channelJoinEvent],
            streamId: channelId,
        })

        // Now there must be "joined channel" event in the user stream.
        userResponse = await bob.getStream({ streamId: bobsUserStreamId })
        expect(userResponse.stream).toBeDefined()
        joinPayload = lastEventFiltered(
            await unpackStreamEnvelopes(userResponse.stream!),
            getUserPayload_Membership,
        )

        expect(joinPayload).toBeDefined()
        expect(joinPayload?.op).toEqual(MembershipOp.SO_JOIN)
        expect(joinPayload?.streamId).toEqual(channelId)

        // Not there must be "channel created" event in the space stream.
        const spaceResponse = await bob.getStream({ streamId: spacedStreamId })
        expect(spaceResponse.stream).toBeDefined()
        const channelCreatePayload = lastEventFiltered(
            await unpackStreamEnvelopes(spaceResponse.stream!),
            getChannelUpdatePayload,
        )
        expect(channelCreatePayload).toBeDefined()
        expect(channelCreatePayload?.channelId).toEqual(channelId)

        log('Bob created channel')
        log('Done')
    })
})
