/**
 * @group with-entitlements
 */

import {
    createTownWithRequirements,
    createUserStreamAndSyncClient,
    everyoneMembershipStruct,
    expectUserCannotJoinSpace,
    expectUserCanJoin,
    setupWalletsAndContexts,
} from '../../testUtils'
import { dlog } from '@river-build/dlog'
import { Address, TestERC721, createExternalNFTStruct } from '@river-build/web3'

const log = dlog('csb:test:spaceWithThreeNestedEntitlement')

describe('spaceWithThreeNestedEntitlement', () => {
    // This test takes almost one minute to run in CI and therefore gets its own file.
    test('user with only one entitlement from 3-nested NFT rule data can join space', async () => {
        const testNft1 = 'TestNft1'
        const testNft2 = 'TestNft2'
        const testNft3 = 'TestNft3'
        const testNftAddress = await TestERC721.getContractAddress(testNft1)
        const testNftAddress2 = await TestERC721.getContractAddress(testNft2)
        const testNftAddress3 = await TestERC721.getContractAddress(testNft3)

        const ruleData = createExternalNFTStruct([testNftAddress, testNftAddress2, testNftAddress3])

        const {
            alice,
            bob,
            carol,
            aliceSpaceDapp,
            aliceProvider,
            carolProvider,
            carolSpaceDapp,
            alicesWallet,
            carolsWallet,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: false,
            users: [],
            ruleData,
        })
        // Set up additional users to test single ownership of all three nfts.
        const {
            alice: dave,
            alicesWallet: davesWallet,
            aliceSpaceDapp: daveSpaceDapp,
            aliceProvider: daveProvider,
            carol: emily,
            carolProvider: emilyProvider,
            carolSpaceDapp: emilySpaceDapp,
            carolsWallet: emilyWallet,
        } = await setupWalletsAndContexts()

        // Have alice create her own space so she can initialize her user stream.
        // Then she will attempt to join the space from herclient, which should fail.
        await createUserStreamAndSyncClient(
            alice,
            aliceSpaceDapp,
            'alice',
            await everyoneMembershipStruct(aliceSpaceDapp, alice),
            aliceProvider.wallet,
        )
        await expectUserCannotJoinSpace(spaceId, alice, aliceSpaceDapp, alicesWallet.address)

        await TestERC721.publicMint(testNft1, carolsWallet.address as Address)
        await expectUserCanJoin(
            spaceId,
            channelId,
            'carol',
            carol,
            carolSpaceDapp,
            carolsWallet.address,
            carolProvider.wallet,
        )

        await TestERC721.publicMint(testNft2, davesWallet.address as Address)
        await expectUserCanJoin(
            spaceId,
            channelId,
            'dave',
            dave,
            daveSpaceDapp,
            davesWallet.address,
            daveProvider.wallet,
        )

        await TestERC721.publicMint(testNft3, emilyWallet.address as Address)
        await expectUserCanJoin(
            spaceId,
            channelId,
            'emily',
            emily,
            emilySpaceDapp,
            emilyWallet.address,
            emilyProvider.wallet,
        )

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        await carol.stopSync()
        await dave.stopSync()
        await emily.stopSync()
        log('Done', Date.now() - doneStart)
    })
})
