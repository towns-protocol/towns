import { createWorkerPromise } from '../createWorkerPromise'
import type { GetDefaultSignatureWorkerReturn } from './getDefaultSignature.worker'

export async function getSignature(): Promise<GetDefaultSignatureWorkerReturn> {
    const worker = new Worker(new URL('./getDefaultSignature.worker.ts', import.meta.url), {
        type: 'module',
    })

    return await createWorkerPromise<undefined, GetDefaultSignatureWorkerReturn>(worker)
}
