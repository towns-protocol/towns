import { Client } from './client'
import { DLogger, check, dlog } from '@river-build/dlog'
import { makeTestClient, makeUniqueSpaceStreamId } from './util.test'
import { makeUniqueChannelStreamId } from './id'
import { MembershipOp, SnapshotCaseType } from '@river-build/proto'
import { DecryptedTimelineEvent } from './types'

class TestDriver {
    readonly client: Client
    readonly num: number
    private log: DLogger
    private stepNum?: number
    private testName: string

    expected?: Set<string>
    allExpectedReceived?: (value: void | PromiseLike<void>) => void
    badMessageReceived?: (reason?: any) => void

    constructor(client: Client, num: number, testName: string) {
        this.client = client
        this.num = num
        this.testName = testName
        this.log = dlog(`test:${this.testName}:client:${this.num}:step:${this.stepNum}`)
    }

    async start(): Promise<void> {
        this.log(`driver starting client`)

        await this.client.initializeUser()

        this.client.on('userInvitedToStream', (s) => void this.userInvitedToStream.bind(this)(s))
        this.client.on('userJoinedStream', (s) => void this.userJoinedStream.bind(this)(s))
        this.client.on('eventDecrypted', (e, f, g) => void this.eventDecrypted.bind(this)(e, f, g))

        this.client.startSync()
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

    eventDecrypted(
        streamId: string,
        contentKind: SnapshotCaseType,
        event: DecryptedTimelineEvent,
    ): void {
        const payload = event.decryptedContent
        let content = ''
        check(payload.kind === 'channelMessage')
        if (
            payload.content?.payload?.case !== 'post' ||
            payload.content?.payload?.value.content.case !== 'text'
        ) {
            throw new Error(`eventDecrypted is not a post`)
        }
        content = payload.content?.payload?.value.content.value.body
        this.log(
            `eventDecrypted channelId=${streamId} message=${content}`,
            this.expected ? [...this.expected] : undefined,
        )
        if (this.expected?.delete(content)) {
            this.log(`eventDecrypted expected message Received, text=${content}`)

            if (this.expected.size === 0) {
                this.expected = undefined
                if (this.allExpectedReceived === undefined) {
                    throw new Error('allExpectedReceived is undefined')
                }
                this.log(`eventDecrypted all expected messages Received, text=${content}`)
                this.allExpectedReceived()
            } else {
                this.log(`eventDecrypted still expecting messages`, this.expected)
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
    }

    async step(
        channelId: string,
        stepNum: number,
        expected: Set<string>,
        message: string,
    ): Promise<void> {
        this.stepNum = stepNum
        this.log = dlog(`test:${this.testName} client:${this.num}:step:${this.stepNum}`)

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
        if (expected.size > 0) {
            await ret
        }

        this.allExpectedReceived = undefined
        this.badMessageReceived = undefined
        this.log(`step end`, message)
        this.stepNum = undefined
        this.log = dlog(`test:client:${this.num}:step:${this.stepNum}`)
    }
}

const makeTestDriver = async (num: number, testName: string): Promise<TestDriver> => {
    const client = await makeTestClient()
    return new TestDriver(client, num, testName)
}

export const converse = async (conversation: string[][], testName: string): Promise<string> => {
    const log = dlog(`test:${testName}-converse`)

    try {
        const numDrivers = conversation[0].length
        const numConversationSteps = conversation.length

        log(`START, numDrivers=${numDrivers}, steps=${numConversationSteps}`)
        const drivers = await Promise.all(
            Array.from({ length: numDrivers })
                .fill('')
                .map(async (_, i) => await makeTestDriver(i, testName)),
        )

        log(`starting all drivers`)
        await Promise.all(
            drivers.map(async (d) => {
                log(`starting driver`, {
                    num: d.num,
                    userId: d.client.userId,
                })
                await d.start()
                log(`started driver`, { num: d.num })
            }),
        )
        log(`started all drivers`)

        const alice = drivers[0]
        const others = drivers.slice(1)

        const spaceId = makeUniqueSpaceStreamId()
        log(`creating space ${spaceId}`)
        await alice.client.createSpace(spaceId)
        await alice.client.waitForStream(spaceId)

        // Invite and join space.
        log(`inviting others to space`)
        const allJoinedSpace = Promise.all(
            others.map(async (d) => {
                log(`awaiting userJoinedStream for`, d.client.userId)
                const stream = await d.client.waitForStream(spaceId)
                await stream.waitForMembership(MembershipOp.SO_JOIN)
                log(`received userJoinedStream for`, d.client.userId)
            }),
        )
        await Promise.all(
            others.map(async (d) => {
                log(`${alice.client.userId} inviting other to space`, d.client.userId)
                await alice.client.inviteUser(spaceId, d.client.userId)
                log(`invited other to space`, d.client.userId)
            }),
        )
        log(`and wait for all to join space...`)
        await allJoinedSpace
        log(`all joined space`)
        log(
            `${testName} inviting others to space after`,
            others.map((d) => ({ num: d.num, userStreamId: d.client.userStreamId })),
        )

        log(`creating channel`)
        const channelId = makeUniqueChannelStreamId(spaceId)
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
                log(`awaiting userJoinedStream channel for`, d.client.userId, channelId)
                const stream = await d.client.waitForStream(channelId)
                await stream.waitForMembership(MembershipOp.SO_JOIN)
                log(`received userJoinedStream channel for`, d.client.userId, channelId)
            }),
        )
        await Promise.all(
            others.map(async (d) => {
                log(`inviting user to channel`, d.client.userId, channelId)
                await alice.client.inviteUser(channelId, d.client.userId)
                log(`invited user to channel`, d.client.userId, channelId)
            }),
        )
        log(`and wait for all to join...`)
        await allJoined
        log(`all joined`)

        for (const [conv_idx, conv] of conversation.entries()) {
            log(`conversation stepping start ${conv_idx}`, conv)
            await Promise.all(
                conv.map(async (msg, msg_idx) => {
                    log(`conversation step before send conv: ${conv_idx} msg: ${msg_idx}`, msg)
                    // expect to recieve everyone elses messages (don't worry about your own, they render locally)
                    const expected = new Set(
                        [...conv.slice(0, msg_idx), ...conv.slice(msg_idx + 1)].filter(
                            (s) => s !== '',
                        ),
                    )
                    log(`conversation step execute ${msg_idx}`, msg, [...expected])
                    await drivers[msg_idx].step(channelId, conv_idx, expected, msg)
                    log(
                        `${testName} conversation step after send conv: ${conv_idx} msg: ${msg_idx}`,
                        msg,
                    )
                }),
            )
            log(`conversation stepping end ${conv_idx}`, conv)
        }
        log(`conversation complete, now stopping drivers`)

        await Promise.all(drivers.map((d) => d.stop()))
        log(`drivers stopped`)
        return 'success'
    } catch (e) {
        log(`converse ERROR`, e)
        throw e
    }
}
