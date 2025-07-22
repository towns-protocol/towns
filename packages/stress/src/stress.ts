import 'fake-indexeddb/auto' // used to mock indexdb in dexie, don't remove
import { config } from 'dotenv'
import { RunOpts } from './stressTypes'
import { runSupervisor } from './stressSupervisor'
import { runWorker } from './stressWorker'

function getEnvInt(env: NodeJS.Dict<string>, key: string): number {
    const value = env[key]
    if (value === undefined || value === '') {
        throw new Error(`${key} must be set`)
    }
    return parseInt(value)
}

function getEnvString(env: NodeJS.Dict<string>, key: string): string {
    const value = env[key]
    if (value === undefined || value === '') {
        throw new Error(`${key} must be set`)
    }
    return value
}

export async function run(): Promise<void> {
    config()
    return runWithEnv(process.env)
}

export async function runWithEnv(env: NodeJS.Dict<string>): Promise<void> {
    const opts: RunOpts = {
        processIndex: getEnvInt(env, 'PROCESS_INDEX'),
        processCount: getEnvInt(env, 'PROCESS_COUNT'),
        sessionId: env.SESSION_ID || '',
        stressMode: getEnvString(env, 'STRESS_MODE'),
        riverEnv: getEnvString(env, 'RIVER_ENV'),
        redisUrl: getEnvString(env, 'REDIS_URL'),
        mnemonic: getEnvString(env, 'MNEMONIC'),
    }
    if (opts.processIndex === 0) {
        await runSupervisor(opts)
    } else if (opts.processIndex > 0) {
        await runWorker(opts)
    } else {
        // special mode for testing in-process
        const promises = []
        const supervisorOpts = { ...opts }
        supervisorOpts.processIndex = 0
        promises.push(runSupervisor(supervisorOpts))
        for (let i = 1; i < opts.processCount; i++) {
            const workerOpts = { ...opts }
            workerOpts.processIndex = i
            promises.push(runWorker(workerOpts))
        }
        await Promise.all(promises)
    }
}
