import { Client } from './client'
import debug from 'debug'
import seedrandom from 'seedrandom'
import { Payload_Message } from '@towns/proto'
import { makeTestClient } from './util.test'
import { ParsedEvent } from './types'
import { StreamEventKeys } from './streams'
import { makeUniqueChannelStreamId, makeUniqueSpaceStreamId } from './id'

const log = debug('test:aliceAndFriends')

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

        this.client.on('userInvitedToStream', (s) => void this.userInvitedToStream.bind(this)(s))
        this.client.on('userJoinedStream', (s) => void this.userJoinedStream.bind(this)(s))
        this.client.on('channelNewMessage', (s, m) => void this.channelNewMessage.bind(this)(s, m))

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

    channelNewMessage(channelId: string, message: ParsedEvent): void {
        const text = (message.event.payload!.payload.value! as Payload_Message).text
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

const makeTestDriver = async (num: number): Promise<TestDriver> => {
    const client = await makeTestClient()
    return new TestDriver(client, num)
}

const converse = async (conversation: string[][], testName: string): Promise<void> => {
    const numDrivers = conversation[0].length
    const numConversationSteps = conversation.length

    log(`${testName} START, numDrivers=${numDrivers}, steps=${conversation.length}`)
    const drivers = await Promise.all(
        Array.from({ length: numDrivers })
            .fill('')
            .map(async (_, i) => await makeTestDriver(i)),
    )

    log(`${testName} starting all drivers`)
    await Promise.all(
        drivers.map(async (d) => {
            log(`${testName} starting driver`, {
                num: d.num,
                userId: d.client.userId,
            })
            await d.start()
            log(`${testName} started driver`, { num: d.num })
        }),
    )
    log(`${testName} started all drivers`)

    const alice = drivers[0]
    const others = drivers.slice(1)

    const spaceId = makeUniqueSpaceStreamId()
    log(`${testName} creating space ${spaceId}`)
    await expect(alice.client.createSpace(spaceId)).toResolve()
    await expect(alice.client.waitForStream(spaceId)).toResolve()

    // Invite and join space.
    log(`${testName} inviting others to space`)
    const allJoinedSpace = Promise.all(others.map((d) => d.waitFor('userJoinedStream')))
    await Promise.all(others.map((d) => alice.client.inviteUser(spaceId, d.client.userId)))
    log(`${testName} and wait for all to join space...`)
    await expect(allJoinedSpace).toResolve()
    log(`${testName} all joined space`)
    log(
        `${testName} inviting others to space after`,
        others.map((d) => ({ num: d.num, userStreamId: d.client.userStreamId })),
    )

    log(`${testName} creating channel`)
    const channelId = makeUniqueChannelStreamId()
    await expect(alice.client.createChannel(spaceId, channelId)).toResolve()
    await expect(alice.client.waitForStream(channelId)).toResolve()

    // Invite and join channel.
    log(
        `${testName} inviting others to channel`,
        others.map((d) => ({ num: d.num, userStreamId: d.client.userStreamId })),
    )
    const allJoined = Promise.all(others.map((d) => d.waitFor('userJoinedStream')))
    await expect(
        Promise.all(
            others.map(async (d) => {
                alice.client.inviteUser(channelId, d.client.userId)
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

    function bytesToNumber(byteArray: Uint8Array) {
        let result = 0
        for (let i = byteArray.length - 1; i >= 0; i--) {
            result = result * 256 + byteArray[i]
        }

        return result
    }
    const { eventCount, syncCookie } = await alice.client.getStreamSyncCookie(channelId)
    log(
        `${testName} drivers stopped`,
        eventCount,
        bytesToNumber(syncCookie.slice(0, 8)),
        numDrivers,
        numConversationSteps,
    )
    expect(eventCount).toEqual(bytesToNumber(syncCookie.slice(0, 8)))
}

// TODO: fix CI and remove this
const testSkipCI = process.env.SKIP_BROKEN ? test.skip : test

describe('aliceAndBobAndFriends', () => {
    testSkipCI('3participants', async () => {
        const conversation: string[][] = [
            ["I'm Alice", "I'm Bob", ''],
            ['Alice: hi Bob', 'Bob: hi', ''],
            ['Alice: yo', '', 'Charlie here'],
            ['Alice: hello Charlie', 'Bob: hi Charlie', 'Charlie charlie'],
        ]

        const convResult = converse(conversation, '3participants')
        await expect(convResult).toResolve()
        log(`3participants completed`, convResult)
    })

    testSkipCI('10for20', async () => {
        const conversation: string[][] = []
        for (let i = 0; i < 10; i++) {
            const step: string[] = []
            for (let j = 0; j < 10; j++) {
                step.push(`step ${i} from ${j}`)
            }
            conversation.push(step)
        }
        const convResult = converse(conversation, '10for20')
        await expect(convResult).toResolve()
    })

    testSkipCI('longAndRandom', async () => {
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

        await expect(converse(conversation, 'longAndRandom')).toResolve()
    })
})
