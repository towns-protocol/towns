import { createWorkerPromise } from '../createWorkerPromise'
import type { CreateAccountWorkerMessage, CreateAccountWorkerReturn } from './createAccount.worker'

/**
 * Default salt for userops.js, all our accounts use this salt
 */
const SALT = 0

export async function getInitData(args: {
    factoryAddress: string
    signerAddress: string
    rpcUrl: string
}): Promise<CreateAccountWorkerReturn> {
    const { factoryAddress, signerAddress, rpcUrl } = args
    return createWorkerPromise<CreateAccountWorkerMessage, CreateAccountWorkerReturn>(
        new Worker(new URL('./createAccount.worker.ts', import.meta.url), {
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
