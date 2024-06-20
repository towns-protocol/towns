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
import { StreamsClient } from './streams/streamsClient'
import { UserMemberships } from './user/models/userMemberships'

export interface AgentConfig {
    context: SignerContext
    riverConfig: RiverConfig
    retryParams?: RetryParams
}

export class SyncAgent {
    userId: string
    config: AgentConfig
    baseProvider: providers.StaticJsonRpcProvider
    riverProvider: providers.StaticJsonRpcProvider
    spaceDapp: SpaceDapp
    riverRegistryDapp: RiverRegistry
    riverConnection: RiverConnection
    store: Store
    streamsClient: StreamsClient
    user: User
    //spaces: Spaces

    constructor(config: AgentConfig) {
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
        this.riverConnection = new RiverConnection(
            this.store,
            this.riverRegistryDapp,
            config.retryParams,
        )
        this.streamsClient = new StreamsClient(this.riverConnection)
        this.user = new User(this.userId, this.store, this.streamsClient)
    }

    async start() {
        // commit the initialization transaction, which triggers onLoaded on the models
        await this.store.commitTransaction()
    }
}
