/**
 * @group main
 */

import { genId } from '../../id'
import { PersistenceStore } from '../../persistenceStore'

describe('persistenceStoreTests', () => {
    let store!: PersistenceStore
    beforeEach(() => {
        store = new PersistenceStore(genId())
    })
    test('cleartextIsStored', async () => {
        const cleartext = 'decrypted event cleartext goes here'
        const cleartextBytes = new TextEncoder().encode(cleartext)
        const eventId = genId()
        await expect(store.saveCleartext(eventId, cleartextBytes)).resolves.not.toThrow()
        const cacheHitBytes = await store.getCleartext(eventId)
        const cacheHit =
            typeof cacheHitBytes === 'string'
                ? cacheHitBytes
                : new TextDecoder().decode(cacheHitBytes)
        expect(cacheHit).toBe(cleartext)
    })

    test('returnsUndefinedForMissingCleartext', async () => {
        const cacheMiss = await store.getCleartext(genId())
        expect(cacheMiss).toBeUndefined()
    })
})
