import { Worker } from 'bullmq'
import { isDefined, townsEnv, RiverTimelineEvent, spaceIdFromChannelId } from '@towns-protocol/sdk'
import { getLogger } from './utils/logger'
import { makeStressClient, StressClient } from './utils/stressClient'
import {
    RunOpts,
    StressTask,
    StressResult,
    StressTaskName,
    StressWorker,
    StressJob,
    walletPathForIndex,
    queueNameForIndex,
    JoinTask,
    SendMessagesTask,
    ExpectMessagesTask,
} from './stressTypes'
import { Wallet } from 'ethers'
import { check } from '@towns-protocol/utils'

export class StressRunner {
    readonly index: number
    readonly runOpts: RunOpts
    readonly workerName: string
    readonly worker: StressWorker
    readonly logger: ReturnType<typeof getLogger>
    client: StressClient | undefined

    constructor(_runOpts: RunOpts) {
        this.index = _runOpts.processIndex
        this.runOpts = _runOpts
        this.workerName = queueNameForIndex(_runOpts.sessionId, this.index)
        this.worker = new Worker<StressTask, StressResult, StressTaskName>(
            this.workerName,
            this.process.bind(this),
            {
                autorun: false,
                connection: { url: _runOpts.redisUrl },
                concurrency: 1,
            },
        )
        this.logger = getLogger(`stress:worker:${this.workerName}`)
    }

    async run() {
        this.logger.info('Worker started')
        await this.worker.run()
        this.logger.info('Worker stopped')
    }

    async process(job: StressJob): Promise<StressResult> {
        this.logger.info({ task: job.data, jobId: job.id }, 'Processing job')
        try {
            let result: StressResult
            switch (job.name) {
                case 'create':
                    result = await this.create(job)
                    break
                case 'create_town':
                    result = await this.createTown(job)
                    break
                case 'join':
                    result = await this.join(job)
                    break
                case 'send_messages':
                    result = await this.sendMessages(job)
                    break
                case 'expect_messages':
                    result = await this.expectMessages(job)
                    break
                case 'shutdown':
                    result = await this.shutdown(job)
                    break
                default:
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    throw new Error(`Unknown task: ${job.name}`)
            }
            this.logger.info({ jobName: job.name, jobId: job.id, result }, 'Job completed')
            return result
        } catch (e) {
            this.logger.child({ jobName: job.name, jobId: job.id }).error(e, 'Error processing job')
            throw e
        }
    }

    async create(_: StressJob): Promise<StressResult> {
        const config = townsEnv().makeTownsConfig(this.runOpts.riverEnv)
        const wallet = Wallet.fromMnemonic(this.runOpts.mnemonic, walletPathForIndex(this.index))
        this.client = await makeStressClient(
            config,
            this.index,
            wallet,
            undefined, // No persisted store for simplicity
        )
        await this.client.fundWallet()
        return { name: 'create' }
    }

    async createTown(_: StressJob): Promise<StressResult> {
        check(isDefined(this.client))

        const { spaceId, defaultChannelId } = await this.client.createSpace('Stress Test Town')
        return { name: 'create_town', spaceId, defaultChannelId }
    }

    async join(job: StressJob): Promise<StressResult> {
        check(isDefined(this.client))
        check(job.data.name === 'join')
        const task: JoinTask = job.data

        if (task.spaceId) {
            await this.client.joinSpace(task.spaceId)
        }
        // TODO: join channels
        // if (task.channelIds) {
        //     await Promise.all(task.channelIds.map((channelId) => this.client.(channelId)))
        // }
        return { name: 'join' }
    }

    async sendMessages(job: StressJob): Promise<StressResult> {
        check(isDefined(this.client))
        check(job.data.name === 'send_messages')
        const task: SendMessagesTask = job.data

        const spaceId = spaceIdFromChannelId(task.channelId)
        const space = this.client.agent.spaces.getSpace(spaceId)
        const channel = space.getChannel(task.channelId)

        for (let i = 0; i < task.count; i++) {
            await channel.sendMessage(`${task.prefix}===${this.workerName}===${i}`)

            // Report progress every 10th message
            if (i > 0 && i % 10 === 0) {
                await job.updateProgress({ sent: i, total: task.count })
            }
        }
        return { name: 'send_messages' }
    }

    async expectMessages(job: StressJob): Promise<StressResult> {
        check(isDefined(this.client))
        check(job.data.name === 'expect_messages')
        const task: ExpectMessagesTask = job.data

        const spaceId = spaceIdFromChannelId(task.channelId)
        const space = this.client.agent.spaces.getSpace(spaceId)
        const channel = space.getChannel(task.channelId)

        let lastCount = 0
        for (let i = 0; i < 10; i++) {
            lastCount = 0
            channel.timeline.events.value.forEach((e) => {
                if (
                    e.content?.kind === RiverTimelineEvent.ChannelMessage &&
                    e.content.body.startsWith(task.prefix)
                ) {
                    lastCount++
                }
            })

            if (lastCount === task.count) {
                return { name: 'expect_messages' }
            }

            await job.updateProgress({ iterations: i, count: lastCount })

            await new Promise((resolve) => setTimeout(resolve, 1000))
        }
        throw new Error(
            `Timeout waiting messages, expected ${task.count}, got ${lastCount}, prefix: ${task.prefix}`,
        )
    }

    async shutdown(_: StressJob): Promise<StressResult> {
        if (this.client !== undefined) {
            await this.client.stop()
        }

        // fire off close, but don't wait for it
        void this.worker.close()

        return { name: 'shutdown' }
    }
}

export async function runWorker(opts: RunOpts) {
    await new StressRunner(opts).run()
}
