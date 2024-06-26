/**
 * @group with-entitilements
 */
import { Wallet } from 'ethers'
import { makeSignerContext } from '../signerContext'
import { makeRiverConfig } from '../riverConfig'
import { SyncAgent } from './syncAgent'
import { AuthStatus } from './user/user'
import { dlogger } from '@river-build/dlog'
import { waitFor } from '../util.test'
import { LocalhostWeb3Provider } from '@river-build/web3'
import { MembershipOp } from '@river-build/proto'

const logger = dlogger('csb:test:syncAgent')

describe('syncAgent.test.ts', () => {
    const riverConfig = makeRiverConfig()
    const rootWallet = Wallet.createRandom()
    const delegateWallet = Wallet.createRandom()
    const web3Provider = new LocalhostWeb3Provider(riverConfig.base.rpcUrl, rootWallet)

    test('syncAgent', async () => {
        await web3Provider.fundWallet()
        const signerContext = await makeSignerContext(rootWallet, delegateWallet, { days: 1 })
        const syncAgent = new SyncAgent({ context: signerContext, riverConfig })
        expect(syncAgent.user.value.status).toBe('loading')
        await syncAgent.start()
        expect(syncAgent.user.value.status).toBe('loaded')
        expect(syncAgent.user.data.initialized).toBe(false)
        expect(syncAgent.user.authStatus.value).toBe(AuthStatus.None)
        expect(Object.keys(syncAgent.user.streams.memberships.data.memberships).length).toBe(0)
        syncAgent.store.newTransactionGroup('createSpace')
        const { spaceId, defaultChannelId } = await syncAgent.user.createSpace(
            { spaceName: 'BlastOff' },
            web3Provider.signer,
        )
        logger.log('spaceId', spaceId)
        expect(Object.keys(syncAgent.user.streams.memberships.data.memberships).length).toBe(2)
        expect(syncAgent.user.streams.memberships.data.memberships[spaceId].op).toBe(
            MembershipOp.SO_JOIN,
        )
        expect(syncAgent.user.streams.memberships.data.memberships[defaultChannelId].op).toBe(
            MembershipOp.SO_JOIN,
        )
        expect(syncAgent.user.authStatus.value).toBe(AuthStatus.ConnectedToRiver)
        expect(syncAgent.user.data.initialized).toBe(true)
        expect(syncAgent.user.value.status).toBe('saving')
        await syncAgent.store.commitTransaction()
        expect(syncAgent.user.value.status).toBe('saved')
        await syncAgent.stop()
    })
    test('syncAgent loads again', async () => {
        const signerContext = await makeSignerContext(rootWallet, delegateWallet, { days: 1 })
        const syncAgent = new SyncAgent({ context: signerContext, riverConfig })
        expect(syncAgent.user.value.status).toBe('loading')
        await syncAgent.start()
        expect(syncAgent.user.value.status).toBe('loaded')
        expect(syncAgent.user.data.initialized).toBe(true)
        expect(syncAgent.user.authStatus.value).toBe(AuthStatus.EvaluatingCredentials)
        await waitFor(() => {
            expect(syncAgent.user.authStatus.value).toBe(AuthStatus.ConnectedToRiver)
        })
        await syncAgent.stop()
    })
})
