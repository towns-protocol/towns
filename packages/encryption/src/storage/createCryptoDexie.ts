/**
 * Helper function to create a Dexie database instance with the crypto schema.
 * This provides the correct IndexedDB schema for browser-based crypto storage.
 */

import Dexie from 'dexie'

/**
 * Create a Dexie database instance configured for crypto storage.
 *
 * @param databaseName - Name for the IndexedDB database
 * @returns A configured Dexie instance ready for use with dexieAdapter
 *
 * @example
 * ```typescript
 * import { createCryptoDexie } from '@towns-protocol/encryption/storage'
 * import { dexieAdapter } from '@towns-protocol/storage/adapters/dexie'
 *
 * const db = createCryptoDexie('myapp-crypto')
 * const adapter = dexieAdapter(db)
 * ```
 */
export function createCryptoDexie(databaseName: string): Dexie {
    const db = new Dexie(databaseName)

    // Schema version 6 matches the existing CryptoStoreIndexedDb schema
    db.version(6).stores({
        // Account table - stores pickled OLM account data
        // Primary key: id (userId)
        account: 'id',

        // Inbound group sessions - stores OLM inbound group sessions
        // Compound primary key: [streamId, sessionId]
        inboundGroupSessions: '[streamId+sessionId]',

        // Outbound group sessions - stores OLM outbound group sessions
        // Primary key: streamId (one outbound session per stream)
        outboundGroupSessions: 'streamId',

        // Hybrid group sessions - stores hybrid encryption sessions
        // Compound primary key: [streamId, sessionId], secondary index on streamId
        hybridGroupSessions: '[streamId+sessionId],streamId',

        // Devices table - stores user device information with expiration
        // Compound primary key: [userId, deviceKey], secondary index on expirationTimestamp
        devices: '[userId+deviceKey],expirationTimestamp',
    })

    return db
}
