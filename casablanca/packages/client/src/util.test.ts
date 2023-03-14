import { ecsign, stripHexPrefix, toRpcSig } from '@ethereumjs/util'
import { makeDelegateSig, normailizeHashes, SignerContext } from './sign'
import { Wallet } from 'ethers'

import { Worker } from 'worker_threads'

import debug from 'debug'
import { Envelope, Payload, StreamEvent } from '@zion/proto'
import { hashPersonalMessage } from 'ethereumjs-util'
import { PartialMessage } from '@bufbuild/protobuf'
import { Client } from './client'
import { makeStreamRpcClient } from './streamRpcClient'
import { genIdBlob, userIdFromAddress } from './id'
import { bin_fromHexString } from './types'

const log = debug('csb:test:util')

export const TEST_URL = 'http://localhost:5157'

export const makeEvent_test = (
    context: SignerContext,
    payload: Payload | PartialMessage<Payload>,
    prevEventHashes: Uint8Array[],
): Envelope => {
    let hashes = normailizeHashes(prevEventHashes)
    const streamEvent = new StreamEvent({
        creatorAddress: context.creatorAddress,
        salt: genIdBlob(),
        prevEvents: hashes,
        payload: payload,
    })
    if (context.delegateSig !== undefined) {
        streamEvent.delegageSig = context.delegateSig
    }

    const event = streamEvent.toBinary()
    const hash = hashPersonalMessage(Buffer.from(event))
    const { v, r, s } = ecsign(hash, Buffer.from(stripHexPrefix(context.wallet.privateKey), 'hex'))

    const signature = bin_fromHexString(toRpcSig(v, r, s))
    log('makeEvent_test', { hash, signature }, context, payload)

    return new Envelope({ hash: Uint8Array.from(hash), signature, event })
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
    const wallets = await Promise.all([createWallet(), createWallet()])
    const creatorAddress = bin_fromHexString(wallets[0].address)
    log('makeRandomUserContext', userIdFromAddress(creatorAddress))
    return {
        wallet: wallets[1],
        creatorAddress: creatorAddress,
        delegateSig: await makeDelegateSig(wallets[0], wallets[1]),
    }
}

export const makeTestClient = async (url?: string, context?: SignerContext): Promise<Client> => {
    if (url === undefined) {
        url = TEST_URL
    }
    if (context === undefined) {
        context = await makeRandomUserContext()
    }
    return new Client(context, makeStreamRpcClient(url))
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
