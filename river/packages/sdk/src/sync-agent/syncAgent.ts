import { providers } from 'ethers'
import { RiverConnection } from './river-connection/riverConnection'
import { RiverConfig } from '../riverConfig'
import { RiverRegistry, SpaceDapp } from '@river-build/web3'
import { RetryParams } from '../makeStreamRpcClient'
import { Store } from '../store/store'
import { SignerContext } from '../signerContext'
import { userIdFromAddress } from '../id'
import { RiverNodeUrls } from './river-connection/models/riverNodeUrls'
import { User } from './user/user'
import { makeBaseProvider, makeRiverProvider } from './utils/providers'
import { UserMemberships } from './user/models/userMemberships'
import { RiverDbManager } from '../riverDbManager'
import { Entitlements } from './entitlements/entitlements'

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

    constructor(config: SyncAgentConfig) {
        this.userId = userIdFromAddress(config.context.creatorAddress)
        this.config = config
        const base = config.riverConfig.base
        const river = config.riverConfig.river
        this.baseProvider = makeBaseProvider(config.riverConfig)
        this.riverProvider = makeRiverProvider(config.riverConfig)
        this.store = new Store(`syncAgent-${this.userId}`, 1, [
            RiverNodeUrls,
            User,
            UserMemberships,
        ])
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
        this.user = new User(this.userId, this.store, this.riverConnection)
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
