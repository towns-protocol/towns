import { Client, makeZionRpcClient } from '@zion/client'
import {
    FullEvent,
    genId,
    makeChannelStreamId,
    makeSpaceStreamId,
    MessagePayload,
    SignerContext,
    StreamEventKeys,
    StreamKind,
} from '@zion/core'
import debug from 'debug'
import { startZionApp, ZionApp } from '../app'
import { makeTestClient } from './util.test'
import { config } from '../config'
import seedrandom from 'seedrandom'

const log = debug('test:aliceBobAndFriends')

const testSuffix = config.testRemoteUrl === undefined ? '-viaClient' : '-remote'

class TestDriver {
    readonly client: Client
    readonly num: number
    private log: debug.Debugger
    private stepNum?: number

    expected?: Set<string>
    allExpectedReceived?: (value: void | PromiseLike<void>) => void
    badMessageReceived?: (reason?: any) => void

    constructor(client: Client, num: number) {
        this.client = client
        this.num = num
        this.log = debug(`test:aliceBobAndFriends:client:${this.num}:step:${this.stepNum}`)
    }

    async start(): Promise<void> {
        this.log(`driver starting client`)

        await expect(this.client.createNewUser()).toResolve()

        this.client.on('userInvitedToStream', this.userInvitedToStream.bind(this))
        this.client.on('userJoinedStream', this.userJoinedStream.bind(this))
        this.client.on('channelNewMessage', this.channelNewMessage.bind(this))

        this.client.startSync(1000)
        this.log(`driver started client`)
    }

    async stop(): Promise<void> {
        this.log(`driver stopping client`)
        await this.client.stop()
        this.log(`driver stopped client`)
    }

    userInvitedToStream(streamId: string): void {
        this.log(`userInvitedToStream streamId=${streamId}`)
        this.client.joinChannel(streamId)
    }

    userJoinedStream(streamId: string): void {
        this.log(`userJoinedStream streamId=${streamId}`)
    }

    channelNewMessage(channelId: string, message: FullEvent): void {
        const text = JSON.parse((message.base.payload as MessagePayload).text).text!
        this.log(`channelNewMessage channelId=${channelId} message=${text}`, this.expected)
        if (this.expected?.delete(text)) {
            this.log(`channelNewMessage expected message Received, text=${text}`)

            if (this.expected.size === 0) {
                this.expected = undefined
                if (this.allExpectedReceived === undefined) {
                    throw new Error('allExpectedReceived is undefined')
                }
                this.log(`channelNewMessage all expected messages Received, text=${text}`)
                this.allExpectedReceived()
            } else {
                this.log(`channelNewMessage still expecting messages`, this.expected)
            }
        } else {
            if (this.badMessageReceived === undefined) {
                throw new Error('badMessageReceived is undefined')
            }
            this.log(`channelNewMessage badMessageReceived text=${text}`)
            this.badMessageReceived(`badMessageReceived text=${text}`)
        }
    }

    async step(
        channelId: string,
        stepNum: number,
        expected: Set<string>,
        message: string,
    ): Promise<void> {
        this.stepNum = stepNum
        this.log = debug(`test:client:${this.num}:step:${this.stepNum}`)

        this.log(`step start`, message)

        this.expected = new Set(expected)
        const ret = new Promise<void>((resolve, reject) => {
            this.allExpectedReceived = resolve
            this.badMessageReceived = reject
        })

        if (message !== '') {
            this.log(`step sending channelId=${channelId} message=${message}`)
            await expect(this.client.sendMessage(channelId, message)).toResolve()
        }
        await ret

        this.allExpectedReceived = undefined
        this.badMessageReceived = undefined
        this.log(`step end`, message)
        this.stepNum = undefined
        this.log = debug(`test:client:${this.num}:step:${this.stepNum}`)
    }

    async waitFor(event: StreamEventKeys): Promise<void> {
        return new Promise((resolve) => {
            this.client.once(event, () => {
                resolve()
            })
        })
    }
}

const makeTestDriver = async (url: string, num: number): Promise<TestDriver> => {
    const client = await makeTestClient(url)
    return new TestDriver(client, num)
}

const converse = async (url: string, conversation: string[][], testName: string): Promise<void> => {
    const numDrivers = conversation[0].length

    log(`${testName} START, numDrivers=${numDrivers}, steps=${conversation.length}`)
    const drivers = await Promise.all(
        Array.from({ length: numDrivers })
            .fill('')
            .map(async (_, i) => await makeTestDriver(url, i)),
    )

    log(`${testName} starting all drivers`)
    await Promise.all(
        drivers.map(async (d) => {
            log(`${testName} starting driver`, {
                num: d.num,
                creatorAddress: d.client.signerContext.creatorAddress,
            })
            await d.start()
            log(`${testName} started driver`, { num: d.num })
        }),
    )
    log(`${testName} started all drivers`)

    const alice = drivers[0]
    const others = drivers.slice(1)

    const spaceId = makeSpaceStreamId(genId())
    log(`${testName} creating space ${spaceId}`)
    await expect(alice.client.createSpace(spaceId)).toResolve()
    await expect(alice.client.waitForStream(spaceId)).toResolve()

    // Invite and join space.
    log(`${testName} inviting others to space`)
    const allJoinedSpace = Promise.all(others.map(async (d) => await d.waitFor('userJoinedStream')))
    await Promise.all(
        others.map(async (d) => {
            log(`${testName} alice inviting ${d.client.signerContext.creatorAddress} to ${spaceId}`)
            await alice.client.inviteUser(spaceId, d.client.signerContext.creatorAddress)
            log(`${testName} alice invited ${d.client.signerContext.creatorAddress} to ${spaceId}`)
        }),
    )
    log(`${testName} and wait for all to join space...`)
    await expect(allJoinedSpace).toResolve()
    log(`${testName} all joined space`)
    log(
        `${testName} inviting others to space after`,
        others.map((d) => ({ num: d.num, userStreamId: d.client.userStreamId })),
    )

    log(`${testName} creating channel`)
    const channelId = makeChannelStreamId(genId())
    await expect(alice.client.createChannel(spaceId, channelId)).toResolve()
    await expect(alice.client.waitForStream(channelId)).toResolve()

    // Invite and join channel.

    // Invite and join.
    log(
        `${testName} inviting others to channel`,
        others.map((d) => ({ num: d.num, userStreamId: d.client.userStreamId })),
    )
    const allJoined = Promise.all(others.map(async (d) => await d.waitFor('userJoinedStream')))
    await expect(
        Promise.all(
            others.map(async (d) => {
                log(
                    `${testName} channel alice inviting ${d.client.signerContext.creatorAddress} to channel ${channelId}`,
                )

                await alice.client.inviteUser(channelId, d.client.signerContext.creatorAddress)
                log(
                    `${testName} channel alice invited ${d.client.signerContext.creatorAddress} to channel${channelId}`,
                )
            }),
        ),
    ).toResolve()

    log(`${testName} and wait for all to join...`)
    await expect(allJoined).toResolve()
    log(`${testName} all joined`)

    for (const [conv_idx, conv] of conversation.entries()) {
        const expected = new Set(conv.filter((s) => s !== ''))
        log(`${testName} conversation stepping start ${conv_idx}`, expected, conv)
        await expect(
            Promise.all(
                conv.map(async (msg, msg_idx) => {
                    log(
                        `${testName} conversation step before send conv: ${conv_idx} msg: ${msg_idx}`,
                        msg,
                    )
                    await drivers[msg_idx].step(channelId, conv_idx, new Set(expected), msg)
                    log(
                        `${testName} conversation step after send conv: ${conv_idx} msg: ${msg_idx}`,
                        msg,
                    )
                }),
            ),
        ).toResolve()
        log(`${testName} conversation stepping end ${conv_idx}`, conv)
    }
    log(`${testName} conversation complete, now stopping drivers`)

    await Promise.all(drivers.map((d) => d.stop()))
    log(`${testName} drivers stopped`)
}

describe('aliceAndBobAndFriends', () => {
    let zionApp: ZionApp
    let url: string

    beforeEach(async () => {
        log('beforeEach START')
        if (config.testRemoteUrl === undefined) {
            zionApp = startZionApp(0)
            url = zionApp.url
        } else {
            url = config.testRemoteUrl
        }
        log('beforeEach END')
    })

    afterEach(async () => {
        log('afterEach START')
        if (zionApp !== undefined) {
            await zionApp.stop()
        }
        log('afterEach END')
    })

    test('3participants' + testSuffix, async () => {
        const conversation: string[][] = [
            ["I'm Alice", "I'm Bob", ''],
            ['Alice: hi Bob', 'Bob: hi', ''],
            ['Alice: yo', '', 'Charlie here'],
            ['Alice: hello Charlie', 'Bob: hi Charlie', 'Charlie charlie'],
        ]

        try {
            const convResult = converse(url, conversation, '3participants' + testSuffix)
            await expect(convResult).toResolve()
            log(`3participants completed`, convResult)
        } catch (err) {
            log(`conversationFailed`, err)
        }
    })

    test('10for20' + testSuffix, async () => {
        const conversation: string[][] = []
        for (let i = 0; i < 10; i++) {
            const step: string[] = []
            for (let j = 0; j < 10; j++) {
                step.push(`step ${i} from ${j}`)
            }
            conversation.push(step)
        }
        try {
            const convResult = converse(url, conversation, '10for20' + testSuffix)
            await expect(convResult).toResolve()
        } catch (err) {
            log(`conversationFailed`, err)
        }
    })

    test('longAndRandom' + testSuffix, async () => {
        const rng = seedrandom('this is not a random')
        const conversation: string[][] = []
        for (let i = 0; i < 100; i++) {
            const step: string[] = []
            for (let j = 0; j < 10; j++) {
                step.push(rng() < 0.3 ? `step ${i} from ${j}` : '')
            }

            // Skip step if all are empty.
            if (step.some(Boolean)) {
                conversation.push(step)
            }
        }

        await expect(converse(url, conversation, 'longAndRandom' + testSuffix)).toResolve()
    })
})
