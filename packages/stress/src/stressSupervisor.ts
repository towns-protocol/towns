import { JobProgress, Queue, QueueEvents } from 'bullmq'
import { getLogger } from './utils/logger'
import {
    RunOpts,
    StressTask,
    StressResult,
    StressTaskName,
    StressQueue,
    JoinTask,
    SendMessagesTask,
    ExpectMessagesTask,
    ShutdownTask,
    queueNameForIndex,
    StressJob,
    walletPathForIndex,
    CreateTask,
    CreateTownTask,
    CreateTownResult,
} from './stressTypes'
import { ethers, Wallet } from 'ethers'
import { makeRiverConfig } from '@towns-protocol/sdk'
import { runShortChat } from './scenarioShortChat'
import { check } from '@towns-protocol/dlog'

export class StressDriver {
    readonly queueName: string
    readonly queue: StressQueue
    readonly queueEvents: QueueEvents
    readonly logger: ReturnType<typeof getLogger>
    jobs: StressJob[] = []
    lastUpdateEpochMs: number = 0
    scheduledJobs: number = 0
    constructor(
        readonly index: number,
        readonly opts: RunOpts,
    ) {
        this.queueName = queueNameForIndex(opts.sessionId, index)
        this.queue = new Queue<StressTask, StressResult, StressTaskName>(this.queueName, {
            connection: {
                url: opts.redisUrl,
                enableOfflineQueue: false,
            },
            defaultJobOptions: {
                attempts: 1,
            },
        })
        this.queueEvents = new QueueEvents(this.queueName, { connection: { url: opts.redisUrl } })
        this.logger = getLogger(`stress:driver:${this.queueName}`)

        this.queueEvents.on('completed', this.onJobCompleted.bind(this))
        this.queueEvents.on('failed', this.onJobFailed.bind(this))
        this.queueEvents.on('progress', this.onJobProgress.bind(this))
        this.queueEvents.on('added', this.onJobAdded.bind(this))
    }

    onJobCompleted(args: { jobId: string; returnvalue: string; prev?: string }) {
        this.lastUpdateEpochMs = Date.now()
        this.scheduledJobs--
        this.logger.info(args, 'Job COMPLETED')
    }

    onJobFailed(args: { jobId: string; failedReason: string }) {
        this.lastUpdateEpochMs = Date.now()
        this.scheduledJobs--
        this.logger.error(args, 'Job FAILED')
    }

    onJobProgress(args: { jobId: string; data: JobProgress }) {
        this.lastUpdateEpochMs = Date.now()
        this.logger.info(args, 'Job PROGRESS')
    }

    onJobAdded(args: { jobId: string; name: string }) {
        this.lastUpdateEpochMs = Date.now()
        this.scheduledJobs++
    }

    async close() {
        await this.queue.close()
        await this.queueEvents.close()
    }

    async addJob(task: StressTask) {
        const job = await this.queue.add(task.name, task, {
            jobId: `${task.name}-${this.queueName}`,
        })
        this.logger.info({ jobId: job.id }, 'Added job')
        this.jobs.push(job)
        return job
    }

    waitForJobsPromises(): Promise<StressResult>[] {
        const results = this.jobs.map((j) => j.waitUntilFinished(this.queueEvents))
        this.jobs = []
        return results
    }

    async waitForJobs() {
        const promises = this.waitForJobsPromises()
        this.logger.info({ promises: promises.length }, 'Driver wait for jobs START')
        const results = await Promise.all(promises)
        this.logger.info({ results: results.length }, 'Driver wait for jobs FINISHED')
        return results
    }

    async create() {
        return this.addJob({ name: 'create' } as CreateTask)
    }

    async createTown(): Promise<CreateTownResult> {
        const job = await this.addJob({ name: 'create_town' } as CreateTownTask)
        const result = await job.waitUntilFinished(this.queueEvents)
        check(result.name === 'create_town')
        return result
    }

    async join(spaceId: string, channelIds: string[]) {
        return this.addJob({ name: 'join', spaceId, channelIds } as JoinTask)
    }

    async sendMessages(channelId: string, count: number, prefix: string) {
        return this.addJob({ name: 'send_messages', channelId, count, prefix } as SendMessagesTask)
    }

    async expectMessages(channelId: string, count: number, prefix: string) {
        return this.addJob({
            name: 'expect_messages',
            channelId,
            count,
            prefix,
        } as ExpectMessagesTask)
    }

    async shutdown() {
        return this.addJob({ name: 'shutdown' } as ShutdownTask)
    }
}

export class Supervisor {
    readonly logger: ReturnType<typeof getLogger>
    readonly drivers: StressDriver[]
    readonly rootWallet: Wallet

    constructor(readonly opts: RunOpts) {
        this.logger = getLogger('stress:supervisor')
        this.drivers = []
        const riverConfig = makeRiverConfig(this.opts.riverEnv)
        this.rootWallet = Wallet.fromMnemonic(opts.mnemonic).connect(
            new ethers.providers.JsonRpcProvider(riverConfig.base.rpcUrl),
        )
    }

    async initAndFund() {
        const skipFunding = process.env.STRESS_SKIP_FUNDING !== undefined
        // Process 0 is for supervisor
        for (let i = 1; i < this.opts.processCount; i++) {
            const driver = new StressDriver(i, this.opts)
            this.drivers.push(driver)
        }

        if (!skipFunding) {
            this.logger.info('Funding drivers')
            let nonce = await this.rootWallet.getTransactionCount('pending')
            const txs = await Promise.all(
                this.drivers.map((d) => {
                    const wallet = Wallet.fromMnemonic(
                        this.opts.mnemonic,
                        walletPathForIndex(d.index),
                    )
                    return this.rootWallet.sendTransaction({
                        to: wallet.address,
                        value: ethers.utils.parseEther('0.01'), // Transfer 0.01 ETH
                        nonce: nonce++,
                    })
                }),
            )
            this.logger.info('Transactions sent, waiting for them to be mined')
            await txs[txs.length - 1].wait()
            this.logger.info('Funded drivers')
        }
    }

    first() {
        return this.drivers[0]
    }

    others() {
        return this.drivers.slice(1)
    }

    awaitOthers<T>(fn: (d: StressDriver) => Promise<T>): Promise<T[]> {
        return Promise.all(this.others().map(fn))
    }

    all() {
        return this.drivers
    }

    awaitAll<T>(fn: (d: StressDriver) => Promise<T>): Promise<T[]> {
        return Promise.all(this.drivers.map(fn))
    }

    numClients() {
        return this.drivers.length
    }

    async createAll() {
        await Promise.all(this.drivers.map((d) => d.create()))
    }

    async shutdownAll() {
        await Promise.all(this.drivers.map((d) => d.shutdown()))
    }

    async close() {
        await Promise.all(this.drivers.map((d) => d.close()))
    }

    async waitForJobs(): Promise<StressResult[]> {
        const promises = this.drivers.map((d) => d.waitForJobsPromises()).flat()
        this.logger.info({ promises: promises.length }, 'Supervisor wait for all jobs START')
        const result = await Promise.all(promises)
        this.logger.info({ results: result.length }, 'Supervisor wait for all jobs FINISHED')
        return result
    }

    async monitorProgress(abortSignal: AbortSignal) {
        // TODO: settings
        const intervalMs = 60000
        const timeoutMs = 120000

        return new Promise<void>((resolve, reject) => {
            const intervalId = setInterval(() => {
                const stallTimeEpochMs = Date.now() - timeoutMs

                for (const driver of this.drivers) {
                    if (driver.scheduledJobs > 0 && driver.lastUpdateEpochMs < stallTimeEpochMs) {
                        this.logger.error(
                            { driver: driver.queueName },
                            'Client is making no progress',
                        )
                        clearInterval(intervalId)
                        reject(new Error(`Client ${driver.queueName} is making no progress`))
                        return
                    }
                }
            }, intervalMs)

            // Set up abort handler
            abortSignal.addEventListener('abort', () => {
                clearInterval(intervalId)
                resolve()
            })
        })
    }

    async run() {
        try {
            await this.initAndFund()
            await this.createAll()

            const abort = new AbortController()
            await Promise.race([this.runScenario(), this.monitorProgress(abort.signal)])
            abort.abort()

            await this.shutdownAll()
            await this.waitForJobs()
        } finally {
            this.logger.info('Closing supervisor')
            await this.close()
        }
    }

    async runScenario() {
        switch (this.opts.stressMode) {
            case 'short_chat':
                await runShortChat(this.opts, this)
                break
            default:
                throw new Error(`Unknown stress mode: ${this.opts.stressMode}`)
        }
    }
}

export async function runSupervisor(opts: RunOpts): Promise<void> {
    return new Supervisor(opts).run()
}
