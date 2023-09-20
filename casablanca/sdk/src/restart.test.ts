/**
 * @group restart
 */

import { MembershipOp } from '@river/proto'
import { setTimeout } from 'timers/promises'
import { dlog } from './dlog'
import {
    genId,
    makeChannelStreamId,
    makeSpaceStreamId,
    makeUserStreamId,
    userIdFromAddress,
} from './id'
import { StreamRpcClientType } from './makeStreamRpcClient'
import { makeEvent, SignerContext, unpackEnvelopes } from './sign'
import {
    getChannelPayload,
    getMessagePayload,
    make_ChannelPayload_Inception,
    make_ChannelPayload_Membership,
    make_ChannelPayload_Message,
    make_SpacePayload_Inception,
    make_SpacePayload_Membership,
    make_UserPayload_Inception,
} from './types'
import { lastEventFiltered, makeRandomUserContext, makeTestRpcClient } from './util.test'

const log = dlog('csb:test:nodeRestart')

describe('nodeRestart', () => {
    let bobsContext: SignerContext

    beforeEach(async () => {
        bobsContext = await makeRandomUserContext()
    })

    test('bobCanChatAfterRestart', async () => {
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
            streamId: bobsUserStreamId,
        })
        log('Bob created user, about to create space')

        // Bob creates space and channel
        const spacedStreamId = makeSpaceStreamId('bobs-space-' + genId())
        const spaceInceptionEvent = await makeEvent(
            bobsContext,
            make_SpacePayload_Inception({
                streamId: spacedStreamId,
                name: 'Bobs space',
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
            streamId: spacedStreamId,
        })

        const channelId = await createNewChannelAndPostHello(
            bobsContext,
            spacedStreamId,
            bobsUserId,
            bob,
        )

        log('Restarting node')
        await expect(bob.info({ debug: 'exit' })).toResolve()

        log('Waiting a bit')
        await setTimeout(1000)

        for (;;) {
            log('Trying to connect')
            try {
                await bob.info({})
                break
            } catch (e) {
                log('Failed to connect, retrying', 'error=', e)
                await setTimeout(100)
            }
        }
        log('Connected again, node restarted')

        log('Reading back the channel, looking for hello')
        await expect(getStreamAndExpectHello(bob, channelId)).toResolve()

        log('Creating another channel, post hello')
        const channelId2 = await createNewChannelAndPostHello(
            bobsContext,
            spacedStreamId,
            bobsUserId,
            bob,
        )
        await expect(getStreamAndExpectHello(bob, channelId2)).toResolve()

        log('done')
    })
})

const createNewChannelAndPostHello = async (
    bobsContext: SignerContext,
    spacedStreamId: string,
    bobsUserId: string,
    bob: StreamRpcClientType,
) => {
    const channelId = makeChannelStreamId('bobs-channel-' + genId())
    const channelProperties = 'Bobs channel properties'

    const channelInceptionEvent = await makeEvent(
        bobsContext,
        make_ChannelPayload_Inception({
            streamId: channelId,
            spaceId: spacedStreamId,
            channelProperties: { text: channelProperties },
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
    const nextHash = channelJoinEvent.hash
    const channelEvents = [channelInceptionEvent, channelJoinEvent]
    log('creating channel with events=', channelEvents)
    await bob.createStream({
        events: channelEvents,
        streamId: channelId,
    })
    log('Bob created channel, reads it back')
    const channel = await bob.getStream({ streamId: channelId })
    expect(channel).toBeDefined()
    expect(channel.stream).toBeDefined()
    expect(channel.stream?.streamId).toEqual(channelId)

    // Now there must be "channel created" event in the space stream.
    const spaceResponse = await bob.getStream({ streamId: spacedStreamId })
    const channelCreatePayload = lastEventFiltered(
        unpackEnvelopes(spaceResponse.stream!.events),
        getChannelPayload,
    )
    expect(channelCreatePayload).toBeDefined()
    expect(channelCreatePayload?.channelId).toEqual(channelId)
    expect(channelCreatePayload?.channelProperties?.text).toEqual(channelProperties)

    // Post hello to the channel
    const helloEvent = await makeEvent(
        bobsContext,
        make_ChannelPayload_Message({
            text: 'hello',
        }),
        [nextHash],
    )
    await expect(
        bob.addEvent({
            streamId: channelId,
            event: helloEvent,
        }),
    ).toResolve()

    return channelId
}

const getStreamAndExpectHello = async (bob: StreamRpcClientType, channelId: string) => {
    const channel2 = await bob.getStream({ streamId: channelId })
    expect(channel2).toBeDefined()
    expect(channel2.stream).toBeDefined()
    expect(channel2.stream?.streamId).toEqual(channelId)
    const hello = lastEventFiltered(unpackEnvelopes(channel2.stream!.events), getMessagePayload)
    expect(hello).toBeDefined()
    expect(hello?.text).toEqual('hello')
}
