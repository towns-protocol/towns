/**
 * @group with-entitlements
 */
import { dlogger } from '@river-build/dlog'
import { Bot } from '../utils/bot'
import { waitFor } from '../../util.test'

const logger = dlogger('csb:test:spaces')

describe('spaces.test.ts', () => {
    logger.log('start')
    const testUser = new Bot()

    test('create/leave/join space', async () => {
        await testUser.fundWallet()
        const syncAgent = await testUser.makeSyncAgent()
        await syncAgent.start()
        expect(syncAgent.spaces.value.status).not.toBe('loading')
        const { spaceId, defaultChannelId } = await syncAgent.spaces.createSpace(
            { spaceName: 'BlastOff' },
            testUser.signer,
        )
        expect(syncAgent.spaces.data.spaceIds.length).toBe(1)
        expect(syncAgent.spaces.data.spaceIds[0]).toBe(spaceId)
        expect(syncAgent.spaces.getSpace(spaceId)).toBeDefined()
        const space = syncAgent.spaces.getSpace(spaceId)!
        await waitFor(() => expect(space.value.status).not.toBe('loading'))
        await waitFor(() => expect(space.data.channelIds.length).toBe(1))
        expect(space.data.channelIds[0]).toBe(defaultChannelId)
        expect(space.getChannel(defaultChannelId)).toBeDefined()
        const channel = space.getChannel(defaultChannelId)
        expect(channel.data.isJoined).toBe(true)
        await channel.sendMessage('hello world')
        expect(channel.timeline.events.value.length).toBeGreaterThan(1)
        expect(channel.timeline.events.value.find((x) => x.text === 'hello world')).toBeDefined()
        await syncAgent.stop()
    })
})
