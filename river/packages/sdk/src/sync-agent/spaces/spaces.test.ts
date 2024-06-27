/**
 * @group with-entitilements
 */
import { dlogger } from '@river-build/dlog'
import { TestUser } from '../utils/testUser.test'

const logger = dlogger('csb:test:spaces')

describe('spaces.test.ts', () => {
    logger.log('start')
    const testUser = new TestUser()

    test('create/leave/join space', async () => {
        const syncAgent = await testUser.makeSyncAgent()
        await syncAgent.start()
        expect(syncAgent.spaces.value.status).not.toBe('loading')
        const { spaceId } = await syncAgent.user.createSpace(
            { spaceName: 'BlastOff' },
            testUser.signer,
        )
        expect(syncAgent.spaces.data.spaceIds.length).toBe(1)
        expect(syncAgent.spaces.data.spaceIds[0]).toBe(spaceId)
        // expect(bob.spaces.getSpaces().length).toBe(1)
        // expect(bob.spaces.getSpaces()[0].id).toBe(spaceId)
        // expect(bob.spaces.getSpace(spaceId)).toBeDefined()
        // const space = bob.spaces.getSpace(spaceId)!
        // expect(space.data.spaceIds.length).toBe(1)
        // await waitFor(() => expect(space.data.spaceIds.length).toBe(1)
        await syncAgent.stop()
    })
})
