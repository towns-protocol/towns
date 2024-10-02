import { SyncAgentConfig } from '../syncAgent'
import { ClientParams } from '../river-connection/riverConnection'
import { makeRandomUserContext } from '../../util.test'
import { makeRiverConfig } from '../../riverConfig'
import { RiverDbManager } from '../../riverDbManager'
import { userIdFromAddress } from '../../id'
import { Entitlements } from '../entitlements/entitlements'
import {
    ETH_ADDRESS,
    LegacyMembershipStruct,
    NoopRuleData,
    Permission,
    SpaceDapp,
    getDynamicPricingModule,
    getFixedPricingModule,
} from '@river-build/web3'

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
        persistenceStoreName: makeTestPersistenceDbName(userId, config.deviceId),
        logNamespaceFilter: undefined,
        highPriorityStreamIds: undefined,
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

export async function makeTestMembershipInfo(
    spaceDapp: SpaceDapp,
    feeRecipient: string,
    pricing: 'dynamic' | 'fixed' = 'dynamic',
) {
    const pricingModule =
        pricing == 'dynamic'
            ? await getDynamicPricingModule(spaceDapp)
            : await getFixedPricingModule(spaceDapp)
    return {
        settings: {
            name: 'Everyone',
            symbol: 'MEMBER',
            price: 0,
            maxSupply: 1000,
            duration: 0,
            currency: ETH_ADDRESS,
            feeRecipient: feeRecipient,
            freeAllocation: 0,
            pricingModule: pricingModule.module,
        },
        permissions: [Permission.Read, Permission.Write],
        requirements: {
            everyone: true,
            users: [],
            ruleData: NoopRuleData,
            syncEntitlements: false,
        },
    } satisfies LegacyMembershipStruct
}
