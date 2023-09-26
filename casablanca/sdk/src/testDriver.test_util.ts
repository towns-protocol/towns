import { Client } from './client'
import { DLogger, dlog } from './dlog'
import { makeTestClient } from './util.test'
import { StreamEventKeys } from './streamEvents'
import { makeUniqueChannelStreamId, makeUniqueSpaceStreamId } from './id'
import { ClearContent, RiverEvent } from './event'

const log = dlog('test:aliceAndFriends')

class TestDriver {
    readonly client: Client
    readonly num: number
    private log: DLogger
    private stepNum?: number

    expected?: Set<string>
    allExpectedReceived?: (value: void | PromiseLike<void>) => void
    badMessageReceived?: (reason?: any) => void

    constructor(client: Client, num: number) {
        this.client = client
        this.num = num
        this.log = dlog(`test:aliceBobAndFriends:client:${this.num}:step:${this.stepNum}`)
    }

    async start(): Promise<void> {
        this.log(`driver starting client`)

        await this.client.createNewUser()
        await this.client.initCrypto()

        this.client.on('userInvitedToStream', (s) => void this.userInvitedToStream.bind(this)(s))
        this.client.on('userJoinedStream', (s) => void this.userJoinedStream.bind(this)(s))
        this.client.on('channelNewMessage', (s, m) => void this.channelNewMessage.bind(this)(s, m))

        await this.client.startSync()
        this.log(`driver started client`)
    }

    async stop(): Promise<void> {
        this.log(`driver stopping client`)
        await this.client.stop()
        this.log(`driver stopped client`)
    }

    async userInvitedToStream(streamId: string): Promise<void> {
        this.log(`userInvitedToStream streamId=${streamId}`)
        await this.client.joinStream(streamId)
    }

    userJoinedStream(streamId: string): void {
        this.log(`userJoinedStream streamId=${streamId}`)
    }

    channelNewMessage(channelId: string, event: RiverEvent): void {
        let payload: ClearContent
        let content = ''
        ;(async () => {
            await this.client.decryptEventIfNeeded(event)
            payload = event.getClearContent_ChannelMessage()
            if (!payload) {
                return
            }
            if (
                payload.payload?.case !== 'post' ||
                payload.payload?.value.content.case !== 'text'
            ) {
                throw new Error(`channelNewMessage is not a post`)
            }
            content = payload.payload?.value.content.value.body
            this.log(`channelNewMessage channelId=${channelId} message=${content}`, this.expected)
            if (this.expected?.delete(content)) {
                this.log(`channelNewMessage expected message Received, text=${content}`)

                if (this.expected.size === 0) {
                    this.expected = undefined
                    if (this.allExpectedReceived === undefined) {
                        throw new Error('allExpectedReceived is undefined')
                    }
                    this.log(`channelNewMessage all expected messages Received, text=${content}`)
                    this.allExpectedReceived()
                } else {
                    this.log(`channelNewMessage still expecting messages`, this.expected)
                }
            } else {
                if (this.badMessageReceived === undefined) {
                    throw new Error('badMessageReceived is undefined')
                }
                this.log(
                    `channelNewMessage badMessageReceived text=${content}}, expected=${Array.from(
                        this.expected?.values() ?? [],
                    ).join(', ')}`,
                )
                this.badMessageReceived(
                    `badMessageReceived text=${content}, expected=${Array.from(
                        this.expected?.values() ?? [],
                    ).join(', ')}`,
                )
            }
        })().catch((e) => {
            throw new Error(`channelNewMessage decryptEventIfNeeded error`, <Error>e)
        })
    }

    async step(
        channelId: string,
        stepNum: number,
        expected: Set<string>,
        message: string,
    ): Promise<void> {
        this.stepNum = stepNum
        this.log = dlog(`test:client:${this.num}:step:${this.stepNum}`)

        this.log(`step start`, message)

        this.expected = new Set(expected)
        const ret = new Promise<void>((resolve, reject) => {
            this.allExpectedReceived = resolve
            this.badMessageReceived = reject
        })

        if (message !== '') {
            this.log(`step sending channelId=${channelId} message=${message}`)
            await this.client.sendMessage(channelId, message)
        }
        await ret

        this.allExpectedReceived = undefined
        this.badMessageReceived = undefined
        this.log(`step end`, message)
        this.stepNum = undefined
        this.log = dlog(`test:client:${this.num}:step:${this.stepNum}`)
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

export const converse = async (conversation: string[][], testName: string): Promise<string> => {
    try {
        const numDrivers = conversation[0].length
        const numConversationSteps = conversation.length

        log(`${testName} START, numDrivers=${numDrivers}, steps=${numConversationSteps}`)
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
        log(`${testName} creating town ${spaceId}`)
        await alice.client.createSpace(spaceId)
        await alice.client.waitForStream(spaceId)

        // Invite and join space.
        log(`${testName} inviting others to town`)
        const allJoinedSpace = Promise.all(
            others.map(async (d) => {
                log(`${testName} awaiting userJoinedStream for`, d.client.userId)
                await d.waitFor('userJoinedStream')
                log(`${testName} recevied userJoinedStream for`, d.client.userId)
            }),
        )
        await Promise.all(
            others.map(async (d) => {
                log(`${testName} inviting other to space`, d.client.userId)
                await alice.client.inviteUser(spaceId, d.client.userId)
                log(`${testName} invited other to space`, d.client.userId)
            }),
        )
        log(`${testName} and wait for all to join space...`)
        await allJoinedSpace
        log(`${testName} all joined space`)
        log(
            `${testName} inviting others to space after`,
            others.map((d) => ({ num: d.num, userStreamId: d.client.userStreamId })),
        )

        log(`${testName} creating channel`)
        const channelId = makeUniqueChannelStreamId()
        const channelName = 'Alica channel'
        const channelTopic = 'Alica channel topic'

        await alice.client.createChannel(spaceId, channelName, channelTopic, channelId)
        await alice.client.waitForStream(channelId)

        // Invite and join channel.
        log(
            `${testName} inviting others to channel`,
            others.map((d) => ({ num: d.num, userStreamId: d.client.userStreamId })),
        )
        const allJoined = Promise.all(
            others.map(async (d) => {
                log(`${testName} awaiting userJoinedStream channel for`, d.client.userId, channelId)
                await d.waitFor('userJoinedStream')
                log(`${testName} recevied userJoinedStream channel for`, d.client.userId, channelId)
            }),
        )
        await Promise.all(
            others.map(async (d) => {
                log(`${testName} inviting user to channel`, d.client.userId, channelId)
                await alice.client.inviteUser(channelId, d.client.userId)
                log(`${testName} invited user to channel`, d.client.userId, channelId)
            }),
        )
        log(`${testName} and wait for all to join...`)
        await allJoined
        log(`${testName} all joined`)

        for (const [conv_idx, conv] of conversation.entries()) {
            const expected = new Set(conv.filter((s) => s !== ''))
            log(`${testName} conversation stepping start ${conv_idx}`, expected, conv)
            await Promise.all(
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
            )
            log(`${testName} conversation stepping end ${conv_idx}`, conv)
        }
        log(`${testName} conversation complete, now stopping drivers`)

        await Promise.all(drivers.map((d) => d.stop()))
        log(`${testName} drivers stopped`)
        return 'success'
    } catch (e) {
        log(`${testName} converse ERROR`, e)
        return 'error'
    }
}
