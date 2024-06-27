/**
 * @group with-entitilements
 */
import { AuthStatus } from './user/user'
import { dlogger } from '@river-build/dlog'
import { waitFor } from '../util.test'
import { MembershipOp } from '@river-build/proto'
import { TestUser } from './utils/testUser.test'

const logger = dlogger('csb:test:syncAgent')

describe('syncAgent.test.ts', () => {
    const testUser = new TestUser()

    test('syncAgent', async () => {
        const syncAgent = await testUser.makeSyncAgent()
        expect(syncAgent.user.value.status).toBe('loading')
        await syncAgent.start()
        expect(syncAgent.user.value.status).toBe('loaded')
        expect(syncAgent.user.data.initialized).toBe(false)
        expect(syncAgent.user.authStatus.value).toBe(AuthStatus.None)
        expect(Object.keys(syncAgent.user.streams.memberships.data.memberships).length).toBe(0)
        syncAgent.store.newTransactionGroup('createSpace')
        const { spaceId, defaultChannelId } = await syncAgent.user.createSpace(
            { spaceName: 'BlastOff' },
            testUser.signer,
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
        const syncAgent = await testUser.makeSyncAgent()
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
