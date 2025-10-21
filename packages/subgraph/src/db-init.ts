import { sql } from 'ponder'

// Track if critical indexes have been created
let indexesCreated = false

/**
 * Ensures critical database indexes exist.
 * Safe to call multiple times (idempotent).
 * Only executes once per process lifetime.
 */
export async function ensureCriticalIndexes(db: any) {
    if (indexesCreated) {
        return
    }

    try {
        console.log('Creating critical indexes...')

        // Index for spaces.tokenId (used by SpaceOwner:Transfer UPDATE queries)
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS spaces_tokenid_idx
            ON spaces (token_id)
        `)

        // Add more critical indexes here as needed
        // await db.execute(sql`CREATE INDEX IF NOT EXISTS ...`)

        indexesCreated = true
        console.log('✅ Critical indexes created successfully')
    } catch (error) {
        console.warn('⚠️ Failed to create indexes (may already exist):', error)
        indexesCreated = true // Don't retry to avoid spam
    }
}
