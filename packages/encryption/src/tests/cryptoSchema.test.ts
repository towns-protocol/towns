/**
 * Tests for cryptoSchema to verify the schema structure.
 */

import { describe, it, expect } from 'vitest'
import { generateDexieStores } from '@towns-protocol/storage/adapters/dexie'
import { toSqliteSchema } from '@towns-protocol/storage/adapters/drizzle'
import { getTableName, getTableColumns } from 'drizzle-orm'
import {
    cryptoSchema,
    accountTable,
    outboundGroupSessionsTable,
    inboundGroupSessionsTable,
    hybridGroupSessionsTable,
    devicesTable,
} from '../storage/cryptoSchema.js'

describe('cryptoSchema', () => {
    it('has correct schema metadata', () => {
        expect(cryptoSchema.name).toBe('crypto')
        expect(cryptoSchema.version).toBe(6)
        expect(cryptoSchema.tables).toHaveLength(5)
    })

    it('account table has correct structure', () => {
        expect(accountTable.name).toBe('account')
        expect(Object.keys(accountTable.columns)).toEqual(['id', 'accountPickle'])
    })

    it('outboundGroupSessions table has correct structure', () => {
        expect(outboundGroupSessionsTable.name).toBe('outboundGroupSessions')
        expect(Object.keys(outboundGroupSessionsTable.columns)).toEqual([
            'streamId',
            'sessionId',
            'session',
        ])
    })

    it('inboundGroupSessions table has composite primary key', () => {
        expect(inboundGroupSessionsTable.name).toBe('inboundGroupSessions')
        expect(Object.keys(inboundGroupSessionsTable.columns)).toEqual([
            'streamId',
            'sessionId',
            'stream_id',
            'session',
            'keysClaimed',
            'untrusted',
        ])
        expect(inboundGroupSessionsTable.constraints).toBeDefined()
        expect(inboundGroupSessionsTable.constraints).toHaveLength(1)
        expect(inboundGroupSessionsTable.constraints![0]).toEqual({
            type: 'primaryKey',
            name: undefined,
            columns: ['streamId', 'sessionId'],
        })
    })

    it('hybridGroupSessions table has composite PK and index', () => {
        expect(hybridGroupSessionsTable.name).toBe('hybridGroupSessions')
        expect(hybridGroupSessionsTable.constraints).toBeDefined()
        expect(hybridGroupSessionsTable.constraints).toHaveLength(2)
        expect(hybridGroupSessionsTable.constraints![0]).toEqual({
            type: 'primaryKey',
            name: undefined,
            columns: ['streamId', 'sessionId'],
        })
        expect(hybridGroupSessionsTable.constraints![1]).toEqual({
            type: 'index',
            name: 'hybridGroupSessions_streamId',
            columns: ['streamId'],
            unique: false,
        })
    })

    it('devices table has composite PK and index', () => {
        expect(devicesTable.name).toBe('devices')
        expect(devicesTable.constraints).toBeDefined()
        expect(devicesTable.constraints).toHaveLength(2)
        expect(devicesTable.constraints![0]).toEqual({
            type: 'primaryKey',
            name: undefined,
            columns: ['userId', 'deviceKey'],
        })
        expect(devicesTable.constraints![1]).toEqual({
            type: 'index',
            name: 'devices_expirationTimestamp',
            columns: ['expirationTimestamp'],
            unique: false,
        })
    })
})

describe('cryptoSchema Dexie output', () => {
    it('generates correct Dexie store definitions', () => {
        const dexieStores = generateDexieStores(cryptoSchema)

        expect(dexieStores).toEqual({
            account: 'id',
            outboundGroupSessions: 'streamId',
            inboundGroupSessions: '[streamId+sessionId]',
            hybridGroupSessions: '[streamId+sessionId],streamId',
            devices: '[userId+deviceKey],expirationTimestamp',
        })
    })
})

describe('cryptoSchema SQLite output', () => {
    it('generates correct Drizzle SQLite tables', () => {
        const sqliteTables = toSqliteSchema(cryptoSchema)

        expect(Object.keys(sqliteTables)).toEqual([
            'account',
            'outboundGroupSessions',
            'inboundGroupSessions',
            'hybridGroupSessions',
            'devices',
        ])

        // Verify table names
        expect(getTableName(sqliteTables.account)).toBe('account')
        expect(getTableName(sqliteTables.outboundGroupSessions)).toBe('outboundGroupSessions')
        expect(getTableName(sqliteTables.inboundGroupSessions)).toBe('inboundGroupSessions')
        expect(getTableName(sqliteTables.hybridGroupSessions)).toBe('hybridGroupSessions')
        expect(getTableName(sqliteTables.devices)).toBe('devices')

        // Verify column structures
        const accountCols = getTableColumns(sqliteTables.account)
        expect(Object.keys(accountCols)).toEqual(['id', 'accountPickle'])

        const devicesCols = getTableColumns(sqliteTables.devices)
        expect(Object.keys(devicesCols)).toEqual([
            'userId',
            'deviceKey',
            'fallbackKey',
            'expirationTimestamp',
        ])
    })
})
