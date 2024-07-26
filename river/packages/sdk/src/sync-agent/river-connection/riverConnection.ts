import { RiverRegistry, SpaceDapp } from '@river-build/web3'
import { RetryParams, makeStreamRpcClient } from '../../makeStreamRpcClient'
import { StreamNodeUrls, StreamNodeUrlsModel } from './models/streamNodeUrls'
import { Identifiable, LoadPriority, Store } from '../../store/store'
import { dlogger } from '@river-build/dlog'
import { PromiseQueue } from '../utils/promiseQueue'
import { CryptoStore, EntitlementsDelegate } from '@river-build/encryption'
import { Client } from '../../client'
import { SignerContext } from '../../signerContext'
import {
    PersistedModel,
    PersistedObservable,
    persistedObservable,
} from '../../observable/persistedObservable'
import { userIdFromAddress } from '../../id'
import { TransactionalClient } from './models/transactionalClient'
import { Observable } from '../../observable/observable'
import { AuthStatus } from './models/authStatus'

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

export interface RiverConnectionModel extends Identifiable {
    id: '0'
    userExists: boolean
}

class LoginContext {
    constructor(public client: Client, public cancelled: boolean = false) {}
}

@persistedObservable({ tableName: 'riverConnection' })
export class RiverConnection extends PersistedObservable<RiverConnectionModel> {
    client?: TransactionalClient
    streamNodeUrls: StreamNodeUrls
    authStatus = new Observable<AuthStatus>(AuthStatus.Initializing)
    loginError?: Error
    private clientQueue = new PromiseQueue<Client>()
    private views: onClientStartedFn[] = []
    private onStoppedFns: OnStoppedFn[] = []
    private stopped = false
    public newUserMetadata?: { spaceId: Uint8Array | string }
    private loginPromise?: { promise: Promise<void>; context: LoginContext }

    constructor(
        store: Store,
        public spaceDapp: SpaceDapp,
        public riverRegistryDapp: RiverRegistry,
        private clientParams: ClientParams,
    ) {
        super({ id: '0', userExists: false }, store, LoadPriority.high)
        this.streamNodeUrls = new StreamNodeUrls(store, riverRegistryDapp)
    }

    override async onLoaded() {
        this.streamNodeUrls.subscribe(this.onNodeUrlsChanged, { fireImediately: true })
    }

    get userId(): string {
        return userIdFromAddress(this.clientParams.signerContext.creatorAddress)
    }

    async stop() {
        this.stopped = true
        this.streamNodeUrls.unsubscribe(this.onNodeUrlsChanged)
        for (const fn of this.onStoppedFns) {
            fn()
        }
        this.onStoppedFns = []
        await this.client?.stop()
        this.authStatus.setValue(AuthStatus.Disconnected)
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
        this.createClient(value.data.urls)
    }

    private createClient(urls?: string): void {
        if (this.client !== undefined) {
            logger.log('RiverConnection: rpc urls changed, client already set', urls)
            return
        }
        if (this.stopped) {
            return
        }
        if (!urls) {
            return
        }
        logger.log(`setting rpcClient with urls: "${urls}"`)
        const rpcClient = makeStreamRpcClient(urls, this.clientParams.rpcRetryParams, () =>
            this.riverRegistryDapp.getOperationalNodeUrls(),
        )
        const client = new TransactionalClient(
            this.store,
            this.clientParams.signerContext,
            rpcClient,
            this.clientParams.cryptoStore,
            this.clientParams.entitlementsDelegate,
            this.clientParams.persistenceStoreName,
            this.clientParams.logNamespaceFilter,
            this.clientParams.highPriorityStreamIds,
        )
        this.client = client
        // initialize views
        this.store.withTransaction('RiverConnection::onNewClient', () => {
            this.views.forEach((viewFn) => {
                const onStopFn = viewFn(client)
                this.onStoppedFns.push(onStopFn)
            })
        })
        // try to log in
        logger.log('attempting login after new client')
        this.login().catch((err) => {
            logger.log('error logging in', err)
        })
    }

    async login(newUserMetadata?: { spaceId: Uint8Array | string }) {
        if (!this.client) {
            return
        }
        this.newUserMetadata = this.newUserMetadata ?? newUserMetadata
        logger.log('login', { newUserMetadata })
        const loginContext = new LoginContext(this.client)
        await this.loginWithRetries(loginContext)
    }

    private async loginWithRetries(loginContext: LoginContext) {
        logger.log('login', { authStatus: this.authStatus.value, promise: this.loginPromise })
        if (this.loginPromise) {
            this.loginPromise.context.cancelled = true
            await this.loginPromise.promise
        }
        if (this.authStatus.value === AuthStatus.ConnectedToRiver) {
            return
        }
        this.authStatus.setValue(AuthStatus.EvaluatingCredentials)
        const login = async () => {
            let retryCount = 0
            const MAX_RETRY_COUNT = 20
            while (!loginContext.cancelled) {
                try {
                    logger.log('logging in')
                    const { client } = loginContext
                    const canInitialize =
                        this.data.userExists ||
                        this.newUserMetadata !== undefined ||
                        (await client.userExists(this.userId))
                    logger.log('canInitialize', canInitialize)
                    if (canInitialize) {
                        this.authStatus.setValue(AuthStatus.ConnectingToRiver)
                        await client.initializeUser(this.newUserMetadata)
                        client.startSync()
                        this.setData({ userExists: true })
                        this.authStatus.setValue(AuthStatus.ConnectedToRiver)
                        // New rpcClient is available, resolve all queued requests
                        this.clientQueue.flush(client)
                    } else {
                        this.authStatus.setValue(AuthStatus.Credentialed)
                    }
                    break
                } catch (err) {
                    retryCount++
                    this.loginError = err as Error
                    logger.log('encountered exception while initializing', err)
                    if (retryCount >= MAX_RETRY_COUNT) {
                        this.authStatus.setValue(AuthStatus.Error)
                        throw err
                    } else {
                        const retryDelay = getRetryDelay(retryCount)
                        logger.log('retrying', { retryDelay, retryCount })
                        // sleep
                        await new Promise((resolve) => setTimeout(resolve, retryDelay))
                    }
                } finally {
                    logger.log('exiting login loop')
                    this.loginPromise = undefined
                }
            }
        }
        this.loginPromise = { promise: login(), context: loginContext }
        return this.loginPromise.promise
    }
}

// exponentially back off, but never wait more than 20 seconds
function getRetryDelay(retryCount: number) {
    return Math.min(1000 * 2 ** retryCount, 20000)
}
