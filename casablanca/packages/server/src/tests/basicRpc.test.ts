import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import {
    Err,
    genId,
    makeEvent,
    makeEvents,
    makeSpaceStreamId,
    makeUserStreamId,
    SignerContext,
    StreamKind,
    ZionServiceInterface,
} from '@zion/core'
import debug from 'debug'
import { startZionApp, ZionApp } from '../app'
import { makeEvent_test, makeRandomUserContext, makeTestParams } from './util.test'

describe('BasicRpcTest', () => {
    let zionApp: ZionApp

    beforeAll(async () => {
        zionApp = startZionApp(0, 'postgres')
    })

    afterAll(async () => {
        await zionApp.stop()
    })

    let bobsContext: SignerContext

    beforeEach(async () => {
        bobsContext = await makeRandomUserContext()
    })

    const testParams = () => makeTestParams(() => zionApp)

    test.each(testParams())(
        'errorCodeTransmitted-%s',
        async (method: string, service: () => ZionServiceInterface) => {
            const bob = service()
            await expect(
                bob.createUser({
                    events: [
                        makeEvent(
                            bobsContext,
                            {
                                kind: 'inception',
                                streamId: 'foo',
                                data: { streamKind: StreamKind.User },
                            },
                            [],
                        ),
                    ],
                }),
            ).rejects.toThrow(expect.objectContaining({ code: Err.BAD_STREAM_ID }))

            await expect(
                bob.createUser({
                    events: [],
                }),
            ).rejects.toThrow(expect.objectContaining({ code: Err.BAD_STREAM_CREATION_PARAMS }))
        },
    )

    test.each(testParams())(
        'cantAddWithBadhHash-%s',
        async (method: string, service: () => ZionServiceInterface) => {
            const log = debug(`test:BasicRpcTest:cantAddWithBadhHash-${method}`)

            const bob = service()
            await bob.createUser({
                events: [
                    makeEvent(
                        bobsContext,
                        {
                            kind: 'inception',
                            streamId: makeUserStreamId(bobsContext.creatorAddress),
                            data: { streamKind: StreamKind.User },
                        },
                        [],
                    ),
                ],
            })
            log('Bob created user, about to create space')

            // Bob creates space and channel
            const spaceId = makeSpaceStreamId('bobs-space-' + genId())
            await bob.createSpace({
                events: makeEvents(
                    bobsContext,
                    [
                        {
                            kind: 'inception',
                            streamId: spaceId,
                            data: { streamKind: StreamKind.Space },
                        },
                        {
                            kind: 'join',
                            userId: bobsContext.creatorAddress,
                        },
                    ],
                    [],
                ),
            })
            log('Bob created space, about to create channel')

            const channelId = makeSpaceStreamId('bobs-channel-' + genId())
            const channelEvents = makeEvents(
                bobsContext,
                [
                    {
                        kind: 'inception',
                        streamId: channelId,
                        data: { streamKind: StreamKind.Channel, spaceId },
                    },
                    {
                        kind: 'join',
                        userId: bobsContext.creatorAddress,
                    },
                ],
                [],
            )
            await bob.createChannel({
                events: channelEvents,
            })

            log('Bob fails to create channel with badly chained initial events, hash empty')
            const channelId2 = makeSpaceStreamId('bobs-channel2-' + genId())
            const channelEvent2_0 = makeEvent(
                bobsContext,
                {
                    kind: 'inception',
                    streamId: channelId2,
                    data: { streamKind: StreamKind.Channel, spaceId },
                },
                [],
            )
            const channelEvent2_1 = makeEvent_test(
                bobsContext,
                {
                    kind: 'join',
                    userId: bobsContext.creatorAddress,
                },
                [],
            )
            await expect(
                bob.createChannel({
                    events: [channelEvent2_0, channelEvent2_1],
                }),
            ).rejects.toThrow(expect.objectContaining({ code: Err.BAD_PREV_EVENTS }))

            log('Bob fails to create channel with badly chained initial events, wrong hash value')
            const channelEvent2_2 = makeEvent(
                bobsContext,
                {
                    kind: 'join',
                    userId: bobsContext.creatorAddress,
                },
                [channelEvent2_1.hash],
            )
            await expect(
                bob.createChannel({
                    events: [channelEvent2_0, channelEvent2_2],
                }),
            ).rejects.toThrow(expect.objectContaining({ code: Err.BAD_PREV_EVENTS }))

            log('Bob adds event with correct hash')
            const messageEvent = makeEvent(
                bobsContext,
                { kind: 'message', text: 'Hello, world!' },
                [channelEvents[1].hash],
            )
            await bob.addEvent({
                streamId: channelId,
                event: messageEvent,
            })

            log('Bob fails to add event with empty hash')
            await expect(
                bob.addEvent({
                    streamId: channelId,
                    event: makeEvent_test(
                        bobsContext,
                        { kind: 'message', text: 'Hello, world!' },
                        [],
                    ),
                }),
            ).rejects.toThrow(expect.objectContaining({ code: Err.BAD_PREV_EVENTS }))

            log('Bob fails to add event with wrong hash')
            await expect(
                bob.addEvent({
                    streamId: channelId,
                    event: makeEvent(bobsContext, { kind: 'message', text: 'Hello, world!' }, [
                        channelEvent2_0.hash,
                    ]),
                }),
            ).rejects.toThrow(expect.objectContaining({ code: Err.BAD_PREV_EVENTS }))
        },
    )
})
