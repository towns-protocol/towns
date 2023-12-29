/**
 * @group main
 */

import { makeEvent, SignerContext, unpackEnvelopes, unpackStreamResponse } from './sign'
import { MembershipOp } from '@river/proto'
import { dlog } from './dlog'
import { lastEventFiltered, makeRandomUserContext, makeTestRpcClient } from './util.test'
import {
    genId,
    makeChannelStreamId,
    makeSpaceStreamId,
    makeUserStreamId,
    userIdFromAddress,
} from './id'
import {
    getChannelPayload,
    getUserPayload_Membership,
    make_ChannelPayload_Inception,
    make_ChannelPayload_Membership,
    make_fake_encryptedData,
    make_SpacePayload_Inception,
    make_SpacePayload_Membership,
    make_UserPayload_Inception,
} from './types'

const base_log = dlog('test:workflows')

describe('workflows', () => {
    let bobsContext: SignerContext

    beforeEach(async () => {
        bobsContext = await makeRandomUserContext()
    })

    test('creationSideEffects', async () => {
        const log = base_log.extend('creationSideEffects')
        log('start')

        const bob = makeTestRpcClient()
        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamId = makeUserStreamId(bobsUserId)
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
        const spacedStreamId = makeSpaceStreamId('bobs-space-' + genId())
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
                    make_SpacePayload_Membership({
                        userId: bobsUserId,
                        op: MembershipOp.SO_JOIN,
                    }),
                ),
            ],
            streamId: spacedStreamId,
        })

        // Now there must be "joined space" event in the user stream.
        let userResponse = await bob.getStream({ streamId: bobsUserStreamId })
        expect(userResponse.stream).toBeDefined()
        let joinPayload = lastEventFiltered(
            unpackEnvelopes(userResponse.stream!.events),
            getUserPayload_Membership,
        )
        expect(joinPayload).toBeDefined()
        expect(joinPayload?.op).toEqual(MembershipOp.SO_JOIN)
        expect(joinPayload?.streamId).toEqual(spacedStreamId)

        log('Bob created space, about to create channel')
        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        const channelProperties = 'Bobs channel properties'

        const channelInceptionEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId: spacedStreamId,
                channelProperties: make_fake_encryptedData(channelProperties),
            }),
        )
        const channelJoinEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Membership({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
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
            [
                ...unpackStreamResponse(userResponse).miniblocks.flatMap((x) => x.events),
                ...unpackEnvelopes(userResponse.stream!.events),
            ],
            getUserPayload_Membership,
        )

        expect(joinPayload).toBeDefined()
        expect(joinPayload?.op).toEqual(MembershipOp.SO_JOIN)
        expect(joinPayload?.streamId).toEqual(channelId)

        // Not there must be "channel created" event in the space stream.
        const spaceResponse = await bob.getStream({ streamId: spacedStreamId })
        expect(spaceResponse.stream).toBeDefined()
        const envelopes = [
            ...unpackStreamResponse(spaceResponse).miniblocks.flatMap((x) => x.events),
            ...unpackEnvelopes(spaceResponse.stream!.events),
        ]
        const channelCreatePayload = lastEventFiltered(envelopes, getChannelPayload)
        expect(channelCreatePayload).toBeDefined()
        expect(channelCreatePayload?.channelId).toEqual(channelId)

        log('Bob created channel')
        log('Done')
    })
})
