import { ecsign, stripHexPrefix, toRpcSig } from '@ethereumjs/util'
import { Client, makeZionRpcClient } from '@zion/client'
import {
    BaseEvent,
    FullEvent,
    genId,
    hashEvent,
    makeDelegateSig,
    Payload,
    SignerContext,
    ZionServiceInterface,
} from '@zion/core'
import { Wallet } from 'ethers'
import { ZionApp } from '../app'
import { config } from '../config'

import { Worker } from 'worker_threads'

import debug from 'debug'
const log = debug('zion:test:util')

export const makeEvent_test = (
    context: SignerContext,
    payload: Payload,
    prevEvents: string[],
): FullEvent => {
    const event: BaseEvent = {
        creatorAddress: context.creatorAddress,
        salt: genId(),
        prevEvents: prevEvents,
        payload: payload,
    }
    if (context.delegateSig !== undefined) {
        event.delegageSig = context.delegateSig
    }

    const [hash, hashBuffer] = hashEvent(event)
    const { v, r, s } = ecsign(
        hashBuffer,
        Buffer.from(stripHexPrefix(context.wallet.privateKey), 'hex'),
    )
    const signature = toRpcSig(v, r, s)

    return { hash, signature, base: event }
}

export type TestParams = [string, () => ZionServiceInterface][]

export const makeTestParams = (zionApp: () => ZionApp): TestParams => {
    const ret: TestParams = [
        ['direct', () => zionApp().zionServer],
        ['viaClient', () => makeZionRpcClient(zionApp().url)],
    ]
    if (config.testRemoteUrl !== undefined) {
        ret.push(['remote', () => makeZionRpcClient(config.testRemoteUrl)])
    }
    return ret
}

async function createWallet(): Promise<Wallet> {
    const result = await new Promise<{ wallet: string }>((resolve, reject) => {
        const worker = new Worker(
            `
                const {parentPort} = require("worker_threads");
                const ethers = require('ethers');
                const wallet = ethers.Wallet.createRandom()
                parentPort.postMessage(JSON.stringify({wallet: wallet.privateKey}))
                process.exit( 0 )
        `,
            { eval: true },
        )
        worker.on('message', (msg) => resolve(JSON.parse(msg)))
        worker.on('error', reject)
        worker.on('exit', (code) => {
            if (code !== 0)
                reject(new Error(`makeRandomUserContext worker stopped with ${code} exit code`))
        })
    })
    return new Wallet(result.wallet)
}

/**
 *
 * @returns a random user context
 * Done using a worker thread to avoid blocking the main thread
 */
export const makeRandomUserContext = async (): Promise<SignerContext> => {
    log('makeRandomUserContext')
    const wallets = await Promise.all([createWallet(), createWallet()])
    return {
        wallet: wallets[1],
        creatorAddress: wallets[0].address,
        delegateSig: await makeDelegateSig(wallets[0], wallets[1]),
    }
}

export const makeTestClient = async (url: string, context?: SignerContext): Promise<Client> => {
    if (context === undefined) {
        context = await makeRandomUserContext()
    }
    return new Client(context, makeZionRpcClient(url))
}

class DonePromise {
    promise: Promise<string>
    // @ts-ignore: Promise body is executed immediately, so vars are assigned before constructor returns
    resolve: (value: string) => void
    // @ts-ignore: Promise body is executed immediately, so vars are assigned before constructor returns
    reject: (reason: any) => void

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve
            this.reject = reject
        })
    }

    done(): void {
        this.resolve('done')
    }

    async wait(): Promise<string> {
        return this.promise
    }

    async expectToSucceed(): Promise<void> {
        await expect(this.promise).resolves.toBe('done')
    }

    async expectToFail(): Promise<void> {
        await expect(this.promise).rejects.toThrow()
    }

    run(fn: () => void): void {
        try {
            fn()
        } catch (err) {
            this.reject(err)
        }
    }

    async runAsync(fn: () => Promise<any>): Promise<void> {
        try {
            await fn()
        } catch (err) {
            this.reject(err)
        }
    }

    runAndDone(fn: () => void): void {
        try {
            fn()
            this.done()
        } catch (err) {
            this.reject(err)
        }
    }

    async runAndDoneAsync(fn: () => Promise<any>): Promise<void> {
        try {
            await fn()
            this.done()
        } catch (err) {
            this.reject(err)
        }
    }
}

export const makeDonePromise = (): DonePromise => {
    return new DonePromise()
}
