/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/**
 * @group with-entitilements
 */

import { dlogger } from '@river-build/dlog'
import { TestUser } from '../utils/testUser.test'

const logger = dlogger('csb:test:user')

describe('User.test.ts', () => {
    logger.log('start')
    const testUser = new TestUser()

    test('User initializes', async () => {
        const syncAgent = await testUser.makeSyncAgent()
        const user = syncAgent.user
        expect(user.data.id).toBe(testUser.userId)
        expect(user.data.initialized).toBe(false)
        expect(user.streams.memberships.data.initialized).toBe(false)
        expect(user.streams.inbox.data.initialized).toBe(false)
        expect(user.streams.deviceKeys.data.initialized).toBe(false)
        expect(user.streams.settings.data.initialized).toBe(false)

        await syncAgent.start()
        expect(user.data.id).toBe(testUser.userId)
        expect(user.data.initialized).toBe(false)
        expect(user.streams.memberships.data.initialized).toBe(false)
        expect(user.streams.inbox.data.initialized).toBe(false)
        expect(user.streams.deviceKeys.data.initialized).toBe(false)
        expect(user.streams.settings.data.initialized).toBe(false)

        const { spaceId } = await user.createSpace({ spaceName: 'bobs-space' }, testUser.signer)
        logger.log('created spaceId', spaceId)

        expect(user.data.initialized).toBe(true)
        expect(user.streams.memberships.data.initialized).toBe(true)
        expect(user.streams.inbox.data.initialized).toBe(true)
        expect(user.streams.deviceKeys.data.initialized).toBe(true)
        expect(user.streams.settings.data.initialized).toBe(true)
        await syncAgent.stop()
    })
    test('User loads from db', async () => {
        const syncAgent = await testUser.makeSyncAgent()
        const user = syncAgent.user
        expect(user.value.status).toBe('loading')

        await syncAgent.start()
        expect(user.value.status).toBe('loaded')
        expect(user.data.initialized).toBe(true)
        expect(user.streams.memberships.data.initialized).toBe(true)
        expect(user.streams.inbox.data.initialized).toBe(true)
        expect(user.streams.deviceKeys.data.initialized).toBe(true)
        expect(user.streams.settings.data.initialized).toBe(true)
        await syncAgent.stop()
    })
})
