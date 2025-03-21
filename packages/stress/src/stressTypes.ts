import { Job, Queue, Worker } from 'bullmq'

export interface RunOpts {
    processIndex: number
    processCount: number
    sessionId: string
    stressMode: string
    riverEnv: string
    redisUrl: string
    mnemonic: string
}

export interface CreateTask {
    name: 'create'
}

export interface CreateTownTask {
    name: 'create_town'
}

export interface JoinTask {
    name: 'join'
    spaceId: string
    channelIds: string[]
}

export interface SendMessagesTask {
    name: 'send_messages'
    channelId: string
    count: number
    prefix: string
}

export interface ExpectMessagesTask {
    name: 'expect_messages'
    channelId: string
    count: number
    prefix: string
}

export interface ShutdownTask {
    name: 'shutdown'
}

export type StressTask =
    | CreateTask
    | CreateTownTask
    | JoinTask
    | SendMessagesTask
    | ExpectMessagesTask
    | ShutdownTask

export interface CreateResult {
    name: 'create'
}

export interface CreateTownResult {
    name: 'create_town'
    spaceId: string
    defaultChannelId: string
}

export interface JoinResult {
    name: 'join'
}

export interface SendMessagesResult {
    name: 'send_messages'
}

export interface ExpectMessagesResult {
    name: 'expect_messages'
}

export interface ShutdownResult {
    name: 'shutdown'
}

export type StressResult =
    | CreateResult
    | CreateTownResult
    | JoinResult
    | SendMessagesResult
    | ExpectMessagesResult
    | ShutdownResult

export type StressTaskName = StressTask['name']
export type StressJob = Job<StressTask, StressResult, StressTaskName>
export type StressQueue = Queue<StressTask, StressResult, StressTaskName>
export type StressWorker = Worker<StressTask, StressResult, StressTaskName>

export function queueNameForIndex(sessionId: string, index: number) {
    return sessionId ? `sw-${sessionId}-${index}` : `sw-${index}`
}

export function walletPathForIndex(index: number) {
    return `m/44'/60'/0'/1337/${index}`
}
