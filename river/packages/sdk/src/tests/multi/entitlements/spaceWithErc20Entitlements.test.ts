/**
 * @group with-entitlements
 */

import {
    createTownWithRequirements,
    createUserStreamAndSyncClient,
    everyoneMembershipStruct,
    expectUserCannotJoinSpace,
    expectUserCanJoin,
    linkWallets,
    erc20CheckOp,
} from '../../testUtils'
import { dlog } from '@river-build/dlog'
import { Address, TestERC20, treeToRuleData } from '@river-build/web3'

const log = dlog('csb:test:spaceWithErc20Entitlements')

describe('spaceWithErc20Entitlements', () => {
    test('erc20 gate join pass', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))

        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId, channelId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData,
            })

        // join alice
        log('Minting 100 ERC20 tokens for alice')
        await TestERC20.publicMint('TestERC20', alicesWallet.address as Address, 100)

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

    test('erc20 gate join fail', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))

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

    test('erc20 gate join pass - join as root, asset in linked wallet', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))
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
        log('Minting 50 ERC20 tokens for carols wallet, which is linked to alices wallet')
        await TestERC20.publicMint('TestERC20', carolsWallet.address as Address, 50)

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

    test('erc20 gate join pass - join as linked wallet, asset in root wallet', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))
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
        log('Minting an NFT for carols wallet, which is the root to alices wallet')
        await TestERC20.publicMint('TestERC20', carolsWallet.address as Address, 50)

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

    test('erc20 gate join pass - assets across wallets', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))
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
        log('Minting an NFT for carols wallet, which is the root to alices wallet')
        await TestERC20.publicMint('TestERC20', carolsWallet.address as Address, 25)
        await TestERC20.publicMint('TestERC20', alicesWallet.address as Address, 25)

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
