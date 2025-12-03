/**
 * Memory adapter tests using the shared test suite.
 */

import { runAdapterTests } from '../../testing/runAdapterTests.js'
import { memoryAdapter, createMemoryDB, type MemoryDB } from './index.js'

let db: MemoryDB

runAdapterTests(
    'Memory',
    async () => {
        db = createMemoryDB()
        return memoryAdapter(db)
    },
    async () => {
        // Reset the database
        db = createMemoryDB()
    },
)
