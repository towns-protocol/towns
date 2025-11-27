/**
 * Dexie adapter tests using fake-indexeddb for Node.js.
 */

import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, beforeEach, afterEach } from 'vitest'
import { runAdapterTests } from '../../testing/runAdapterTests.js'
import { dexieAdapter } from './index.js'

// Create a test database class
class TestDB extends Dexie {
    constructor() {
        super('TestDB')
        this.version(1).stores({
            // Users table with simple id primary key
            users: 'id,name,email,age',
            // Items table with simple id primary key
            items: 'id,value,category',
            // Posts table for join tests
            posts: 'id,user_id,title',
            // Profiles table for one-to-one join tests
            profiles: 'id,user_id,bio',
            // Empty model for testing empty results
            empty_model: 'id',
        })
    }
}

describe('Dexie Adapter', () => {
    let db: TestDB

    beforeEach(() => {
        db = new TestDB()
    })

    afterEach(async () => {
        await db.delete()
    })

    runAdapterTests('Dexie', async () => {
        // Clear all tables before each test
        await db.table('users').clear()
        await db.table('items').clear()
        await db.table('posts').clear()
        await db.table('profiles').clear()
        await db.table('empty_model').clear()
        return dexieAdapter(db)
    })
})
