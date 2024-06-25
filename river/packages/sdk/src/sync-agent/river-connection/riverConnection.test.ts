/**
 * @group main
 */

import { providers } from 'ethers'
import { genShortId } from '../../id'
import { Store } from '../../store/store'
import { makeRiverConfig } from '../../riverConfig'
import { RiverNodeUrls } from './models/riverNodeUrls'
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
        const store = new Store(databaseName, 1, [RiverNodeUrls])
        store.newTransactionGroup('init')
        const riverRegistry = new RiverRegistry(riverConfig.river.chainConfig, riverProvider)
        const riverConnection = new RiverConnection(store, riverRegistry, clientParams)

        // check initial state
        expect(riverConnection.nodeUrls.data.urls).toBe('')
        expect(riverConnection.client.value).toBeUndefined()

        // load
        await store.commitTransaction()

        // we should get there
        await waitFor(() => {
            expect(riverConnection.nodeUrls.data.urls).not.toBe('')
        })
        await waitFor(() => {
            expect(riverConnection.client.value).toBeDefined()
        })
        await waitFor(() => {
            expect(riverConnection.nodeUrls.value.status).toBe('saved')
        })
    })
    // test that a riverConnection will instantly be defined if data exists in local store
    test('riverConnection loads from db', async () => {
        // init
        const context = await makeRandomUserContext()
        const clientParams = makeClientParams({ context, riverConfig }, spaceDapp)
        const store = new Store(databaseName, 1, [RiverNodeUrls])
        store.newTransactionGroup('init')
        const riverRegistry = new RiverRegistry(riverConfig.river.chainConfig, riverProvider)
        const riverConnection = new RiverConnection(store, riverRegistry, clientParams)

        // check initial state
        expect(riverConnection.nodeUrls.data.urls).toBe('')
        expect(riverConnection.client.value).toBeUndefined()

        // load
        await store.commitTransaction()

        // should still be defined before we even start!
        expect(riverConnection.nodeUrls.data.urls).not.toBe('')
        expect(riverConnection.client.value).toBeDefined()
    })
})
