import { normailizeHashes, SignerContext, _impl_makeEvent_impl_ } from './sign'

//import { Worker } from 'worker_threads'

import debug from 'debug'
import { Envelope, StreamEvent, makeStreamRpcClient } from '@towns/proto'
import { PlainMessage } from '@bufbuild/protobuf'
import { Client } from './client'
import { userIdFromAddress } from './id'
import { bin_fromHexString, bin_toHexString, takeKeccakFingerprintInHex } from './types'
import { getPublicKey, utils } from 'ethereum-cryptography/secp256k1'
import { makeTownsDelegateSig, makeOldTownsDelegateSig, publicKeyToAddress } from './crypto'
import { ethers } from 'ethers'

const log = debug('csb:test:util')

export const TEST_URL = 'http://localhost:5157'

export const makeEvent_test = async (
    context: SignerContext,
    payload: PlainMessage<StreamEvent>['payload'],
    prevEventHashes?: Uint8Array[] | Uint8Array | Map<string, Uint8Array>,
): Promise<Envelope> => {
    const hashes = normailizeHashes(prevEventHashes)
    return _impl_makeEvent_impl_(context, payload, hashes)
}

/**
 *
 * @returns a random user context
 * Done using a worker thread to avoid blocking the main thread
 */
export const makeRandomUserContext = async (): Promise<SignerContext> => {
    log('makeRandomUserContext start')
    const userPrivateKey = utils.randomPrivateKey()
    const devicePrivateKey = utils.randomPrivateKey()
    const devicePrivateKeyStr = bin_toHexString(devicePrivateKey)

    const creatorAddress = publicKeyToAddress(getPublicKey(userPrivateKey, false))
    log('makeRandomUserContext', userIdFromAddress(creatorAddress))
    const ret: SignerContext = {
        signerPrivateKey: () => devicePrivateKeyStr,
        creatorAddress,
        delegateSig: await makeTownsDelegateSig(
            () => userPrivateKey,
            getPublicKey(devicePrivateKeyStr, false),
        ),
        deviceId: takeKeccakFingerprintInHex(creatorAddress, 16),
    }
    log('makeRandomUserContext end', bin_toHexString(creatorAddress))
    return ret
}

// TODO(HNT-1380): remove
export const makeRandomUserContextWithOldDelegate = async (): Promise<SignerContext> => {
    const userPrimaryWallet = ethers.Wallet.createRandom()
    const devicePrivateKey = utils.randomPrivateKey()
    const devicePrivateKeyStr = bin_toHexString(devicePrivateKey)

    const creatorAddress = publicKeyToAddress(bin_fromHexString(userPrimaryWallet.publicKey))
    log('makeRandomUserContext', userIdFromAddress(creatorAddress))
    return {
        signerPrivateKey: () => devicePrivateKeyStr,
        creatorAddress,
        delegateSig: await makeOldTownsDelegateSig(
            userPrimaryWallet,
            getPublicKey(devicePrivateKeyStr, false),
        ),
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

export const awaitTimeout = (milliseconds: number) => {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
