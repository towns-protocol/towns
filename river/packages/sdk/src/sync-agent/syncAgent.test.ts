/**
 * @group with-entitilements
 */
import { dlogger } from '@river-build/dlog'
import { waitFor } from '../util.test'
import { MembershipOp } from '@river-build/proto'
import { Bot } from './utils/bot'
import { AuthStatus } from './river-connection/models/authStatus'
import { makeAuthToken, makeSignerContextFromAuthToken } from '../signerContext'
import { SyncAgent } from './syncAgent'
import { makeRiverConfig } from '../riverConfig'

const logger = dlogger('csb:test:syncAgent')

describe('syncAgent.test.ts', () => {
    const riverConfig = makeRiverConfig()
    const testUser = new Bot(undefined, riverConfig)

    beforeEach(async () => {
        await testUser.fundWallet()
    })

    test('syncAgent', async () => {
        const syncAgent = await testUser.makeSyncAgent()
        expect(syncAgent.user.value.status).toBe('loading')
        expect(syncAgent.riverConnection.authStatus.value).toBe(AuthStatus.Initializing)
        await syncAgent.start()
        expect(syncAgent.user.value.status).toBe('loaded')
        await waitFor(() =>
            expect(syncAgent.riverConnection.authStatus.value).toBe(AuthStatus.Credentialed),
        )
        expect(Object.keys(syncAgent.user.memberships.data.memberships).length).toBe(0)
        expect(syncAgent.spaces.data.spaceIds.length).toBe(0)
        syncAgent.store.newTransactionGroup('createSpace')
        const { spaceId, defaultChannelId } = await syncAgent.spaces.createSpace(
            { spaceName: 'BlastOff' },
            testUser.signer,
        )
        logger.log('spaceId', spaceId)
        expect(Object.keys(syncAgent.user.memberships.data.memberships).length).toBe(2)
        expect(syncAgent.user.memberships.data.memberships[spaceId].op).toBe(MembershipOp.SO_JOIN)
        expect(syncAgent.user.memberships.data.memberships[defaultChannelId].op).toBe(
            MembershipOp.SO_JOIN,
        )
        expect(syncAgent.riverConnection.authStatus.value).toBe(AuthStatus.ConnectedToRiver)
        expect(syncAgent.user.memberships.data.initialized).toBe(true)
        expect(syncAgent.user.value.status).toBe('loaded')
        await syncAgent.store.commitTransaction()
        expect(syncAgent.user.value.status).toBe('loaded')
        expect(syncAgent.spaces.data.spaceIds.length).toBe(1)
        await syncAgent.stop()
    })
    test('syncAgent loads again', async () => {
        const syncAgent = await testUser.makeSyncAgent()
        expect(syncAgent.user.value.status).toBe('loading')
        await syncAgent.start()
        expect(syncAgent.riverConnection.authStatus.value).toBe(AuthStatus.ConnectedToRiver)
        expect(syncAgent.user.value.status).toBe('loaded')
        expect(syncAgent.user.memberships.value.status).toBe('loaded')
        expect(syncAgent.user.memberships.data.initialized).toBe(true)
        await waitFor(() => expect(syncAgent.spaces.data.spaceIds.length).toBe(1))
        await syncAgent.stop()
    })
    test('logIn with delegate', async () => {
        const authToken = await makeAuthToken(testUser.signer, { days: 1 })
        logger.log('authTokenStr', authToken)
        const signerContext = await makeSignerContextFromAuthToken(authToken)
        const syncAgent = new SyncAgent({ riverConfig: makeRiverConfig(), context: signerContext })
        await syncAgent.start()
        expect(syncAgent.riverConnection.authStatus.value).toBe(AuthStatus.ConnectedToRiver)
        expect(syncAgent.user.value.status).toBe('loaded')
        await waitFor(() => expect(syncAgent.spaces.data.spaceIds.length).toBe(1))
        await syncAgent.stop()
    })
})
