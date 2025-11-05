import { Client } from '../client'
import { DLogger, check, dlog } from '@towns-protocol/utils'
import { makeTestClient, makeUniqueSpaceStreamId } from './testUtils'
import { makeUniqueChannelStreamId } from '../id'
import { SnapshotCaseType } from '@towns-protocol/proto'
import { RiverTimelineEvent, TimelineEvent } from '../views/models/timelineTypes'

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
        this.log('driver starting client')

        await this.client.initializeUser()

        // eslint-disable-next-line @typescript-eslint/no-meaningless-void-operator
        this.client.on('eventDecrypted', (e, f, g) => void this.eventDecrypted.bind(this)(e, f, g))

        this.client.startSync()
        this.log('driver started client')
    }

    async stop(): Promise<void> {
        this.log('driver stopping client')
        await this.client.stop()
        this.log('driver stopped client')
    }

    eventDecrypted(streamId: string, contentKind: SnapshotCaseType, event: TimelineEvent): void {
        const payload = event.content
        let content = ''
        check(payload?.kind === RiverTimelineEvent.ChannelMessage)
        content = payload.body
        this.log(
            'eventDecrypted channelId=',
            streamId,
            'message=',
            content,
            this.expected ? [...this.expected] : undefined,
        )
        if (this.expected?.delete(content)) {
            this.log('eventDecrypted expected message Received, text=', content)

            if (this.expected.size === 0) {
                this.expected = undefined
                if (this.allExpectedReceived === undefined) {
                    throw new Error('allExpectedReceived is undefined')
                }
                this.log('eventDecrypted all expected messages Received, text=', content)
                this.allExpectedReceived()
            } else {
                this.log('eventDecrypted still expecting messages', this.expected)
            }
        } else {
            if (this.badMessageReceived === undefined) {
                throw new Error('badMessageReceived is undefined')
            }
            this.log(
                'channelNewMessage badMessageReceived text=',
                content,
                'expected=',
                Array.from(this.expected?.values() ?? []).join(', '),
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

        this.log('step start', message)

        this.expected = new Set(expected)
        const ret = new Promise<void>((resolve, reject) => {
            this.allExpectedReceived = resolve
            this.badMessageReceived = reject
        })

        if (message !== '') {
            this.log('step sending channelId=', channelId, 'message=', message)
            await this.client.sendMessage(channelId, message)
        }
        if (expected.size > 0) {
            await ret
        }

        this.allExpectedReceived = undefined
        this.badMessageReceived = undefined
        this.log('step end', message)
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

        log('START, numDrivers=', numDrivers, 'steps=', numConversationSteps)
        const drivers = await Promise.all(
            Array.from({ length: numDrivers })
                .fill('')
                .map(async (_, i) => await makeTestDriver(i, testName)),
        )

        log('starting all drivers')
        await Promise.all(
            drivers.map(async (d) => {
                log('starting driver', {
                    num: d.num,
                    userId: d.client.userId,
                })
                await d.start()
                log('started driver', { num: d.num })
            }),
        )
        log('started all drivers')

        const alice = drivers[0]
        const others = drivers.slice(1)

        const spaceId = makeUniqueSpaceStreamId()
        log('creating space', spaceId)
        await alice.client.createSpace(spaceId)
        await alice.client.waitForStream(spaceId)

        // Join others to space.
        log('joining others to space')
        await Promise.all(
            others.map(async (d) => {
                await d.client.joinStream(spaceId)
                log(
                    'joined space',
                    d.num,
                    'last know miniblock',
                    //d.client.stream(spaceId)?.view.prevMiniblock,
                )
            }),
        )
        log('all joined space')

        log('creating channel')
        const channelId = makeUniqueChannelStreamId(spaceId)
        const channelName = 'Alice channel'
        const channelTopic = 'Alice channel topic'

        await alice.client.createChannel(spaceId, channelName, channelTopic, channelId)
        await alice.client.waitForStream(channelId)

        // Join others to channel.
        log('joining others to channel')
        await Promise.all(
            others.map(async (d) => {
                await d.client.joinStream(channelId)
                log(
                    'joined channel',
                    d.num,
                    'last know miniblock',
                    //d.client.stream(channelId)?.view.prevMiniblock,
                )
            }),
        )
        log('all joined channel')

        for (const [conv_idx, conv] of conversation.entries()) {
            log(`conversation stepping start ${conv_idx}`, conv)
            await Promise.all(
                conv.map(async (msg, msg_idx) => {
                    log(`conversation step before send conv: ${conv_idx} msg: ${msg_idx}`, msg)
                    // expect to receive everyone elses messages (don't worry about your own, they render locally)
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
        log('conversation complete, now stopping drivers')

        await Promise.all(drivers.map((d) => d.stop()))
        log('drivers stopped')
        return 'success'
    } catch (e) {
        log('converse ERROR', e)
        throw e
    }
}
