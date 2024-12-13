/**
 * @group with-entitlements
 */

import {
    getNftRuleData,
    twoNftRuleData,
    createRole,
    createChannel,
    setupWalletsAndContexts,
    createSpaceAndDefaultChannel,
    expectUserCanJoin,
    everyoneMembershipStruct,
    linkWallets,
    setupChannelWithCustomRole,
    expectUserCanJoinChannel,
    expectUserCannotJoinChannel,
} from '../../testUtils'
import { dlog } from '@river-build/dlog'
import {
    Address,
    Permission,
    TestERC721,
    LogicalOperationType,
    OperationType,
    Operation,
    CheckOperationType,
    treeToRuleData,
    encodeThresholdParams,
} from '@river-build/web3'

const log = dlog('csb:test:channelsWithComplexEntitlements')

describe('channelsWithComplexEntitlements', () => {
    test('User who satisfies only one role ruledata requirement can join channel', async () => {
        const {
            alice,
            bob,
            alicesWallet,
            aliceProvider,
            bobProvider,
            aliceSpaceDapp,
            bobSpaceDapp,
        } = await setupWalletsAndContexts()

        const { spaceId, defaultChannelId } = await createSpaceAndDefaultChannel(
            bob,
            bobSpaceDapp,
            bobProvider.wallet,
            'bob',
            await everyoneMembershipStruct(bobSpaceDapp, bob),
        )

        await expectUserCanJoin(
            spaceId,
            defaultChannelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        const testNft1Address = await TestERC721.getContractAddress('TestNFT1')
        const testNft2Address = await TestERC721.getContractAddress('TestNFT2')

        const { roleId: nft1RoleId, error: roleError } = await createRole(
            bobSpaceDapp,
            bobProvider,
            spaceId,
            'gated role',
            [Permission.Read],
            [],
            getNftRuleData(testNft1Address),
            bobProvider.wallet,
        )
        expect(roleError).toBeUndefined()

        const { roleId: nft2RoleId, error: roleError2 } = await createRole(
            bobSpaceDapp,
            bobProvider,
            spaceId,
            'gated role',
            [Permission.Read],
            [],
            getNftRuleData(testNft2Address),
            bobProvider.wallet,
        )
        expect(roleError2).toBeUndefined()

        // Create a channel gated by the both role in the space contract.
        const { channelId, error: channelError } = await createChannel(
            bobSpaceDapp,
            bobProvider,
            spaceId,
            'double-role-gated-channel',
            [nft1RoleId!.valueOf(), nft2RoleId!.valueOf()],
            bobProvider.wallet,
        )
        expect(channelError).toBeUndefined()

        // Then, establish a stream for the channel on the river node.
        const { streamId: channelStreamId } = await bob.createChannel(
            spaceId,
            'double-role-gated-channel',
            'user only needs a single role to get into this channel',
            channelId!,
        )
        expect(channelStreamId).toEqual(channelId)

        // Mint an NFT for alice so that she satisfies the second role
        await TestERC721.publicMint('TestNFT2', alicesWallet.address as Address)

        // Join alice to the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)
    })

    test('twoNftGateJoinPass', async () => {
        const testNft1Address = await TestERC721.getContractAddress('TestNFT1')
        const testNft2Address = await TestERC721.getContractAddress('TestNFT2')
        const { alice, bob, alicesWallet, aliceSpaceDapp, spaceId, channelId } =
            await setupChannelWithCustomRole([], twoNftRuleData(testNft1Address, testNft2Address))

        const aliceMintTx1 = TestERC721.publicMint('TestNFT1', alicesWallet.address as Address)
        const aliceMintTx2 = TestERC721.publicMint('TestNFT2', alicesWallet.address as Address)

        log('Minting nfts for alice')
        await Promise.all([aliceMintTx1, aliceMintTx2])

        log('expect that alice can join the channel')
        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('twoNftGateJoinPass - acrossLinkedWallets', async () => {
        const testNft1Address = await TestERC721.getContractAddress('TestNFT1')
        const testNft2Address = await TestERC721.getContractAddress('TestNFT2')
        const {
            alice,
            bob,
            alicesWallet,
            carolsWallet,
            aliceSpaceDapp,
            aliceProvider,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], twoNftRuleData(testNft1Address, testNft2Address))

        const aliceMintTx1 = TestERC721.publicMint('TestNFT1', alicesWallet.address as Address)
        const carolMintTx2 = TestERC721.publicMint('TestNFT2', carolsWallet.address as Address)

        log('Minting nfts for alice and carol')
        await Promise.all([aliceMintTx1, carolMintTx2])

        log("linking carols wallet to alice's wallet")
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        log('Alice should be able to join channel with one asset in carol wallet')
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('twoNftGateJoinFail', async () => {
        const testNft1Address = await TestERC721.getContractAddress('TestNFT1')
        const testNft2Address = await TestERC721.getContractAddress('TestNFT2')
        const { alice, aliceSpaceDapp, bob, alicesWallet, spaceId, channelId } =
            await setupChannelWithCustomRole([], twoNftRuleData(testNft1Address, testNft2Address))

        // Mint only one of the required NFTs for alice
        log('Minting only one of two required NFTs for alice')
        await TestERC721.publicMint('TestNFT1', alicesWallet.address as Address)

        log('expect that alice cannot join the channel')
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
    })

    test('OrOfTwoNftGateJoinPass', async () => {
        const testNft1Address = await TestERC721.getContractAddress('TestNFT1')
        const testNft2Address = await TestERC721.getContractAddress('TestNFT2')
        const { alice, bob, alicesWallet, aliceSpaceDapp, spaceId, channelId } =
            await setupChannelWithCustomRole(
                [],
                twoNftRuleData(testNft1Address, testNft2Address, LogicalOperationType.OR),
            )
        // join alice
        log('Minting an NFT for alice')
        await TestERC721.publicMint('TestNFT1', alicesWallet.address as Address)

        log('expect that alice can join the channel')
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('orOfTwoNftOrOneNftGateJoinPass', async () => {
        const testNft1Address = await TestERC721.getContractAddress('TestNFT1')
        const testNft2Address = await TestERC721.getContractAddress('TestNFT2')
        const testNft3Address = await TestERC721.getContractAddress('TestNFT3')
        const params = encodeThresholdParams({ threshold: 1n })
        const leftOperation: Operation = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC721,
            chainId: 31337n,
            contractAddress: testNft1Address,
            params,
        }

        const rightOperation: Operation = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC721,
            chainId: 31337n,
            contractAddress: testNft2Address,
            params,
        }
        const two: Operation = {
            opType: OperationType.LOGICAL,
            logicalType: LogicalOperationType.AND,
            leftOperation,
            rightOperation,
        }

        const root: Operation = {
            opType: OperationType.LOGICAL,
            logicalType: LogicalOperationType.OR,
            leftOperation: two,
            rightOperation: {
                opType: OperationType.CHECK,
                checkType: CheckOperationType.ERC721,
                chainId: 31337n,
                contractAddress: testNft3Address,
                params,
            },
        }

        const ruleData = treeToRuleData(root)
        const { alice, bob, alicesWallet, aliceSpaceDapp, spaceId, channelId } =
            await setupChannelWithCustomRole([], ruleData)

        log("Mint Alice's NFTs")
        const aliceMintTx1 = TestERC721.publicMint('TestNFT1', alicesWallet.address as Address)
        const aliceMintTx2 = TestERC721.publicMint('TestNFT2', alicesWallet.address as Address)
        await Promise.all([aliceMintTx1, aliceMintTx2])

        log('expect that alice can join the channel')
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })
})
