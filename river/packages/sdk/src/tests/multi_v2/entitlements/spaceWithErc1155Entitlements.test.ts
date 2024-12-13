/**
 * @group with-v2-entitlements
 * @description join space tests to run on v2 spaces only
 */

import {
    everyoneMembershipStruct,
    createUserStreamAndSyncClient,
    expectUserCanJoin,
    linkWallets,
    erc1155CheckOp,
    createTownWithRequirements,
    expectUserCannotJoinSpace,
} from '../../testUtils'
import { dlog } from '@river-build/dlog'
import { TestERC1155, Address, treeToRuleData } from '@river-build/web3'

const log = dlog('csb:test:spaceWithErc1155Entitlements')

const test1155Name = 'TestERC1155'

describe('spaceWithErc1155Entitlements', () => {
    test('erc1155 gate join pass', async () => {
        const ruleData = treeToRuleData(
            await erc1155CheckOp(test1155Name, BigInt(TestERC1155.TestTokenId.Bronze), 1n),
        )

        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId, channelId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData,
            })

        // mint and join alice
        log('Minting 1 Bronze ERC1155 token for alice')
        await TestERC1155.publicMint(
            test1155Name,
            alicesWallet.address as Address,
            TestERC1155.TestTokenId.Bronze,
        )

        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('erc1155 gate join fail', async () => {
        const ruleData = treeToRuleData(
            await erc1155CheckOp(test1155Name, BigInt(TestERC1155.TestTokenId.Bronze), 1n),
        )

        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData,
            })

        // Have alice create her own space so she can initialize her user stream.
        // Then she will attempt to join the space from the client, which should fail.
        await createUserStreamAndSyncClient(
            alice,
            aliceSpaceDapp,
            'alice',
            await everyoneMembershipStruct(aliceSpaceDapp, alice),
            aliceProvider.wallet,
        )

        await expectUserCannotJoinSpace(spaceId, alice, aliceSpaceDapp, alicesWallet.address)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('erc1155 gate join pass - join as root, asset in linked wallet', async () => {
        const ruleData = treeToRuleData(
            await erc1155CheckOp(test1155Name, BigInt(TestERC1155.TestTokenId.Bronze), 1n),
        )
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            alicesWallet,
            carolsWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: false,
            users: [],
            ruleData: ruleData,
        })

        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // join alice
        log('Minting 1 Bronze ERC1155 token for carols wallet, which is linked to alices wallet')
        await TestERC1155.publicMint(
            test1155Name,
            carolsWallet.address as Address,
            TestERC1155.TestTokenId.Bronze,
        )

        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('erc1155 gate join pass - join as linked wallet, asset in root wallet', async () => {
        const ruleData = treeToRuleData(
            await erc1155CheckOp(test1155Name, BigInt(TestERC1155.TestTokenId.Bronze), 1n),
        )
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            alicesWallet,
            carolsWallet,
            carolProvider,
            carolSpaceDapp,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: false,
            users: [],
            ruleData: ruleData,
        })

        log("Joining alice's wallet as a linked wallet to carols root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        // join alice
        log('Minting 1 Bronze ERC1155 token for carols wallet, which is the root of alices wallet')
        await TestERC1155.publicMint(
            test1155Name,
            carolsWallet.address as Address,
            TestERC1155.TestTokenId.Bronze,
        )

        log('expect that alice can join the space')
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('erc1155 gate join pass - assets across wallets', async () => {
        const ruleData = treeToRuleData(
            await erc1155CheckOp(test1155Name, BigInt(TestERC1155.TestTokenId.Bronze), 2n),
        )
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            alicesWallet,
            carolsWallet,
            carolProvider,
            carolSpaceDapp,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: false,
            users: [],
            ruleData: ruleData,
        })

        log("Joining alice's wallet as a linked wallet to carols root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        // join alice
        log('Minting a bronze ERC1155 token for each wallet')
        await TestERC1155.publicMint(
            test1155Name,
            carolsWallet.address as Address,
            TestERC1155.TestTokenId.Bronze,
        )
        await TestERC1155.publicMint(
            test1155Name,
            alicesWallet.address as Address,
            TestERC1155.TestTokenId.Bronze,
        )

        log('expect that alice can join the space')
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })
})
