/**
 * Drizzle adapter tests using the shared test suite.
 */

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { runAdapterTests } from '../../testing/runAdapterTests.js'
import { drizzleSqliteAdapter } from './index.js'
import * as schema from '../../testing/drizzle-test-schema.js'

let sqlite: Database.Database

runAdapterTests(
    'Drizzle (SQLite)',
    async () => {
        // Create in-memory SQLite database
        sqlite = new Database(':memory:')

        // Create tables
        sqlite.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT,
                age INTEGER
            )
        `)

        sqlite.exec(`
            CREATE TABLE IF NOT EXISTS items (
                id TEXT PRIMARY KEY,
                value INTEGER NOT NULL,
                category TEXT
            )
        `)

        sqlite.exec(`
            CREATE TABLE IF NOT EXISTS empty_model (
                id TEXT PRIMARY KEY
            )
        `)

        sqlite.exec(`
            CREATE TABLE IF NOT EXISTS posts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT,
                user_id TEXT NOT NULL
            )
        `)

        sqlite.exec(`
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                bio TEXT,
                user_id TEXT NOT NULL
            )
        `)

        const db = drizzle(sqlite, { schema })
        return drizzleSqliteAdapter(db, schema)
    },
    async () => {
        // Clean up - close and recreate database
        sqlite?.close()
    },
)
