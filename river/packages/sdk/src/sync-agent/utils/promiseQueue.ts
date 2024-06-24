import { dlogger } from '@river-build/dlog'

const logger = dlogger('csb:promisequeue')

export class PromiseQueue<T> {
    private queue: {
        resolve: (value: any) => void
        reject: (reason?: any) => void
        fn: (object: T) => Promise<any>
    }[] = []

    enqueue<Q>(fn: (object: T) => Promise<Q>) {
        return new Promise<Q>((resolve, reject) => {
            this.queue.push({ resolve, reject, fn })
        })
    }

    flush(object: T) {
        if (this.queue.length) {
            logger.log('RiverConnection: flushing rpc queue', this.queue.length)
            while (this.queue.length > 0) {
                const { resolve, reject, fn } = this.queue.shift()!
                fn(object).then(resolve).catch(reject)
            }
        }
    }
}
