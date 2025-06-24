import { RiverRegistry, SpaceDapp } from '@towns-protocol/web3'
import { makeStreamRpcClient } from '../../makeStreamRpcClient'
import { RiverChain } from './models/riverChain'
import { Identifiable, LoadPriority, Store } from '../../store/store'
import { check, dlogger, shortenHexString } from '@towns-protocol/dlog'
import { PromiseQueue } from '../utils/promiseQueue'
import { CryptoStore, type EncryptionDeviceInitOpts } from '@towns-protocol/encryption'
import { EntitlementsDelegate } from '../../decryptionExtensions'
import { Client, ClientOptions } from '../../client'
import { SignerContext } from '../../signerContext'
import { PersistedObservable, persistedObservable } from '../../observable/persistedObservable'
import { userIdFromAddress } from '../../id'
import { TransactionalClient } from './models/transactionalClient'
import { Observable } from '../../observable/observable'
import { AuthStatus } from './models/authStatus'
import { expiryInterceptor, RetryParams } from '../../rpcInterceptors'
import { Stream } from '../../stream'
import { isDefined } from '../../check'

export interface ClientParams {
    signerContext: SignerContext
    cryptoStore: CryptoStore
    entitlementsDelegate: EntitlementsDelegate
    opts?: ClientOptions
    encryptionDevice?: EncryptionDeviceInitOpts
    onTokenExpired?: () => void
    rpcRetryParams?: RetryParams
}

export type OnStoppedFn = () => void
export type onClientStartedFn = (client: Client) => OnStoppedFn

export interface RiverConnectionModel extends Identifiable {
    id: '0'
    userExists: boolean
}

class LoginContext {
    constructor(public cancelled: boolean = false) {}
}

@persistedObservable({ tableName: 'riverConnection' })
export class RiverConnection extends PersistedObservable<RiverConnectionModel> {
    client?: TransactionalClient
    riverChain: RiverChain
    authStatus = new Observable<AuthStatus>(AuthStatus.Initializing)
    loginError?: Error
    private logger: ReturnType<typeof dlogger>
    private clientQueue = new PromiseQueue<Client>()
    private views: onClientStartedFn[] = []
    private onStoppedFns: OnStoppedFn[] = []
    public newUserMetadata?: { spaceId: Uint8Array | string }
    private loginPromise?: { promise: Promise<void>; context: LoginContext }

    constructor(
        store: Store,
        public spaceDapp: SpaceDapp,
        public riverRegistryDapp: RiverRegistry,
        public clientParams: ClientParams,
    ) {
        super({ id: '0', userExists: false }, store, LoadPriority.high)
        const logId = this.clientParams.opts?.logId ?? shortenHexString(this.userId)
        this.logger = dlogger(`csb:rconn:${logId}`)
        this.riverChain = new RiverChain(store, riverRegistryDapp, this.userId, logId)
    }

    protected override onLoaded() {
        //
    }

    get userId(): string {
        return userIdFromAddress(this.clientParams.signerContext.creatorAddress)
    }
    async start() {
        check(this.value.status === 'loaded', 'riverConnection not loaded')
        const [urls, userStreamExists] = await Promise.all([
            this.riverChain.urls(),
            this.riverChain.userStreamExists(),
        ])
        if (!urls) {
            throw new Error('riverConnection::start urls is not set')
        }
        await this.createStreamsClient()
        if (userStreamExists) {
            await this.login()
        } else {
            this.authStatus.setValue(AuthStatus.Credentialed)
        }
    }

    async stop() {
        for (const fn of this.onStoppedFns) {
            fn()
        }
        this.onStoppedFns = []
        if (this.loginPromise) {
            this.loginPromise.context.cancelled = true
        }
        this.riverChain.stop()
        await this.client?.stop()
        this.client = undefined
        this.authStatus.setValue(AuthStatus.Disconnected)
    }

    call<T>(fn: (client: Client) => Promise<T>): Promise<T> {
        if (this.client) {
            return fn(this.client)
        } else {
            // Enqueue the request if client is not available
            return this.clientQueue.enqueue(fn)
        }
    }

    withStream(streamId: string): {
        call: <T>(fn: (client: Client, stream: Stream) => Promise<T>) => Promise<T>
    } {
        return {
            call: (fn) => {
                return this.call(async (client) => {
                    const stream = await client.waitForStream(streamId)
                    return fn(client, stream)
                })
            },
        }
    }

    callWithStream<T>(streamId: string, fn: (client: Client, stream: Stream) => Promise<T>) {
        return this.withStream(streamId).call(fn)
    }

    registerView(viewFn: onClientStartedFn) {
        if (this.client) {
            const onStopFn = viewFn(this.client)
            this.onStoppedFns.push(onStopFn)
        }
        this.views.push(viewFn)
    }

    private async createStreamsClient(): Promise<void> {
        const urls = await this.riverChain.urls()

        if (this.client !== undefined) {
            // this is wired up to be reactive to changes in the urls
            this.logger.log('RiverConnection: rpc urls changed, client already set', urls)
            return
        }
        if (!urls) {
            this.logger.error('RiverConnection: urls is not set')
            return
        }
        this.logger.info(`setting rpcClient with urls: "${urls}"`)
        const rpcClient = makeStreamRpcClient(
            urls,
            () => this.riverRegistryDapp.getOperationalNodeUrls(),
            {
                retryParams: this.clientParams.rpcRetryParams,
                interceptors: [
                    expiryInterceptor({
                        onTokenExpired: this.clientParams.onTokenExpired,
                    }),
                ],
            },
        )
        const client = new TransactionalClient(
            this.store,
            this.clientParams.signerContext,
            rpcClient,
            this.clientParams.cryptoStore,
            this.clientParams.entitlementsDelegate,
            this.clientParams.opts,
        )
        client.setMaxListeners(100)
        this.client = client
        // initialize views
        this.store.withTransaction('RiverConnection::onNewClient', () => {
            this.views.forEach((viewFn) => {
                const onStopFn = viewFn(client)
                this.onStoppedFns.push(onStopFn)
            })
        })
    }

    async login(newUserMetadata?: { spaceId: Uint8Array | string }) {
        this.newUserMetadata = newUserMetadata ?? this.newUserMetadata
        this.logger.log('login', { newUserMetadata })
        await this.loginWithRetries()
    }

    private async loginWithRetries() {
        check(isDefined(this.client), 'riverConnection::loginWithRetries client is not defined')
        this.logger.info('login', { authStatus: this.authStatus.value, promise: this.loginPromise })
        if (this.loginPromise) {
            this.loginPromise.context.cancelled = true
            await this.loginPromise.promise
        }
        if (this.authStatus.value === AuthStatus.ConnectedToRiver) {
            return
        }
        const loginContext = new LoginContext()
        this.authStatus.setValue(AuthStatus.EvaluatingCredentials)
        const login = async () => {
            let retryCount = 0
            const MAX_RETRY_COUNT = 20
            while (!loginContext.cancelled) {
                check(
                    isDefined(this.client),
                    'riverConnection::loginWithRetries client is not defined',
                )
                try {
                    this.logger.info('logging in', {
                        userExists: this.data.userExists,
                        newUserMetadata: this.newUserMetadata,
                    })
                    this.authStatus.setValue(AuthStatus.ConnectingToRiver)
                    const client = this.client
                    await client.initializeUser({
                        spaceId: this.newUserMetadata?.spaceId,
                        encryptionDeviceInit: this.clientParams.encryptionDevice,
                    })
                    this.logger.info('user initialized')
                    client.startSync()
                    this.setData({ userExists: true })
                    this.authStatus.setValue(AuthStatus.ConnectedToRiver)
                    // New rpcClient is available, resolve all queued requests
                    this.clientQueue.flush(client)
                    this.loginPromise = undefined

                    break
                } catch (err) {
                    retryCount++
                    this.loginError = err as Error
                    this.logger.error(
                        `encountered exception while initializing ${this.userId}`,
                        err,
                    )

                    for (const fn of this.onStoppedFns) {
                        fn()
                    }
                    this.onStoppedFns = []
                    await this.client.stop()
                    this.client = undefined
                    await this.createStreamsClient()

                    if (loginContext.cancelled) {
                        this.logger.info('login cancelled after error')
                        this.loginPromise = undefined
                        break
                    } else if (retryCount >= MAX_RETRY_COUNT) {
                        this.logger.info('login MAX_RETRY_COUNT reached')
                        this.authStatus.setValue(AuthStatus.Error)
                        this.loginPromise = undefined
                        throw err
                    } else {
                        const retryDelay = getRetryDelay(retryCount)
                        this.logger.info('retrying', { retryDelay, retryCount })
                        // sleep
                        await new Promise((resolve) => setTimeout(resolve, retryDelay))
                    }
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
