/**
 * @group with-entitlements
 */

import { dlogger } from '@river-build/dlog'
import { Bot } from '../../../sync-agent/utils/bot'

const logger = dlogger('csb:test:user')

describe('User.test.ts', () => {
    logger.log('start')
    const testUser = new Bot()

    beforeEach(async () => {
        await testUser.fundWallet()
    })

    test('User initializes', async () => {
        const syncAgent = await testUser.makeSyncAgent()
        const riverConnection = syncAgent.riverConnection
        const user = syncAgent.user
        const spaces = syncAgent.spaces
        expect(user.data.id).toBe(testUser.userId)
        expect(riverConnection.data.userExists).toBe(false)
        expect(user.memberships.data.initialized).toBe(false)
        expect(user.inbox.data.initialized).toBe(false)
        expect(user.deviceKeys.data.initialized).toBe(false)
        expect(user.settings.data.initialized).toBe(false)

        await syncAgent.start()
        expect(user.data.id).toBe(testUser.userId)
        expect(riverConnection.data.userExists).toBe(false)
        expect(user.memberships.data.initialized).toBe(false)
        expect(user.inbox.data.initialized).toBe(false)
        expect(user.deviceKeys.data.initialized).toBe(false)
        expect(user.settings.data.initialized).toBe(false)

        const { spaceId } = await spaces.createSpace({ spaceName: 'bobs-space' }, testUser.signer)
        logger.log('created spaceId', spaceId)

        expect(riverConnection.data.userExists).toBe(true)
        expect(user.memberships.data.initialized).toBe(true)
        expect(user.inbox.data.initialized).toBe(true)
        expect(user.deviceKeys.data.initialized).toBe(true)
        expect(user.settings.data.initialized).toBe(true)
        await syncAgent.stop()
    })
    test('User loads from db', async () => {
        const syncAgent = await testUser.makeSyncAgent()
        const riverConnection = syncAgent.riverConnection
        const user = syncAgent.user
        expect(user.value.status).toBe('loading')

        await syncAgent.start()
        expect(user.value.status).toBe('loaded')
        expect(riverConnection.data.userExists).toBe(true)
        expect(user.memberships.data.initialized).toBe(true)
        expect(user.inbox.data.initialized).toBe(true)
        expect(user.deviceKeys.data.initialized).toBe(true)
        expect(user.settings.data.initialized).toBe(true)
        await syncAgent.stop()
    })
})
