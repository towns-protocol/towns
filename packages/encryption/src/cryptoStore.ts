import {
    ExtendedInboundGroupSessionData,
    GroupSessionRecord,
    HybridGroupSessionRecord,
} from './storeTypes'
import { InboundGroupSessionData } from './encryptionDevice'
import { UserDevice } from './olmLib'
import { CryptoStoreIndexedDb } from './CryptoStoreIndexedDb'
import { CryptoStoreInMemory } from './CryptoStoreInMemory'
import { isBrowser } from '@towns-protocol/dlog'

const ONE_SECOND_MS = 1000
const ONE_MINUTE_MS = 60 * ONE_SECOND_MS
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS
const ONE_DAY_MS = 24 * ONE_HOUR_MS

export const DEFAULT_USER_DEVICE_EXPIRATION_TIME_MS = 5 * ONE_DAY_MS

export function createCryptoStore(databaseName: string, userId: string): CryptoStore {
    if (isBrowser) {
        return new CryptoStoreIndexedDb(databaseName, userId)
    } else {
        return new CryptoStoreInMemory(userId)
    }
}

export interface CryptoStore {
    userId: string

    initialize(): Promise<void>
    deleteAllData(): Promise<void>
    deleteInboundGroupSessions(streamId: string, sessionId: string): Promise<void>
    deleteAccount(userId: string): Promise<void>
    getAccount(): Promise<string>
    storeAccount(accountPickle: string): Promise<void>
    storeEndToEndOutboundGroupSession(
        sessionId: string,
        sessionData: string,
        streamId: string,
    ): Promise<void>
    getEndToEndOutboundGroupSession(streamId: string): Promise<string>
    getAllEndToEndOutboundGroupSessions(): Promise<GroupSessionRecord[]>
    getEndToEndInboundGroupSession(
        streamId: string,
        sessionId: string,
    ): Promise<InboundGroupSessionData | undefined>
    getHybridGroupSession(
        streamId: string,
        sessionId: string,
    ): Promise<HybridGroupSessionRecord | undefined>
    getHybridGroupSessionsForStream(streamId: string): Promise<HybridGroupSessionRecord[]>
    getAllEndToEndInboundGroupSessions(): Promise<ExtendedInboundGroupSessionData[]>
    getAllHybridGroupSessions(): Promise<HybridGroupSessionRecord[]>
    storeEndToEndInboundGroupSession(
        streamId: string,
        sessionId: string,
        sessionData: InboundGroupSessionData,
    ): Promise<void>
    storeHybridGroupSession(sessionData: HybridGroupSessionRecord): Promise<void>
    getInboundGroupSessionIds(streamId: string): Promise<string[]>
    getHybridGroupSessionIds(streamId: string): Promise<string[]>
    withAccountTx<T>(fn: () => Promise<T>): Promise<T>
    withGroupSessions<T>(fn: () => Promise<T>): Promise<T>
    deviceRecordCount(): Promise<number>
    saveUserDevices(userId: string, devices: UserDevice[], expirationMs?: number): Promise<void>
    getUserDevices(userId: string): Promise<UserDevice[]>
}
