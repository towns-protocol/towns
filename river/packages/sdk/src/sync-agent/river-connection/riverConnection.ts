import { RiverRegistry } from '@river-build/web3'
import { RetryParams, makeStreamRpcClient } from '../../makeStreamRpcClient'
import { StreamNodeUrls, StreamNodeUrlsModel } from './models/streamNodeUrls'
import { Store } from '../../store/store'
import { dlogger } from '@river-build/dlog'
import { PromiseQueue } from '../utils/promiseQueue'
import { CryptoStore, EntitlementsDelegate } from '@river-build/encryption'
import { Client } from '../../client'
import { SignerContext } from '../../signerContext'
import { PersistedModel } from '../../observable/persistedObservable'

const logger = dlogger('csb:riverConnection')

export interface ClientParams {
    signerContext: SignerContext
    cryptoStore: CryptoStore
    entitlementsDelegate: EntitlementsDelegate
    persistenceStoreName?: string
    logNamespaceFilter?: string
    highPriorityStreamIds?: string[]
    rpcRetryParams?: RetryParams
}

export type OnStoppedFn = () => void
export type onClientStartedFn = (client: Client) => OnStoppedFn

export class RiverConnection {
    client?: Client
    streamNodeUrls: StreamNodeUrls
    private riverRegistryDapp: RiverRegistry
    private clientParams: ClientParams
    private clientQueue = new PromiseQueue<Client>()
    private views: onClientStartedFn[] = []
    private onStoppedFns: OnStoppedFn[] = []
    private stopped = false

    constructor(store: Store, riverRegistryDapp: RiverRegistry, clientParams: ClientParams) {
        this.riverRegistryDapp = riverRegistryDapp
        this.clientParams = clientParams
        this.streamNodeUrls = new StreamNodeUrls(store, riverRegistryDapp)
        this.streamNodeUrls.subscribe(this.onNodeUrlsChanged, { fireImediately: true })
    }

    async stop() {
        this.stopped = true
        this.streamNodeUrls.unsubscribe(this.onNodeUrlsChanged)
        for (const fn of this.onStoppedFns) {
            fn()
        }
        this.onStoppedFns = []
    }

    call<T>(fn: (client: Client) => Promise<T>) {
        if (this.client) {
            return fn(this.client)
        } else {
            // Enqueue the request if client is not available
            return this.clientQueue.enqueue(fn)
        }
    }

    registerView(viewFn: onClientStartedFn) {
        if (this.client) {
            const onStopFn = viewFn(this.client)
            this.onStoppedFns.push(onStopFn)
        }
        this.views.push(viewFn)
    }

    private onNodeUrlsChanged = (value: PersistedModel<StreamNodeUrlsModel>) => {
        if (this.client !== undefined) {
            logger.log('RiverConnection: rpc urls changed, client already set', value)
            return
        }
        if (this.stopped) {
            return
        }
        const urls = value.data.urls
        if (!urls) {
            return
        }
        logger.log(`RiverConnection: setting rpcClient with urls: "${urls}"`)
        const rpcClient = makeStreamRpcClient(urls, this.clientParams.rpcRetryParams, () =>
            this.riverRegistryDapp.getOperationalNodeUrls(),
        )
        const client = new Client(
            this.clientParams.signerContext,
            rpcClient,
            this.clientParams.cryptoStore,
            this.clientParams.entitlementsDelegate,
            this.clientParams.persistenceStoreName,
            this.clientParams.logNamespaceFilter,
            this.clientParams.highPriorityStreamIds,
        )
        this.client = client
        this.clientQueue.flush(client) // New rpcClient is available, resolve all queued requests
        // initialize views
        this.views.forEach((viewFn) => {
            const onStopFn = viewFn(client)
            this.onStoppedFns.push(onStopFn)
        })
    }
}
