import { RiverRegistry, SpaceDapp } from '@river-build/web3'
import { MakeRpcClientType } from '../../makeStreamRpcClient'
import { RiverChain } from './models/riverChain'
import { Identifiable, LoadPriority, Store } from '../../store/store'
import { check, dlogger } from '@river-build/dlog'
import { PromiseQueue } from '../utils/promiseQueue'
import {
    CryptoStore,
    EntitlementsDelegate,
    type EncryptionDeviceInitOpts,
} from '@river-build/encryption'
import { Client } from '../../client'
import { SignerContext } from '../../signerContext'
import { PersistedObservable, persistedObservable } from '../../observable/persistedObservable'
import { userIdFromAddress } from '../../id'
import { TransactionalClient } from './models/transactionalClient'
import { Observable } from '../../observable/observable'
import { AuthStatus } from './models/authStatus'
import { RetryParams, expiryInterceptor } from '../../rpcInterceptors'
import { Stream } from '../../stream'
import { isDefined } from '../../check'
import { UnpackEnvelopeOpts } from '../../sign'

const logger = dlogger('csb:riverConnection')

export interface ClientParams {
    signerContext: SignerContext
    cryptoStore: CryptoStore
    entitlementsDelegate: EntitlementsDelegate
    persistenceStoreName?: string
    logNamespaceFilter?: string
    highPriorityStreamIds?: string[]
    rpcRetryParams?: RetryParams
    encryptionDevice?: EncryptionDeviceInitOpts
    onTokenExpired?: () => void
    unpackEnvelopeOpts?: UnpackEnvelopeOpts
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
    riverChain: RiverChain
    authStatus = new Observable<AuthStatus>(AuthStatus.Initializing)
    loginError?: Error
    private clientQueue = new PromiseQueue<Client>()
    private views: onClientStartedFn[] = []
    private onStoppedFns: OnStoppedFn[] = []
    public newUserMetadata?: { spaceId: Uint8Array | string }
    private loginPromise?: { promise: Promise<void>; context: LoginContext }

    constructor(
        store: Store,
        public spaceDapp: SpaceDapp,
        public riverRegistryDapp: RiverRegistry,
        private makeRpcClient: MakeRpcClientType,
        public clientParams: ClientParams,
    ) {
        super({ id: '0', userExists: false }, store, LoadPriority.high)
        this.riverChain = new RiverChain(store, riverRegistryDapp, this.userId)
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
        this.createStreamsClient(urls)
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

    private createStreamsClient(urls: string): void {
        if (this.client !== undefined) {
            // this is wired up to be reactive to changes in the urls
            logger.log('RiverConnection: rpc urls changed, client already set', urls)
            return
        }
        if (!urls) {
            logger.error('RiverConnection: urls is not set')
            return
        }
        logger.log(`setting rpcClient with urls: "${urls}"`)
        const rpcClient = this.makeRpcClient(
            urls,
            this.clientParams.rpcRetryParams,
            () => this.riverRegistryDapp.getOperationalNodeUrls(),
            [
                expiryInterceptor({
                    onTokenExpired: this.clientParams.onTokenExpired,
                }),
            ],
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
            this.clientParams.unpackEnvelopeOpts,
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
        if (!this.client) {
            logger.error('login called before client is set')
            return
        }
        this.newUserMetadata = newUserMetadata ?? this.newUserMetadata
        logger.log('login', { newUserMetadata })
        await this.loginWithRetries()
    }

    private async loginWithRetries() {
        check(isDefined(this.client), 'riverConnection::loginWithRetries client is not defined')
        logger.log('login', { authStatus: this.authStatus.value, promise: this.loginPromise })
        if (this.loginPromise) {
            this.loginPromise.context.cancelled = true
            await this.loginPromise.promise
        }
        if (this.authStatus.value === AuthStatus.ConnectedToRiver) {
            return
        }
        if (!this.client) {
            logger.info('riverConnection::login client is not defined, exiting loop')
            return
        }
        const loginContext = new LoginContext(this.client)
        this.authStatus.setValue(AuthStatus.EvaluatingCredentials)
        const login = async () => {
            let retryCount = 0
            const MAX_RETRY_COUNT = 20
            while (!loginContext.cancelled) {
                try {
                    logger.log('logging in', {
                        userExists: this.data.userExists,
                        newUserMetadata: this.newUserMetadata,
                    })
                    const { client } = loginContext
                    this.authStatus.setValue(AuthStatus.ConnectingToRiver)
                    await client.initializeUser({
                        spaceId: this.newUserMetadata?.spaceId,
                        encryptionDeviceInit: this.clientParams.encryptionDevice,
                    })
                    client.startSync()
                    this.setData({ userExists: true })
                    this.authStatus.setValue(AuthStatus.ConnectedToRiver)
                    // New rpcClient is available, resolve all queued requests
                    this.clientQueue.flush(client)

                    break
                } catch (err) {
                    retryCount++
                    this.loginError = err as Error
                    logger.log('encountered exception while initializing', err)
                    if (loginContext.cancelled) {
                        logger.log('login cancelled after error')
                        break
                    } else if (retryCount >= MAX_RETRY_COUNT) {
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
