/**
 * @group with-entitlements
 */

import { NoopRuleData } from '@river-build/web3'
import {
    expectUserCanJoin,
    createTownWithRequirements,
    createUserStreamAndSyncClient,
    everyoneMembershipStruct,
} from './util.test'

describe('disableSpace', () => {
    test('User cannot join a space after it is disabled', async () => {
        const {
            alice,
            carol,
            alicesWallet,
            aliceProvider,
            bobProvider,
            carolProvider,
            aliceSpaceDapp,
            bobSpaceDapp,
            carolSpaceDapp,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: true,
            users: [],
            ruleData: NoopRuleData,
        })

        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        // Disable the channel
        const txn = await bobSpaceDapp.setSpaceAccess(spaceId, true, bobProvider.wallet)
        await bobProvider.waitForTransaction(txn.hash)
        const spaceInfo = await bobSpaceDapp.getSpaceInfo(spaceId)
        expect(spaceInfo).toBeDefined()
        expect(spaceInfo?.disabled).toBeTruthy()

        // Wait 5 seconds for the positive space enabled cache entry to expire
        await new Promise((f) => setTimeout(f, 5000))

        // Have carol create a user stream attached to her own space.
        // Then she will attempt to join the space from the client, which should fail.
        await createUserStreamAndSyncClient(
            carol,
            carolSpaceDapp,
            'carol',
            await everyoneMembershipStruct(carolSpaceDapp, carol),
            carolProvider.wallet,
        )

        // Expect user cannot join the space.
        // TODO: the spaceDapp does not check for space enabled when evaluating if user
        // is eligible to join the space. Fix and replace the below logic with
        // await expectUserCannotJoinSpace(
        //     spaceId,
        //     carol,
        //     carolSpaceDapp,
        //     carolsWallet.address
        // )
        await expect(carol.joinStream(spaceId)).rejects.toThrow(/PERMISSION_DENIED/)
    })
})
