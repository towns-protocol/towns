/**
 * Storage schema definition for the encryption package.
 * Defines the tables used by CryptoStore.
 */

import { t, table, schema, index, primaryKey } from '@towns-protocol/storage'

/**
 * Account table - stores pickled OLM account data.
 */
export const accountTable = table('account', {
    id: t.string().primaryKey(),
    accountPickle: t.string(),
})

/**
 * Outbound group sessions table - stores OLM outbound group sessions.
 * Primary key is streamId (one outbound session per stream).
 */
export const outboundGroupSessionsTable = table('outboundGroupSessions', {
    streamId: t.string().primaryKey(),
    sessionId: t.string(),
    session: t.string(),
})

/**
 * Inbound group sessions table - stores OLM inbound group sessions.
 * Compound primary key: [streamId, sessionId]
 */
export const inboundGroupSessionsTable = table(
    'inboundGroupSessions',
    {
        streamId: t.string(),
        sessionId: t.string(),
        stream_id: t.string(),
        session: t.string(),
        keysClaimed: t.json().type<Record<string, string>>(),
        untrusted: t.boolean().nullable(),
    },
    (tbl) => [primaryKey({ columns: [tbl.streamId, tbl.sessionId] })],
)

/**
 * Hybrid group sessions table - stores hybrid encryption sessions.
 * Compound primary key: [streamId, sessionId]
 */
export const hybridGroupSessionsTable = table(
    'hybridGroupSessions',
    {
        streamId: t.string(),
        sessionId: t.string(),
        sessionKey: t.bytes(),
        miniblockNum: t.bigint(),
    },
    (tbl) => [
        primaryKey({ columns: [tbl.streamId, tbl.sessionId] }),
        index('hybridGroupSessions_streamId').on(tbl.streamId),
    ],
)

/**
 * Devices table - stores user device information with expiration.
 * Compound primary key: [userId, deviceKey]
 */
export const devicesTable = table(
    'devices',
    {
        userId: t.string(),
        deviceKey: t.string(),
        fallbackKey: t.string(),
        expirationTimestamp: t.integer(),
    },
    (tbl) => [
        primaryKey({ columns: [tbl.userId, tbl.deviceKey] }),
        index('devices_expirationTimestamp').on(tbl.expirationTimestamp),
    ],
)

/**
 * Crypto schema - complete storage schema for the encryption package.
 * Version 6 matches the current Dexie schema version.
 */
export const cryptoSchema = schema('crypto', {
    tables: [
        accountTable,
        outboundGroupSessionsTable,
        inboundGroupSessionsTable,
        hybridGroupSessionsTable,
        devicesTable,
    ] as const,
    version: 6,
})

/**
 * Inferred model types from the schema.
 */
export type CryptoSchemaModels = typeof cryptoSchema extends { tables: infer T }
    ? T extends readonly { name: infer N; columns: infer C }[]
        ? { [K in N & string]: { [P in keyof C]: C[P] extends { _type: infer V } ? V : never } }
        : never
    : never
