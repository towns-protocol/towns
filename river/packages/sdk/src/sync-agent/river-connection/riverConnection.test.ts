/**
 * @group with-entitilements
 */

import { providers } from 'ethers'
import { genShortId } from '../../id'
import { Store } from '../../store/store'
import { makeRiverConfig } from '../../riverConfig'
import { StreamNodeUrls } from './models/streamNodeUrls'
import { RiverRegistry, SpaceDapp } from '@river-build/web3'
import { RiverConnection } from './riverConnection'
import { makeRandomUserContext, waitFor } from '../../util.test'
import { makeClientParams } from '../utils/syncAgentUtils.test'

describe('RiverConnection.test.ts', () => {
    const databaseName = genShortId()
    const riverConfig = makeRiverConfig()
    const river = riverConfig.river
    const riverProvider = new providers.StaticJsonRpcProvider(river.rpcUrl)
    const baseProvider = new providers.StaticJsonRpcProvider(riverConfig.base.rpcUrl)
    const spaceDapp = new SpaceDapp(riverConfig.base.chainConfig, baseProvider)

    // test that a riverConnection will eventually be defined if passed valid config
    test('riverConnection initializes from empty', async () => {
        // init
        const context = await makeRandomUserContext()
        const clientParams = makeClientParams({ context, riverConfig }, spaceDapp)
        const store = new Store(databaseName, 1, [StreamNodeUrls])
        store.newTransactionGroup('init')
        const riverRegistry = new RiverRegistry(riverConfig.river.chainConfig, riverProvider)
        const riverConnection = new RiverConnection(store, riverRegistry, clientParams)

        // check initial state
        expect(riverConnection.streamNodeUrls.data.urls).toBe('')
        expect(riverConnection.client).toBeUndefined()

        // load
        await store.commitTransaction()

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
        await riverConnection.stop()
    })
    // test that a riverConnection will instantly be defined if data exists in local store
    test('riverConnection loads from db', async () => {
        // init
        const context = await makeRandomUserContext()
        const clientParams = makeClientParams({ context, riverConfig }, spaceDapp)
        const store = new Store(databaseName, 1, [StreamNodeUrls])
        store.newTransactionGroup('init')
        const riverRegistry = new RiverRegistry(riverConfig.river.chainConfig, riverProvider)
        const riverConnection = new RiverConnection(store, riverRegistry, clientParams)

        // check initial state
        expect(riverConnection.streamNodeUrls.data.urls).toBe('')
        expect(riverConnection.client).toBeUndefined()

        // load
        await store.commitTransaction()

        // should still be defined before we even start!
        expect(riverConnection.streamNodeUrls.data.urls).not.toBe('')
        expect(riverConnection.client).toBeDefined()
        await riverConnection.stop()
    })
})
