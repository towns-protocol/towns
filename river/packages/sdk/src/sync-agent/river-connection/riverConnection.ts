import { RiverRegistry } from '@river-build/web3'
import { RetryParams, StreamRpcClient, makeStreamRpcClient } from '../../makeStreamRpcClient'
import { Observable } from '../../observable/observable'
import { RiverNodeUrls } from './models/riverNodeUrls'
import { Store } from '../../store/store'
import { dlogger } from '@river-build/dlog'
import { PromiseQueue } from '../utils/promiseQueue'

const logger = dlogger('csb:riverConnection')

export class RiverConnection {
    rpcClient: Observable<StreamRpcClient | undefined>
    nodeUrls: RiverNodeUrls
    rpcClientQueue = new PromiseQueue<StreamRpcClient>()

    constructor(store: Store, riverRegistryDapp: RiverRegistry, retryParams?: RetryParams) {
        this.rpcClient = new Observable<StreamRpcClient | undefined>(undefined)
        this.nodeUrls = new RiverNodeUrls(store, riverRegistryDapp)
        this.nodeUrls.subscribe(
            (value) => {
                if (value.data.urls) {
                    logger.log('RiverConnection: setting rpcClient', value.data.urls)
                    const client = makeStreamRpcClient(value.data.urls, retryParams, () =>
                        riverRegistryDapp.getOperationalNodeUrls(),
                    )
                    this.rpcClient.set(client)
                    this.rpcClientQueue.flush(client) // New rpcClient is available, resolve all queued requests
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
            return this.rpcClientQueue.enqueue(fn)
        }
    }
}
