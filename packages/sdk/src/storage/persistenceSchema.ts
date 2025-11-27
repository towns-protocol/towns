/**
 * Storage schema definition for the SDK persistence layer.
 * Defines the tables used by PersistenceStore.
 */

import { t, table, schema, primaryKey } from '@towns-protocol/storage'

/**
 * Cleartexts table - stores decrypted event content.
 * Primary key is eventId.
 */
export const cleartextsTable = table('cleartexts', {
    eventId: t.string().primaryKey(),
    cleartext: t.bytes(), // Uint8Array or string
})

/**
 * Synced streams table - stores stream synchronization state.
 * Primary key is streamId. Data is protobuf-serialized PersistedSyncedStream.
 */
export const syncedStreamsTable = table('syncedStreams', {
    streamId: t.string().primaryKey(),
    data: t.bytes(), // Protobuf binary
})

/**
 * Miniblocks table - stores miniblock data.
 * Compound primary key: [streamId, miniblockNum].
 * miniblockNum is stored as string for bigint compatibility.
 */
export const miniblocksTable = table(
    'miniblocks',
    {
        streamId: t.string(),
        miniblockNum: t.string(), // bigint as string
        data: t.bytes(), // Protobuf binary
    },
    (tbl) => [primaryKey({ columns: [tbl.streamId, tbl.miniblockNum] })],
)

/**
 * Snapshots table - stores stream snapshots.
 * Primary key is streamId.
 */
export const snapshotsTable = table('snapshots', {
    streamId: t.string().primaryKey(),
    miniblockNum: t.integer(), // bigint stored as integer
    snapshot: t.bytes(), // Protobuf binary
})

/**
 * Scratch table - stores ephemeral metadata like access timestamps.
 * Primary key is id.
 */
export const scratchTable = table('scratch', {
    id: t.string().primaryKey(),
    data: t.json().type<Record<string, unknown>>(), // JSON serialized
})

/**
 * Persistence schema - complete storage schema for the SDK persistence layer.
 * Version 9 matches the current Dexie schema version.
 */
export const persistenceSchema = schema('persistence', {
    tables: [
        cleartextsTable,
        syncedStreamsTable,
        miniblocksTable,
        snapshotsTable,
        scratchTable,
    ] as const,
    version: 9,
})
