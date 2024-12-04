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
    mockCrossChainCheckOp,
    createTownWithRequirements,
    expectUserCannotJoinSpace,
} from '../testUtils'
import { dlog } from '@river-build/dlog'
import { TestERC1155, TestCrossChainEntitlement, Address, treeToRuleData } from '@river-build/web3'

const log = dlog('csb:test:spaceWithV2Entitlements')

const test1155Name = 'TestERC1155'

describe('spaceWithV2Entitlements', () => {
    test('erc1155GateJoinPass', async () => {
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

    test('erc1155GateJoinFail', async () => {
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

    test('erc1155GateJoinPass - join as root, asset in linked wallet', async () => {
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

    test('erc1155GateJoinPass - join as linked wallet, asset in root wallet', async () => {
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

    test('erc1155GateJoinPass - assets across wallets', async () => {
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

    test('crossChainEntitlementGateJoinPass', async () => {
        const idParam = 1n
        const contractName = 'TestCrossChain'
        const ruleData = treeToRuleData(await mockCrossChainCheckOp(contractName, idParam))
        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId, channelId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData,
            })

        // set alice as entitled; she should be able to join.
        await TestCrossChainEntitlement.setIsEntitled(
            contractName,
            alicesWallet.address as Address,
            idParam,
            true,
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

    test('crossChainEntitlementGateJoinFail', async () => {
        const ruleData = treeToRuleData(await mockCrossChainCheckOp('TestCrossChain', 1n))
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

    test('crossChainEntitlementGateJoinPass - join as root, asset in linked wallet', async () => {
        const idParam = 1n
        const contractName = 'TestCrossChain'
        const ruleData = treeToRuleData(await mockCrossChainCheckOp(contractName, idParam))
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
        log("Setting carol's wallet as entitled")
        await TestCrossChainEntitlement.setIsEntitled(
            contractName,
            carolsWallet.address as Address,
            idParam,
            true,
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

    test('crossChainEntitlementGateJoinPass - join as linked wallet, asset in root wallet', async () => {
        const idParam = 1n
        const contractName = 'TestCrossChain'
        const ruleData = treeToRuleData(await mockCrossChainCheckOp(contractName, idParam))
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
        log("Setting carol's linked wallet as entitled")
        await TestCrossChainEntitlement.setIsEntitled(
            contractName,
            carolsWallet.address as Address,
            idParam,
            true,
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
