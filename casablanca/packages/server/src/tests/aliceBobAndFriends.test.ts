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
import { makeDonePromise, makeTestClient, waitForStream } from './util.test'
import { config } from '../config'
import { setTimeout } from 'timers/promises'
import seedrandom from 'seedrandom'

const log = debug('test')

const testSuffix = config.testRemoteUrl === undefined ? '-viaClient' : '-remote'

class TestDriver {
    readonly client: Client
    readonly num: number
    readonly log: debug.Debugger

    expected?: Set<string>
    allExpectedReceived?: (value: void | PromiseLike<void>) => void
    badMessageReceived?: (value: void | PromiseLike<void>) => void

    constructor(client: Client, num: number) {
        this.client = client
        this.num = num
        this.log = debug(`test:client:${num}`)
    }

    async start(): Promise<void> {
        await expect(this.client.createNewUser()).toResolve()

        this.client.on('userInvitedToStream', this.userInvitedToStream.bind(this))
        this.client.on('userJoinedStream', this.userJoinedStream.bind(this))
        this.client.on('channelNewMessage', this.channelNewMessage.bind(this))

        this.client.startSync(1000)
    }

    async stop(): Promise<void> {
        await this.client.stop()
    }

    userInvitedToStream(streamId: string): void {
        this.log(`userInvitedToStream, client=${this.num}, steamId=${streamId}`)
        this.client.joinChannel(streamId)
    }

    userJoinedStream(streamId: string): void {
        this.log(`userJoinedStream, client=${this.num}, steamId=${streamId}`)
    }

    channelNewMessage(channelId: string, message: FullEvent): void {
        const text = (message.base.payload as MessagePayload).text!
        this.log(`channelNewMessage, client=${this.num}, message=${text}`)
        if (this.expected?.delete(text)) {
            if (this.expected.size === 0) {
                this.expected = undefined
                if (this.allExpectedReceived === undefined) {
                    throw new Error('allExpectedReceived is undefined')
                }
                this.allExpectedReceived()
            }
        } else {
            if (this.badMessageReceived === undefined) {
                throw new Error('badMessageReceived is undefined')
            }
            this.log(`badMessageReceived, client=${this.num}, text=${text}`)
            this.badMessageReceived()
        }
    }

    async step(channelId: string, expected: Set<string>, message?: string): Promise<void> {
        this.expected = expected
        const ret = new Promise<void>((resolve, reject) => {
            this.allExpectedReceived = resolve
            this.badMessageReceived = reject
        })

        if (message !== undefined) {
            this.log(`sending, client=${this.num}, message=${message}`)
            await expect(this.client.sendMessage(channelId, message)).toResolve()
        }
        return ret
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
    const drivers: TestDriver[] = []
    const numDrivers = conversation[0].length

    log(`${testName} START, numDrivers=${numDrivers}, steps=${conversation.length}`)
    for (let i = 0; i < numDrivers; i++) {
        drivers.push(await makeTestDriver(url, i))
    }

    log(`${testName} starting all drivers`)
    await Promise.all(drivers.map((d) => d.start()))

    const alice = drivers[0]
    const others = drivers.slice(1)

    log(`${testName} creating space`)
    const spaceId = makeSpaceStreamId(genId())
    await expect(alice.client.createSpace(spaceId)).toResolve()

    log(`${testName} creating channel`)
    const channelId = makeChannelStreamId(genId())
    await expect(alice.client.createChannel(spaceId, channelId)).toResolve()
    await expect(waitForStream(alice.client, channelId)).toResolve()

    // Invite and join.
    log(`${testName} inviting others`)
    const allJoined = Promise.all(others.map((d) => d.waitFor('userJoinedStream')))
    await expect(
        Promise.all(
            others.map((d) =>
                alice.client.inviteUser(channelId, d.client.signerContext.creatorAddress),
            ),
        ),
    ).toResolve()

    log(`${testName} and wait for all to join...`)
    await expect(allJoined).toResolve()
    log(`${testName} all joined`)

    for (const [i, conv] of conversation.entries()) {
        log(`${testName} conversation step ${i}`)
        const expected = new Set(conv.filter((s) => s !== ''))
        await expect(
            Promise.all(
                conv.map((s, i) =>
                    drivers[i].step(channelId, new Set(expected), s !== '' ? s : undefined),
                ),
            ),
        ).toResolve()
    }

    await Promise.all(drivers.map((d) => d.stop()))
    log(`${testName} DONE`)
}

describe('aliceAndBobAndFriends', () => {
    let zionApp: ZionApp
    let url: string

    beforeAll(async () => {
        log('beforeAll START')
        if (config.testRemoteUrl === undefined) {
            zionApp = startZionApp(0)
            url = zionApp.url
        } else {
            url = config.testRemoteUrl
        }
        log('beforeAll END')
    })

    afterAll(async () => {
        log('afterAll START')
        if (zionApp !== undefined) {
            await zionApp.stop()
        }
        log('afterAll END')
    })

    test('3participants' + testSuffix, async () => {
        const conversation: string[][] = [
            ["I'm Alice", "I'm Bob", ''],
            ['Alice: hi Bob', 'Bob: hi', ''],
            ['Alice: yo', '', 'Charlie here'],
            ['Alice: hello Charlie', 'Bob: hi Charlie', 'Charlie charlie'],
        ]

        await expect(converse(url, conversation, '3participants' + testSuffix)).toResolve()
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

        await expect(converse(url, conversation, '10for20' + testSuffix)).toResolve()
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
