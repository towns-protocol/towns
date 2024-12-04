/**
 * @group with-entitlements
 */

import { Bot } from '../../../sync-agent/utils/bot'
import { waitFor } from '../../testUtils'

describe('RiverConnection.test.ts', () => {
    const testUser = new Bot()

    beforeEach(async () => {
        await testUser.fundWallet()
    })

    // test that a riverConnection will eventually be defined if passed valid config
    test('riverConnection initializes from empty', async () => {
        const syncAgent = await testUser.makeSyncAgent()
        const riverConnection = syncAgent.riverConnection

        // check initial state
        expect(riverConnection.riverChain.data.urls).toStrictEqual({ value: '' })
        expect(riverConnection.client).toBeUndefined()

        // load
        await syncAgent.start()

        // we should get there
        await waitFor(() => {
            expect(riverConnection.riverChain.data.urls).not.toBe('')
        })
        await waitFor(() => {
            expect(riverConnection.client).toBeDefined()
        })
        await waitFor(() => {
            expect(riverConnection.riverChain.value.status).toBe('loaded')
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
        expect(riverConnection.riverChain.data.urls).toStrictEqual({ value: '' })
        expect(riverConnection.client).toBeUndefined()

        // load
        await syncAgent.start()

        // should still be defined before we even start!
        expect(riverConnection.riverChain.data.urls).not.toStrictEqual({ value: '' })
        expect(riverConnection.client).toBeDefined()
        await riverConnection.stop()
    })
})
