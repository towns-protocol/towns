import {
    ExtendedInboundGroupSessionData,
    GroupSessionRecord,
    HybridGroupSessionRecord,
} from './storeTypes'
import { InboundGroupSessionData } from './encryptionDevice'
import { UserDevice } from './olmLib'
import { CryptoStoreAdapter } from './storage/CryptoStoreAdapter'
import { createCryptoDexie } from './storage/createCryptoDexie'
import { cryptoSchema } from './storage/cryptoSchema'
import { isBrowser } from '@towns-protocol/utils'
import { inmemory } from '@towns-protocol/storage/adapters/memory'
import { dexieAdapter } from '@towns-protocol/storage/adapters/dexie'
import type { StorageAdapter } from '@towns-protocol/storage'

const ONE_SECOND_MS = 1000
const ONE_MINUTE_MS = 60 * ONE_SECOND_MS
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS
const ONE_DAY_MS = 24 * ONE_HOUR_MS

export const DEFAULT_USER_DEVICE_EXPIRATION_TIME_MS = 5 * ONE_DAY_MS

export interface CryptoStoreOptions {
    /** Database name (for IndexedDB) */
    databaseName: string
    /** User ID for the crypto store */
    userId: string
    /** Optional custom storage adapter (Drizzle, etc.) */
    storageAdapter?: StorageAdapter
    /** Maximum entries per table for in-memory storage.
     *  Helps prevent memory leaks in long-running processes.
     *  Only applies when using the default memory adapter.
     */
    maxEntries?: number
}

/**
 * Create a crypto store instance.
 *
 * @param databaseName - Database name (for IndexedDB)
 * @param userId - User ID
 * @returns CryptoStore instance
 */
export function createCryptoStore(databaseName: string, userId: string): CryptoStore

/**
 * Create a crypto store instance with options.
 *
 * @param options - Crypto store options including optional storage adapter
 * @returns CryptoStore instance
 */
export function createCryptoStore(options: CryptoStoreOptions): CryptoStore

export function createCryptoStore(
    databaseNameOrOptions: string | CryptoStoreOptions,
    userId?: string,
): CryptoStore {
    // Handle options object
    if (typeof databaseNameOrOptions === 'object') {
        const options = databaseNameOrOptions
        if (options.storageAdapter) {
            return new CryptoStoreAdapter(options.userId, options.storageAdapter)
        }
        if (isBrowser) {
            // Use CryptoStoreAdapter with dexieAdapter for browser environments
            const db = createCryptoDexie(options.databaseName)
            return new CryptoStoreAdapter(options.userId, dexieAdapter(db))
        } else {
            // Use CryptoStoreAdapter with inmemory adapter for non-browser environments
            // Pass schema so the adapter knows about composite primary keys
            const memoryOpts = options.maxEntries
                ? { maxEntries: options.maxEntries, schema: cryptoSchema }
                : { schema: cryptoSchema }
            return new CryptoStoreAdapter(options.userId, inmemory(memoryOpts))
        }
    }

    // Handle legacy positional arguments
    const databaseName = databaseNameOrOptions
    if (isBrowser) {
        // Use CryptoStoreAdapter with dexieAdapter for browser environments
        const db = createCryptoDexie(databaseName)
        return new CryptoStoreAdapter(userId!, dexieAdapter(db))
    } else {
        // Use CryptoStoreAdapter with inmemory adapter for non-browser environments
        // Pass schema so the adapter knows about composite primary keys
        return new CryptoStoreAdapter(userId!, inmemory({ schema: cryptoSchema }))
    }
}

export interface CryptoStore {
    userId: string

    initialize(): Promise<void>
    deleteAllData(): Promise<void>
    deleteInboundGroupSessions(streamId: string, sessionId: string): Promise<void>
    deleteOutboundGrounpSessions(streamId: string): Promise<void>
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
    deleteHybridGroupSessions(streamId: string): Promise<void>
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
