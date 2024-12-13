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
    getNftRuleData,
} from '../../testUtils'
import { dlog } from '@river-build/dlog'
import { Address, TestERC721 } from '@river-build/web3'

const log = dlog('csb:test:spaceWithErc721Entitlements')

describe('spaceWithErc721Entitlements', () => {
    let testNft1Address: string
    beforeAll(async () => {
        testNft1Address = await TestERC721.getContractAddress('TestNFT1')
    })
    test('erc721 gate join pass - join as root, asset in linked wallet', async () => {
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
            ruleData: getNftRuleData(testNft1Address as Address),
        })

        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // join alice
        log('Minting an NFT for carols wallet, which is linked to alices wallet')
        await TestERC721.publicMint('TestNFT1', carolsWallet.address as Address)

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

    test('erc721 gate join pass - join as linked wallet, asset in root wallet', async () => {
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
            ruleData: getNftRuleData(testNft1Address as Address),
        })

        log("Joining alice's wallet as a linked wallet to carols root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        // join alice
        log('Minting an NFT for carols wallet, which is the root to alices wallet')
        await TestERC721.publicMint('TestNFT1', carolsWallet.address as Address)

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

    test('erc721 gate join pass', async () => {
        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId, channelId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData: getNftRuleData(testNft1Address as Address),
            })

        // join alice
        log('Minting an NFT for alice')
        await TestERC721.publicMint('TestNFT1', alicesWallet.address as Address)

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

    test('erc721 gate join fail', async () => {
        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData: getNftRuleData(testNft1Address as Address),
            })

        log('Alice about to attempt to join space', { alicesUserId: alice.userId })
        const { issued } = await aliceSpaceDapp.joinSpace(
            spaceId,
            alicesWallet.address,
            aliceProvider.wallet,
        )
        expect(issued).toBe(false)

        // Have alice create a user stream attached to her own space.
        // Then she will attempt to join the space from the client, which should fail.
        await createUserStreamAndSyncClient(
            alice,
            aliceSpaceDapp,
            'alice',
            await everyoneMembershipStruct(aliceSpaceDapp, alice),
            aliceProvider.wallet,
        )

        // Alice cannot join the space on the stream node.
        await expectUserCannotJoinSpace(spaceId, alice, aliceSpaceDapp, alicesWallet.address)

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
    })
})
