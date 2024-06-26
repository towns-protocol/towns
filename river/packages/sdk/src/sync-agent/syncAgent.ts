import { providers } from 'ethers'
import { RiverConnection } from './river-connection/riverConnection'
import { RiverConfig } from '../riverConfig'
import { RiverRegistry, SpaceDapp } from '@river-build/web3'
import { RetryParams } from '../makeStreamRpcClient'
import { Store } from '../store/store'
import { SignerContext } from '../signerContext'
import { userIdFromAddress } from '../id'
import { StreamNodeUrlsModel } from './river-connection/models/streamNodeUrls'
import { AuthStatus, User, UserModel } from './user/user'
import { makeBaseProvider, makeRiverProvider } from './utils/providers'
import { UserMembershipsModel } from './user/models/userMemberships'
import { RiverDbManager } from '../riverDbManager'
import { Entitlements } from './entitlements/entitlements'
import { PersistedObservable } from '../observable/persistedObservable'
import { Observable } from '../observable/observable'
import { UserInboxModel } from './user/models/userInbox'
import { SyncAgentStore } from './syncAgentStore'
import { UserDeviceKeysModel } from './user/models/userDeviceKeys'
import { UserSettingsModel } from './user/models/userSettings'

export interface SyncAgentConfig {
    context: SignerContext
    riverConfig: RiverConfig
    retryParams?: RetryParams
    highPriorityStreamIds?: string[]
    deviceId?: string
}

export class SyncAgent {
    userId: string
    config: SyncAgentConfig
    baseProvider: providers.StaticJsonRpcProvider
    riverProvider: providers.StaticJsonRpcProvider
    spaceDapp: SpaceDapp
    riverRegistryDapp: RiverRegistry
    riverConnection: RiverConnection
    store: Store
    user: User
    //spaces: Spaces

    // flattened observables - just pointers to the observable objects in the models
    observables: {
        riverStreamNodeUrls: PersistedObservable<StreamNodeUrlsModel>
        user: PersistedObservable<UserModel>
        userAuthStatus: Observable<AuthStatus>
        userMemberships: PersistedObservable<UserMembershipsModel>
        userInbox: PersistedObservable<UserInboxModel>
        userDeviceKeys: PersistedObservable<UserDeviceKeysModel>
        userSettings: PersistedObservable<UserSettingsModel>
    }

    constructor(config: SyncAgentConfig) {
        this.userId = userIdFromAddress(config.context.creatorAddress)
        this.config = config
        const base = config.riverConfig.base
        const river = config.riverConfig.river
        this.baseProvider = makeBaseProvider(config.riverConfig)
        this.riverProvider = makeRiverProvider(config.riverConfig)
        this.store = new SyncAgentStore(this.userId)
        this.store.newTransactionGroup('SyncAgent::initalization')
        this.spaceDapp = new SpaceDapp(base.chainConfig, this.baseProvider)
        this.riverRegistryDapp = new RiverRegistry(river.chainConfig, this.riverProvider)
        this.riverConnection = new RiverConnection(this.store, this.riverRegistryDapp, {
            signerContext: config.context,
            cryptoStore: RiverDbManager.getCryptoDb(this.userId, this.cryptoDbName()),
            entitlementsDelegate: new Entitlements(this.config.riverConfig, this.spaceDapp),
            persistenceStoreName: this.persistenceDbName(),
            logNamespaceFilter: undefined,
            highPriorityStreamIds: this.config.highPriorityStreamIds,
            rpcRetryParams: config.retryParams,
        })
        this.user = new User(this.userId, this.store, this.riverConnection, this.spaceDapp)

        // flatten out the observables
        this.observables = {
            riverStreamNodeUrls: this.riverConnection.streamNodeUrls,
            user: this.user,
            userAuthStatus: this.user.authStatus,
            userMemberships: this.user.streams.memberships,
            userInbox: this.user.streams.inbox,
            userDeviceKeys: this.user.streams.deviceKeys,
            userSettings: this.user.streams.settings,
        }
    }

    async start() {
        // commit the initialization transaction, which triggers onLoaded on the models
        await this.store.commitTransaction()
    }

    async stop() {
        await this.riverConnection.stop()
    }

    syncAgentDbName(): string {
        return this.dbName('syncAgent')
    }

    persistenceDbName(): string {
        return this.dbName('persistence')
    }

    cryptoDbName(): string {
        return this.dbName('database')
    }

    dbName(db: string): string {
        const envSuffix =
            this.config.riverConfig.environmentId === 'gamma'
                ? ''
                : `-${this.config.riverConfig.environmentId}`
        const postfix = this.config.deviceId !== undefined ? `-${this.config.deviceId}` : ''
        const dbName = `${db}-${this.userId}${envSuffix}${postfix}`
        return dbName
    }
}
