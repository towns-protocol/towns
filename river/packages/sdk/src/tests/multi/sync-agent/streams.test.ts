/**
 * @group with-entitlements
 */
import { dlogger } from '@river-build/dlog'
import { Bot } from '../../../sync-agent/utils/bot'
import { makeUniqueMediaStreamId, streamIdAsBytes } from '../../../id'

const logger = dlogger('csb:test:streams')

describe('streams.test.ts', () => {
    logger.log('start')
    const testUser = new Bot()

    beforeAll(async () => {
        await testUser.fundWallet()
    })

    test('stream exists', async () => {
        const syncAgent = await testUser.makeSyncAgent()
        await syncAgent.start()
        const { spaceId, defaultChannelId } = await syncAgent.spaces.createSpace(
            { spaceName: 'BlastOff' },
            testUser.signer,
        )
        const spaceExists = await syncAgent.riverConnection.riverRegistryDapp.streamExists(
            streamIdAsBytes(spaceId),
        )
        expect(spaceExists).toBe(true)

        const channelExists = await syncAgent.riverConnection.riverRegistryDapp.streamExists(
            streamIdAsBytes(defaultChannelId),
        )
        expect(channelExists).toBe(true)

        const notAStream = makeUniqueMediaStreamId()
        const notAStreamExists = await syncAgent.riverConnection.riverRegistryDapp.streamExists(
            streamIdAsBytes(notAStream),
        )
        expect(notAStreamExists).toBe(false)
    })
})
