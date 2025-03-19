import { Queue, QueueEvents } from 'bullmq'
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
import { makeRiverConfig } from '@river-build/sdk'
import { runShortChat } from './scenarioShortChat'
import { check } from '@river-build/dlog'

class StressDriver {
    readonly queueName: string
    readonly queue: StressQueue
    readonly queueEvents: QueueEvents
    readonly logger: ReturnType<typeof getLogger>
    jobs: StressJob[]

    constructor(readonly index: number, readonly opts: RunOpts) {
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
        this.jobs = []
    }

    async fund(rootWallet: Wallet) {
        const wallet = Wallet.fromMnemonic(this.opts.mnemonic, walletPathForIndex(this.index))
        // Transfer funds from root wallet to worker wallet
        this.logger.info(`Transferring funds from root wallet to worker wallet ${wallet.address}`)

        try {
            // Create a transaction to transfer a small amount of ETH
            const tx = await rootWallet.sendTransaction({
                to: wallet.address,
                value: ethers.utils.parseEther('0.01'), // Transfer 0.01 ETH
            })

            // Wait for the transaction to be mined
            await tx.wait()

            this.logger.info(`Successfully funded worker wallet ${wallet.address}`, {
                txHash: tx.hash,
            })
        } catch (error) {
            this.logger.error(`Failed to fund worker wallet ${wallet.address}`, { error })
            throw error
        }
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

    async waitForJobs() {
        await Promise.all(this.jobs.map((j) => j.waitUntilFinished(this.queueEvents)))
        this.jobs = []
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

    async sendMessages() {
        return this.addJob({ name: 'send_messages' } as SendMessagesTask)
    }

    async expectMessages() {
        return this.addJob({ name: 'expect_messages' } as ExpectMessagesTask)
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
            if (!skipFunding) {
                await driver.fund(this.rootWallet)
            }
            this.drivers.push(driver)
        }
    }

    first() {
        return this.drivers[0]
    }

    others() {
        return this.drivers.slice(1)
    }

    all() {
        return this.drivers
    }

    async createAll() {
        await Promise.all(this.drivers.map((d) => d.create()))
    }

    async shutdownAll() {
        await Promise.all(this.drivers.map((d) => d.shutdown()))
    }

    async waitForJobs() {
        await Promise.all(this.drivers.map((d) => d.waitForJobs()))
    }

    async close() {
        await Promise.all(this.drivers.map((d) => d.close()))
    }
}

export async function runSupervisor(opts: RunOpts): Promise<void> {
    const logger = getLogger('stress:supervisor')
    logger.info('Starting supervisor')

    const supervisor = new Supervisor(opts)
    try {
        await supervisor.initAndFund()
        await supervisor.createAll()

        await runScenario(opts, supervisor)

        await supervisor.shutdownAll()
        await supervisor.waitForJobs()
    } finally {
        logger.info('Closing supervisor')
        await supervisor.close()
    }
}

async function runScenario(opts: RunOpts, supervisor: Supervisor) {
    switch (opts.stressMode) {
        case 'short_chat':
            await runShortChat(opts, supervisor)
            break
        default:
            throw new Error(`Unknown stress mode: ${opts.stressMode}`)
    }
}
