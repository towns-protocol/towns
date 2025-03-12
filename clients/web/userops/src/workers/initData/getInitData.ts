import { createWorkerPromise } from '../createWorkerPromise'
import type { CreateAccountWorkerMessage, CreateAccountWorkerReturn } from './createAccount.worker'

/**
 * All our accounts use this salt, which was the default with the removed userop.js lib
 */
const SALT = 0n

export async function getInitData(args: {
    factoryAddress: string
    signerAddress: string
    rpcUrl: string
}): Promise<CreateAccountWorkerReturn> {
    const { factoryAddress, signerAddress, rpcUrl } = args
    return createWorkerPromise<CreateAccountWorkerMessage, CreateAccountWorkerReturn>(
        new Worker(new URL('./createAccount.worker', import.meta.url), {
            type: 'module',
        }),
        {
            factoryAddress,
            signerAddress,
            rpcUrl,
            salt: SALT,
        },
    )
}
