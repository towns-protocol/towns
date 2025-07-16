import workerpool from 'workerpool'
import DecryptorWorkerURL from './workers/decryptor?worker&url'

/**
 * Worker pool for decryption operations
 * Uses 4 workers to handle decryption tasks in parallel
 */
export const decryptorWorkerPool = workerpool.pool(DecryptorWorkerURL, {
    maxWorkers: 4,
    workerOpts: {
        type: import.meta.env.PROD ? undefined : 'module',
    },
})