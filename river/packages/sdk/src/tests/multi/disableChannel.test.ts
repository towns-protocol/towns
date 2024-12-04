/**
 * @group with-entitlements
 */

import { NoopRuleData } from '@river-build/web3'
import { expectUserCanJoinChannel, setupChannelWithCustomRole } from '../testUtils'

describe('disableChannel', () => {
    test('User cannot post events to a channel after it is disabled', async () => {
        const { alice, carol, bobProvider, aliceSpaceDapp, bobSpaceDapp, spaceId, channelId } =
            await setupChannelWithCustomRole(['alice', 'carol'], NoopRuleData)

        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // Disable the channel
        const txn = await bobSpaceDapp.setChannelAccess(
            spaceId,
            channelId!,
            true,
            bobProvider.wallet,
        )
        await bobProvider.waitForTransaction(txn.hash)
        const channelDetails = await bobSpaceDapp.getChannelDetails(spaceId, channelId!)
        expect(channelDetails).toBeDefined()
        expect(channelDetails!.disabled).toBeTruthy()

        // Wait 5 seconds for the positive channel enabled cache entry to expire
        await new Promise((f) => setTimeout(f, 5000))

        // Stream node should not allow the join
        // TODO: SpaceDapp also should not allow the join, but it currently does not
        // check for channel enabled. Fix and replace below logic with
        // await expectUserCanJoinChannel(
        //     carol,
        //     carolSpaceDapp,
        //     spaceId,
        //     channelId!,
        // )
        await expect(carol.joinStream(channelId!)).rejects.toThrow(/7:PERMISSION_DENIED/)
    })
})
