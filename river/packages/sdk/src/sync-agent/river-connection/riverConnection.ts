import { RiverRegistry } from '@river-build/web3'
import { RetryParams, StreamRpcClient, makeStreamRpcClient } from '../../makeStreamRpcClient'
import { Observable } from '../../observable/observable'
import { RiverNodeUrls } from './models/riverNodeUrls'
import { Store } from '../../store/store'
import { dlogger } from '@river-build/dlog'

const logger = dlogger('csb:riverConnection')

export class RiverConnection {
    rpcClient: Observable<StreamRpcClient | undefined>
    nodeUrls: RiverNodeUrls
    queue: {
        resolve: (value: any) => void
        reject: (reason?: any) => void
        fn: (rpcClient: StreamRpcClient) => Promise<any>
    }[] = []

    constructor(store: Store, riverRegistryDapp: RiverRegistry, retryParams?: RetryParams) {
        this.rpcClient = new Observable<StreamRpcClient | undefined>(undefined)
        this.nodeUrls = new RiverNodeUrls(store, riverRegistryDapp)
        this.nodeUrls.subscribe(
            (value) => {
                if (value.data.urls) {
                    logger.log('RiverConnection: setting rpcClient', value.data.urls)
                    this.rpcClient.set(
                        makeStreamRpcClient(value.data.urls, retryParams, () =>
                            riverRegistryDapp.getOperationalNodeUrls(),
                        ),
                    )
                    // New rpcClient is available, resolve all queued requests
                    this.flushQueue()
                } else {
                    this.rpcClient.set(undefined)
                }
            },
            { fireImediately: true },
        )
    }

    call<T>(fn: (rpcClient: StreamRpcClient) => Promise<T>) {
        const rpcClient = this.rpcClient.value
        if (rpcClient) {
            return fn(rpcClient)
        } else {
            // Enqueue the request if rpcClient is not available
            return new Promise<T>((resolve, reject) => {
                this.queue.push({ resolve, reject, fn })
            })
        }
    }

    private flushQueue() {
        if (this.rpcClient.value && this.queue.length) {
            logger.log('RiverConnection: flushing rpc queue', this.queue.length)
            while (this.queue.length > 0) {
                const { resolve, reject, fn } = this.queue.shift()!
                fn(this.rpcClient.value).then(resolve).catch(reject)
            }
        }
    }
}
