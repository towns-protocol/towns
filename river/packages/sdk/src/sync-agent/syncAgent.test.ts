/**
 * @group with-entitilements
 */
import { Wallet } from 'ethers'
import { makeSignerContext } from '../signerContext'
import { makeRiverConfig } from '../riverConfig'
import { SyncAgent } from './syncAgent'

describe('syncAgent.test.ts', () => {
    const rootWallet = Wallet.createRandom()
    const delegateWallet = Wallet.createRandom()
    const riverConfig = makeRiverConfig()
    test('syncAgent', async () => {
        const signerContext = await makeSignerContext(rootWallet, delegateWallet, { days: 1 })
        const syncAgent = new SyncAgent({ context: signerContext, riverConfig })
        expect(syncAgent.user.value.status).toBe('loading')
        await syncAgent.start()
        expect(syncAgent.user.value.status).toBe('loaded')
        expect(syncAgent.user.value.data.initialized).toBe(false)
        syncAgent.store.newTransactionGroup('initializeUser')
        await syncAgent.user.initialize()
        expect(syncAgent.user.value.data.initialized).toBe(true)
        expect(syncAgent.user.value.status).toBe('saving')
        await syncAgent.store.commitTransaction()
        expect(syncAgent.user.value.status).toBe('saved')
    })
    test('syncAgent loads again', async () => {
        const signerContext = await makeSignerContext(rootWallet, delegateWallet, { days: 1 })
        const syncAgent = new SyncAgent({ context: signerContext, riverConfig })
        expect(syncAgent.user.value.status).toBe('loading')
        await syncAgent.start()
        expect(syncAgent.user.value.status).toBe('loaded')
        expect(syncAgent.user.value.data.initialized).toBe(true)
    })
})
