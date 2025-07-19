import workerpool from 'workerpool'
import WorkerURL from './workers/unpacker?worker&url'

export const workerPool = workerpool.pool(WorkerURL, {
    maxWorkers: 2,
    workerOpts: {
        type: import.meta.env.PROD ? undefined : 'module',
    },
})
