/**
 * @group main
 */

import { providers } from 'ethers'
import { genShortId } from '../../id'
import { Store } from '../../store/store'
import { makeRiverConfig } from '../../riverConfig'
import { RiverNodeUrls } from './models/riverNodeUrls'
import { RiverRegistry } from '@river-build/web3'
import { RiverConnection } from './riverConnection'
import { waitFor } from '../../util.test'

describe('RiverConnection.test.ts', () => {
    const databaseName = genShortId()
    const config = makeRiverConfig()
    const river = config.river
    const riverProvider = new providers.StaticJsonRpcProvider(river.rpcUrl, {
        chainId: river.chainConfig.chainId,
        name: `river-${river.chainConfig.chainId}`,
    })

    // test that a riverConnection will eventually be defined if passed valid config
    test('riverConnection initializes from empty', async () => {
        // init
        const store = new Store(databaseName, 1, [RiverNodeUrls])
        store.newTransactionGroup('init')
        const riverRegistry = new RiverRegistry(config.river.chainConfig, riverProvider)
        const riverConnection = new RiverConnection(store, riverRegistry)

        // check initial state
        expect(riverConnection.nodeUrls.data.urls).toBe('')
        expect(riverConnection.rpcClient.value).toBeUndefined()

        // load
        await store.commitTransaction()

        // we should get there
        await waitFor(() => {
            expect(riverConnection.nodeUrls.data.urls).not.toBe('')
        })
        await waitFor(() => {
            expect(riverConnection.rpcClient.value).toBeDefined()
        })
        await waitFor(() => {
            expect(riverConnection.nodeUrls.value.status).toBe('saved')
        })
    })
    // test that a riverConnection will instantly be defined if data exists in local store
    test('riverConnection loads from db', async () => {
        // init
        const store = new Store(databaseName, 1, [RiverNodeUrls])
        store.newTransactionGroup('init')
        const riverRegistry = new RiverRegistry(config.river.chainConfig, riverProvider)
        const riverConnection = new RiverConnection(store, riverRegistry)

        // check initial state
        expect(riverConnection.nodeUrls.data.urls).toBe('')
        expect(riverConnection.rpcClient.value).toBeUndefined()

        // load
        await store.commitTransaction()

        // should still be defined before we even start!
        expect(riverConnection.nodeUrls.data.urls).not.toBe('')
        expect(riverConnection.rpcClient.value).toBeDefined()
    })
})
