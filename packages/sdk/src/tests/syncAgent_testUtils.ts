import { SyncAgentConfig } from '../sync-agent/syncAgent'
import { ClientParams } from '../sync-agent/river-connection/riverConnection'
import { makeRandomUserContext } from './testUtils'
import { makeRiverConfig } from '../riverConfig'
import { RiverDbManager } from '../riverDbManager'
import { userIdFromAddress } from '../id'
import { Entitlements } from '../sync-agent/entitlements/entitlements'
import { SpaceDapp } from '@towns-protocol/web3'

export async function makeRandomSyncAgentConfig(): Promise<SyncAgentConfig> {
    const context = await makeRandomUserContext()
    const riverConfig = makeRiverConfig()
    return {
        riverConfig,
        context,
    } satisfies SyncAgentConfig
}

export function makeClientParams(config: SyncAgentConfig, spaceDapp: SpaceDapp): ClientParams {
    const userId = userIdFromAddress(config.context.creatorAddress)
    return {
        signerContext: config.context,
        cryptoStore: RiverDbManager.getCryptoDb(
            userId,
            makeTestCryptoDbName(userId, config.deviceId),
        ),
        entitlementsDelegate: new Entitlements(config.riverConfig, spaceDapp),
        opts: {
            persistenceStoreName: makeTestPersistenceDbName(userId, config.deviceId),
            logNamespaceFilter: undefined,
            highPriorityStreamIds: undefined,
            streamOpts: {
                useSharedSyncer: true,
            },
        },
        rpcRetryParams: config.retryParams,
    } satisfies ClientParams
}

export function makeTestPersistenceDbName(userId: string, deviceId?: string) {
    return makeTestDbName('p', userId, deviceId)
}

export function makeTestCryptoDbName(userId: string, deviceId?: string) {
    return makeTestDbName('c', userId, deviceId)
}

export function makeTestSyncDbName(userId: string, deviceId?: string) {
    return makeTestDbName('s', userId, deviceId)
}

export function makeTestDbName(prefix: string, userId: string, deviceId?: string) {
    const suffix = deviceId ? `-${deviceId}` : ''
    return `${prefix}-${userId}${suffix}`
}
