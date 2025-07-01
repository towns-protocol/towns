import {
    ExtendedInboundGroupSessionData,
    GroupSessionRecord,
    HybridGroupSessionRecord,
} from './storeTypes'
import { InboundGroupSessionData } from './encryptionDevice'
import { UserDevice } from './olmLib'
import { CryptoStoreIndexedDb } from './CryptoStoreIndexedDb'
import { CryptoStoreInMemory } from './CryptoStoreInMemory'

// TODO: Increase this time to 10 days or something.
// Its 15 min right now so we can catch any issues with the expiration time.
export const DEFAULT_USER_DEVICE_EXPIRATION_TIME_MS = 15 * 60 * 1000

export function createCryptoStore(databaseName: string, userId: string): CryptoStore {
    if (isIndexedDBAvailable()) {
        return new CryptoStoreIndexedDb(databaseName, userId)
    } else {
        return new CryptoStoreInMemory(userId)
    }
}

function isIndexedDBAvailable(): boolean {
    try {
        if (typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB) {
            return true
        }
        return false
    } catch {
        return false
    }
}

export interface CryptoStore {
    userId: string

    initialize(): Promise<void>
    deleteAllData(): void
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
