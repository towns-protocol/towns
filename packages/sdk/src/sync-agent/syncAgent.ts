import { RiverConnection, RiverConnectionModel } from './river-connection/riverConnection'
import { TownsConfig } from '../townsEnv'
import { RiverRegistry, SpaceDapp } from '@towns-protocol/web3'
import { RetryParams } from '../rpcInterceptors'
import { Store } from '../store/store'
import { SignerContext } from '../signerContext'
import { userIdFromAddress } from '../id'
import { RiverChainModel } from './river-connection/models/riverChain'
import { User, UserModel } from './user/user'
import { makeBaseProvider, makeRiverProvider } from './utils/providers'
import { UserMembershipsModel } from './user/models/userMemberships'
import { RiverDbManager } from '../riverDbManager'
import { Entitlements } from './entitlements/entitlements'
import { PersistedObservable } from '../observable/persistedObservable'
import { Observable } from '../observable/observable'
import { UserInboxModel } from './user/models/userInbox'
import { DB_MODELS, DB_VERSION } from './db'
import { UserMetadataModel } from './user/models/userMetadata'
import { UserSettingsModel } from './user/models/userSettings'
import { Spaces, SpacesModel } from './spaces/spaces'
import { AuthStatus } from './river-connection/models/authStatus'
import { ethers } from 'ethers'
import type { EncryptionDeviceInitOpts } from '@towns-protocol/encryption'
import { Gdms, type GdmsModel } from './gdms/gdms'
import { Dms, DmsModel } from './dms/dms'
import { UnpackEnvelopeOpts } from '../sign'
import { dlog, DLogger, shortenHexString } from '@towns-protocol/utils'

export interface SyncAgentConfig {
    context: SignerContext
    townsConfig: TownsConfig
    retryParams?: RetryParams
    highPriorityStreamIds?: string[]
    deviceId?: string
    disablePersistenceStore?: boolean
    riverProvider?: ethers.providers.Provider
    baseProvider?: ethers.providers.Provider
    encryptionDevice?: EncryptionDeviceInitOpts
    onTokenExpired?: () => void
    unpackEnvelopeOpts?: UnpackEnvelopeOpts
    logId?: string
    useSharedSyncer?: boolean
}

export class SyncAgent {
    log: DLogger
    userId: string
    config: SyncAgentConfig
    riverConnection: RiverConnection
    store: Store
    user: User
    spaces: Spaces
    gdms: Gdms
    dms: Dms
    private stopped = false

    // flattened observables - just pointers to the observable objects in the models
    observables: {
        riverAuthStatus: Observable<AuthStatus>
        riverConnection: PersistedObservable<RiverConnectionModel>
        riverChain: PersistedObservable<RiverChainModel>
        spaces: PersistedObservable<SpacesModel>
        user: PersistedObservable<UserModel>
        userMemberships: PersistedObservable<UserMembershipsModel>
        userInbox: PersistedObservable<UserInboxModel>
        userMetadata: PersistedObservable<UserMetadataModel>
        userSettings: PersistedObservable<UserSettingsModel>
        gdms: PersistedObservable<GdmsModel>
        dms: PersistedObservable<DmsModel>
    }

    constructor(config: SyncAgentConfig) {
        this.userId = userIdFromAddress(config.context.creatorAddress)
        const logId = config.logId ?? shortenHexString(this.userId)
        this.log = dlog('csb:syncAgent', { defaultEnabled: true }).extend(logId)
        this.config = config
        const base = config.townsConfig.base
        const river = config.townsConfig.river
        const baseProvider = config.baseProvider ?? makeBaseProvider(config.townsConfig)
        const riverProvider = config.riverProvider ?? makeRiverProvider(config.townsConfig)
        this.store = new Store(this.syncAgentDbName(), DB_VERSION, DB_MODELS)
        this.store.newTransactionGroup('SyncAgent::initialization')
        const spaceDapp = new SpaceDapp(base.chainConfig, baseProvider)
        const riverRegistryDapp = new RiverRegistry(river.chainConfig, riverProvider)
        this.riverConnection = new RiverConnection(this.store, spaceDapp, riverRegistryDapp, {
            signerContext: config.context,
            cryptoStore: RiverDbManager.getCryptoDb(this.userId, this.cryptoDbName()),
            entitlementsDelegate: new Entitlements(this.config.townsConfig, spaceDapp),
            opts: {
                persistenceStoreName:
                    config.disablePersistenceStore !== true ? this.persistenceDbName() : undefined,
                logNamespaceFilter: undefined,
                highPriorityStreamIds: this.config.highPriorityStreamIds,
                unpackEnvelopeOpts: config.unpackEnvelopeOpts,
                logId: config.logId,
                streamOpts: {
                    useSharedSyncer: config.useSharedSyncer ?? true,
                },
            },
            rpcRetryParams: config.retryParams,
            encryptionDevice: config.encryptionDevice,
            onTokenExpired: config.onTokenExpired,
        })

        this.user = new User(this.userId, this.store, this.riverConnection)
        this.spaces = new Spaces(this.store, this.riverConnection, this.user.memberships, spaceDapp)
        this.gdms = new Gdms(this.store, this.riverConnection, this.user.memberships)
        this.dms = new Dms(this.store, this.riverConnection, this.user.memberships)
        // flatten out the observables
        this.observables = {
            riverAuthStatus: this.riverConnection.authStatus,
            riverConnection: this.riverConnection,
            riverChain: this.riverConnection.riverChain,
            spaces: this.spaces,
            user: this.user,
            userMemberships: this.user.memberships,
            userInbox: this.user.inbox,
            userMetadata: this.user.deviceKeys,
            userSettings: this.user.settings,
            gdms: this.gdms,
            dms: this.dms,
        }
    }

    async start() {
        if (this.stopped) {
            throw new Error('SyncAgent is stopped, please instantiate a new sync agent')
        }
        // commit the initialization transaction, which triggers onLoaded on the models
        await this.store.commitTransaction()
        this.log('SyncAgent::start: starting river connection')
        // start this river connection, this will log us in if the user is already signed up
        // it will leave us in a connected state otherwise, see riverConnection.authStatus
        await this.riverConnection.start()
        this.log('SyncAgent::start: river connection started')
    }

    async stop() {
        this.stopped = true
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
            this.config.townsConfig.environmentId === 'gamma'
                ? ''
                : `-${this.config.townsConfig.environmentId}`
        const postfix = this.config.deviceId !== undefined ? `-${this.config.deviceId}` : ''
        const dbName = `${db}-${this.userId}${envSuffix}${postfix}`
        return dbName
    }
}
