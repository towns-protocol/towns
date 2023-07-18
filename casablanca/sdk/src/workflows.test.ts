import { makeEvent, SignerContext, unpackEnvelopes } from './sign'
import { MembershipOp } from '@towns/proto'
import { dlog } from './dlog'
import { makeRandomUserContext, TEST_URL } from './util.test'
import _ from 'lodash'
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
    make_SpacePayload_Inception,
    make_SpacePayload_Membership,
    make_UserPayload_Inception,
} from './types'
import { makeStreamRpcClient } from './makeStreamRpcClient'

const base_log = dlog('test:workflows')

const makeTestRpcClient = () => makeStreamRpcClient(TEST_URL)

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
                    [],
                ),
            ],
        })

        log('Bob created user, about to create space')
        const spacedStreamId = makeSpaceStreamId('bobs-space-' + genId())
        const spaceInceptionEvent = await makeEvent(
            bobsContext,
            make_SpacePayload_Inception({
                streamId: spacedStreamId,
            }),
            [],
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
                    [spaceInceptionEvent.hash],
                ),
            ],
        })

        // Now there must be "joined space" event in the user stream.
        let userResponse = await bob.getStream({ streamId: bobsUserStreamId })
        expect(userResponse.stream).toBeDefined()
        expect(userResponse.stream!.events.length).toEqual(3)
        let joinPayload = getUserPayload_Membership(
            _.last(unpackEnvelopes(userResponse.stream!.events)),
        )
        expect(joinPayload).toBeDefined()
        expect(joinPayload?.op).toEqual(MembershipOp.SO_JOIN)
        expect(joinPayload?.streamId).toEqual(spacedStreamId)

        log('Bob created space, about to create channel')
        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        const channelName = 'Bobs channel'
        const channelTopic = 'Bobs channel topic'

        const channelInceptionEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId: spacedStreamId,
                channelName: channelName,
                channelTopic: channelTopic,
            }),
            [],
        )
        const channelJoinEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Membership({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
            }),
            [channelInceptionEvent.hash],
        )
        await bob.createStream({
            events: [channelInceptionEvent, channelJoinEvent],
        })

        // Now there must be "joined channel" event in the user stream.
        userResponse = await bob.getStream({ streamId: bobsUserStreamId })
        expect(userResponse.stream).toBeDefined()
        expect(userResponse.stream!.events.length).toEqual(4)
        joinPayload = getUserPayload_Membership(
            _.last(unpackEnvelopes(userResponse.stream!.events)),
        )
        expect(joinPayload).toBeDefined()
        expect(joinPayload?.op).toEqual(MembershipOp.SO_JOIN)
        expect(joinPayload?.streamId).toEqual(channelId)

        // Not there must be "channel created" event in the space stream.
        const spaceResponse = await bob.getStream({ streamId: spacedStreamId })
        expect(spaceResponse.stream).toBeDefined()
        expect(spaceResponse.stream!.events.length).toEqual(4)
        const channelCreatePayload = getChannelPayload(
            _.last(unpackEnvelopes(spaceResponse.stream!.events)),
        )
        expect(channelCreatePayload).toBeDefined()
        expect(channelCreatePayload?.channelId).toEqual(channelId)

        log('Bob created channel')
        log('Done')
    })
})
