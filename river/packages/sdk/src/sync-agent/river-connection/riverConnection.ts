import { RiverRegistry } from '@river-build/web3'
import { RetryParams, makeStreamRpcClient } from '../../makeStreamRpcClient'
import { Observable } from '../../observable/observable'
import { RiverNodeUrls, RiverNodeUrlsModel } from './models/riverNodeUrls'
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

export interface RiverView {
    onClientStarted: (client: Client) => OnStoppedFn
}

export class RiverConnection {
    client = new Observable<Client | undefined>(undefined)
    nodeUrls: RiverNodeUrls
    private riverRegistryDapp: RiverRegistry
    private clientParams: ClientParams
    private clientQueue = new PromiseQueue<Client>()
    private views: RiverView[] = []
    private onStoppedFns: OnStoppedFn[] = []
    private stopped = false

    constructor(store: Store, riverRegistryDapp: RiverRegistry, clientParams: ClientParams) {
        this.riverRegistryDapp = riverRegistryDapp
        this.clientParams = clientParams
        this.nodeUrls = new RiverNodeUrls(store, riverRegistryDapp)
        this.nodeUrls.subscribe(this.onNodeUrlsChanged, { fireImediately: true })
    }

    async stop() {
        this.stopped = true
        this.nodeUrls.unsubscribe(this.onNodeUrlsChanged)
        for (const fn of this.onStoppedFns) {
            fn()
        }
        this.onStoppedFns = []
    }

    call<T>(fn: (client: Client) => Promise<T>) {
        const client = this.client.value
        if (client) {
            return fn(client)
        } else {
            // Enqueue the request if client is not available
            return this.clientQueue.enqueue(fn)
        }
    }

    registerView(view: RiverView) {
        if (this.client.value) {
            const onStopFn = view.onClientStarted(this.client.value)
            this.onStoppedFns.push(onStopFn)
        }
        this.views.push(view)
    }

    private onNodeUrlsChanged = (value: PersistedModel<RiverNodeUrlsModel>) => {
        if (this.client.value !== undefined) {
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
        this.client.set(client)
        this.clientQueue.flush(client) // New rpcClient is available, resolve all queued requests
        // initialize views
        this.views.forEach((view) => {
            const onStopFn = view.onClientStarted(client)
            this.onStoppedFns.push(onStopFn)
        })
    }
}
