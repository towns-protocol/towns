import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import {
    Err,
    makeEvent,
    makeEvents,
    makeSpaceStreamId,
    makeUserStreamId,
    StreamKind,
    ZionServiceInterface,
} from '@zion/core'
import debug from 'debug'
import { Wallet } from 'ethers'
import { nanoid } from 'nanoid'
import { startZionApp, ZionApp } from '../app'
import { makeEvent_test, makeTestParams } from './util.test'

describe('BasicRpcTest', () => {
    let zionApp: ZionApp

    beforeAll(async () => {
        zionApp = startZionApp(0)
    })

    afterAll(async () => {
        await zionApp.stop()
    })

    let bobsWallet: Wallet

    beforeEach(async () => {
        bobsWallet = Wallet.createRandom()
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
                            bobsWallet,
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
                        bobsWallet,
                        {
                            kind: 'inception',
                            streamId: makeUserStreamId(bobsWallet.address),
                            data: { streamKind: StreamKind.User },
                        },
                        [],
                    ),
                ],
            })
            log('Bob created user, about to create space')

            // Bob creates space and channel
            const spaceId = makeSpaceStreamId('bobs-space-' + nanoid())
            await bob.createSpace({
                events: makeEvents(
                    bobsWallet,
                    [
                        {
                            kind: 'inception',
                            streamId: spaceId,
                            data: { streamKind: StreamKind.Space },
                        },
                        {
                            kind: 'join',
                            userId: bobsWallet.address,
                        },
                    ],
                    [],
                ),
            })
            log('Bob created space, about to create channel')

            const channelId = makeSpaceStreamId('bobs-channel-' + nanoid())
            const channelEvents = makeEvents(
                bobsWallet,
                [
                    {
                        kind: 'inception',
                        streamId: channelId,
                        data: { streamKind: StreamKind.Channel, spaceId },
                    },
                    {
                        kind: 'join',
                        userId: bobsWallet.address,
                    },
                ],
                [],
            )
            await bob.createChannel({
                events: channelEvents,
            })

            log('Bob fails to create channel with badly chained initial events, hash empty')
            const channelId2 = makeSpaceStreamId('bobs-channel2-' + nanoid())
            const channelEvent2_0 = makeEvent(
                bobsWallet,
                {
                    kind: 'inception',
                    streamId: channelId2,
                    data: { streamKind: StreamKind.Channel, spaceId },
                },
                [],
            )
            const channelEvent2_1 = makeEvent_test(
                bobsWallet,
                {
                    kind: 'join',
                    userId: bobsWallet.address,
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
                bobsWallet,
                {
                    kind: 'join',
                    userId: bobsWallet.address,
                },
                [channelEvent2_1.hash],
            )
            await expect(
                bob.createChannel({
                    events: [channelEvent2_0, channelEvent2_2],
                }),
            ).rejects.toThrow(expect.objectContaining({ code: Err.BAD_PREV_EVENTS }))

            log('Bob adds event with correct hash')
            const messageEvent = makeEvent(bobsWallet, { kind: 'message', text: 'Hello, world!' }, [
                channelEvents[1].hash,
            ])
            await bob.addEvent({
                streamId: channelId,
                event: messageEvent,
            })

            log('Bob fails to add event with empty hash')
            await expect(
                bob.addEvent({
                    streamId: channelId,
                    event: makeEvent_test(
                        bobsWallet,
                        { kind: 'message', text: 'Hello, world!' },
                        [],
                    ),
                }),
            ).rejects.toThrow(expect.objectContaining({ code: Err.BAD_PREV_EVENTS }))

            log('Bob fails to add event with wrong hash')
            await expect(
                bob.addEvent({
                    streamId: channelId,
                    event: makeEvent(bobsWallet, { kind: 'message', text: 'Hello, world!' }, [
                        channelEvent2_0.hash,
                    ]),
                }),
            ).rejects.toThrow(expect.objectContaining({ code: Err.BAD_PREV_EVENTS }))
        },
    )
})
