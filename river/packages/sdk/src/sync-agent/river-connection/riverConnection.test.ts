/**
 * @group with-entitilements
 */

import { waitFor } from '../../util.test'
import { TestUser } from '../utils/testUser.test'

describe('RiverConnection.test.ts', () => {
    const testUser = new TestUser()

    // test that a riverConnection will eventually be defined if passed valid config
    test('riverConnection initializes from empty', async () => {
        const syncAgent = await testUser.makeSyncAgent()
        const riverConnection = syncAgent.riverConnection

        // check initial state
        expect(riverConnection.streamNodeUrls.data.urls).toBe('')
        expect(riverConnection.client).toBeUndefined()

        // load
        await syncAgent.start()

        // we should get there
        await waitFor(() => {
            expect(riverConnection.streamNodeUrls.data.urls).not.toBe('')
        })
        await waitFor(() => {
            expect(riverConnection.client).toBeDefined()
        })
        await waitFor(() => {
            expect(riverConnection.streamNodeUrls.value.status).toBe('saved')
        })
        // cleanup
        await syncAgent.stop()
    })
    // test that a riverConnection will instantly be defined if data exists in local store
    test('riverConnection loads from db', async () => {
        // init
        const syncAgent = await testUser.makeSyncAgent()
        const riverConnection = syncAgent.riverConnection

        // check initial state
        expect(riverConnection.streamNodeUrls.data.urls).toBe('')
        expect(riverConnection.client).toBeUndefined()

        // load
        await syncAgent.start()

        // should still be defined before we even start!
        expect(riverConnection.streamNodeUrls.data.urls).not.toBe('')
        expect(riverConnection.client).toBeDefined()
        await riverConnection.stop()
    })
})
