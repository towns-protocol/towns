/**
 * @group with-entitlements
 */

import {
    getChannelMessagePayload,
    waitFor,
    getNftRuleData,
    twoNftRuleData,
    createRole,
    createChannel,
    setupWalletsAndContexts,
    createSpaceAndDefaultChannel,
    expectUserCanJoin,
    everyoneMembershipStruct,
    linkWallets,
    getXchainConfigForTesting,
    erc20CheckOp,
    setupChannelWithCustomRole,
    expectUserCanJoinChannel,
    expectUserCannotJoinChannel,
    ethBalanceCheckOp,
} from '../testUtils'
import { MembershipOp } from '@river-build/proto'
import { dlog } from '@river-build/dlog'
import {
    Address,
    NoopRuleData,
    Permission,
    TestERC721,
    TestERC20,
    TestEthBalance,
    LogicalOperationType,
    OperationType,
    Operation,
    CheckOperationType,
    treeToRuleData,
    encodeThresholdParams,
    createExternalNFTStruct,
} from '@river-build/web3'
import { make_MemberPayload_KeySolicitation } from '../../types'

const log = dlog('csb:test:channelsWithEntitlements')
const oneHalfEth = BigInt(5e17)
const oneEth = oneHalfEth * BigInt(2)
const twoEth = oneEth * BigInt(2)
const gtTwoEth = twoEth + BigInt(1)

describe('channelsWithEntitlements', () => {
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

    test("READ-only user cannot write or react to a channel's messages", async () => {
        const { alice, bob, aliceSpaceDapp, spaceId, channelId } = await setupChannelWithCustomRole(
            ['alice'],
            NoopRuleData,
        )

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const { eventId: refEventId } = await bob.sendMessage(channelId!, 'Hello, world!')

        // React to Bob's message not allowed.
        await expect(
            alice.sendChannelMessage_Reaction(channelId!, { reaction: '👍', refEventId }),
        ).rejects.toThrow(/*not entitled to add message to channel*/)

        // Reply to Bob's message not allowed.
        await expect(
            alice.sendChannelMessage_Text(channelId!, {
                content: {
                    body: 'Hello, world!',
                    mentions: [],
                    attachments: [],
                },
                threadId: refEventId, // reply to Bob's message
            }),
        ).rejects.toThrow(/*not entitled to add message to channel*/)

        // Top-level post not allowed.
        await expect(
            alice.sendMessage(channelId!, 'Hello, world!'),
        ).rejects.toThrow(/*not entitled to add message to channel*/)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('READ + REACT user can react and redact reactions, but cannot write (top-level or reply)', async () => {
        const { alice, bob, aliceSpaceDapp, spaceId, channelId } = await setupChannelWithCustomRole(
            ['alice'],
            NoopRuleData,
            [Permission.Read, Permission.React],
        )

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const { eventId: refEventId } = await bob.sendMessage(channelId!, 'Hello, world!')

        // Reacting to Bob's message should be allowed. Redacting the reaction should also be allowed.
        const { eventId } = await alice.sendChannelMessage_Reaction(channelId!, {
            reaction: '👍',
            refEventId,
        })
        expect(eventId).toBeDefined()
        await expect(
            alice.sendChannelMessage_Redaction(channelId!, {
                refEventId: eventId,
            }),
        ).resolves.not.toThrow()

        // Replying to Bob's message should not be allowed.
        await expect(
            alice.sendChannelMessage_Text(channelId!, {
                content: {
                    body: 'Hello, world!',
                    mentions: [],
                    attachments: [],
                },
                threadId: refEventId, // reply to Bob's message
            }),
        ).rejects.toThrow(/*not entitled to add message to channel*/)

        // Cannot make a top-level post to the channel.
        await expect(
            alice.sendMessage(channelId!, 'Hello, world!'),
        ).rejects.toThrow(/*not entitled to add message to channel*/)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    // In practice we would never have a user with only write permissions, but this is a good test
    // to make sure our permissions are non-overlapping.
    test('WRITE user can write (top-level plus reply), react', async () => {
        const { alice, bob, aliceSpaceDapp, spaceId, channelId } = await setupChannelWithCustomRole(
            ['alice'],
            NoopRuleData,
            [Permission.Read, Permission.Write],
        )

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const { eventId: refEventId } = await bob.sendMessage(channelId!, 'Hello, world!')

        // Reacting to Bob's message should be allowed. Redacting the reaction should also be allowed.
        const { eventId } = await alice.sendChannelMessage_Reaction(channelId!, {
            reaction: '👍',
            refEventId,
        })
        expect(eventId).toBeDefined()
        await expect(
            alice.sendChannelMessage_Redaction(channelId!, {
                refEventId: eventId,
            }),
        ).resolves.not.toThrow()

        // Replying to Bob's message should be allowed.
        await expect(
            alice.sendChannelMessage_Text(channelId!, {
                content: {
                    body: 'Hello, world!',
                    mentions: [],
                    attachments: [],
                },
                threadId: refEventId, // reply to Bob's message
            }),
        ).resolves.not.toThrow()

        // Top-level post currently allowed.
        await expect(alice.sendMessage(channelId!, 'Hello, world!')).resolves.not.toThrow()

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('REACT + WRITE user can do all WRITE user can do', async () => {
        const { alice, bob, aliceSpaceDapp, spaceId, channelId } = await setupChannelWithCustomRole(
            ['alice'],
            NoopRuleData,
            [Permission.Read, Permission.React, Permission.Write],
        )

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const { eventId: refEventId } = await bob.sendMessage(channelId!, 'Hello, world!')

        // Reacting to Bob's message should be allowed. Redacting the reaction should also be allowed.
        const { eventId } = await alice.sendChannelMessage_Reaction(channelId!, {
            reaction: '👍',
            refEventId,
        })
        expect(eventId).toBeDefined()
        await expect(
            alice.sendChannelMessage_Redaction(channelId!, {
                refEventId: eventId,
            }),
        ).resolves.not.toThrow()

        // Replying to Bob's message should be allowed.
        await expect(
            alice.sendChannelMessage_Text(channelId!, {
                content: {
                    body: 'Hello, world!',
                    mentions: [],
                    attachments: [],
                },
                threadId: refEventId, // reply to Bob's message
            }),
        ).resolves.not.toThrow()

        // Top-level post currently allowed.
        await expect(alice.sendMessage(channelId!, 'Hello, world!')).resolves.not.toThrow()

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('userEntitlementPass', async () => {
        const { alice, bob, aliceSpaceDapp, spaceId, channelId } = await setupChannelWithCustomRole(
            ['alice'],
            NoopRuleData,
        )

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('userEntitlementFail', async () => {
        const { alice, aliceSpaceDapp, bob, spaceId, channelId } = await setupChannelWithCustomRole(
            ['carol'],
            NoopRuleData,
        )

        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('banned user not entitled to channel', async () => {
        const {
            alice,
            alicesWallet,
            aliceSpaceDapp,
            bob,
            bobSpaceDapp,
            bobProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole(['alice'], NoopRuleData)

        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const tx = await bobSpaceDapp.banWalletAddress(
            spaceId,
            alicesWallet.address,
            bobProvider.wallet,
        )
        await tx.wait()

        // Wait 5 seconds for the positive auth cache on the client to expire
        await new Promise((f) => setTimeout(f, 5000))

        await expect(
            aliceSpaceDapp.isEntitledToChannel(
                spaceId,
                channelId!,
                alice.userId,
                Permission.Read,
                getXchainConfigForTesting(),
            ),
        ).resolves.toBeFalsy()

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('userEntitlementPass - join as root, linked wallet whitelisted', async () => {
        const { alice, aliceSpaceDapp, aliceProvider, carolProvider, bob, spaceId, channelId } =
            await setupChannelWithCustomRole(['carol'], NoopRuleData)

        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('userEntitlementPass - join as linked wallet, root wallet whitelisted', async () => {
        const {
            alice,
            aliceSpaceDapp,
            carolSpaceDapp,
            aliceProvider,
            carolProvider,
            bob,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole(['carol'], NoopRuleData)

        // Link alice's wallet to Carol's wallet as root
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done linked-wallet-whitelist', Date.now() - doneStart)
    })

    test('oneNftGateJoinPass - join as root, asset in linked wallet', async () => {
        const testNft1Address = await TestERC721.getContractAddress('TestNFT1')
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            carolsWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], getNftRuleData(testNft1Address))

        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Validate alice cannot join the channel
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // Mint the needed asset to Alice's linked wallet
        log('Minting an NFT for carols wallet, which is linked to alices wallet')
        await TestERC721.publicMint('TestNFT1', carolsWallet.address as Address)

        // Wait 2 seconds for the negative auth cache to expire
        await new Promise((f) => setTimeout(f, 2000))

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('oneNftGateJoinPass - join as linked wallet, asset in root wallet', async () => {
        const testNft1Address = await TestERC721.getContractAddress('TestNFT1')
        const {
            alice,
            bob,
            aliceSpaceDapp,
            carolSpaceDapp,
            aliceProvider,
            carolsWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], getNftRuleData(testNft1Address))

        log("Joining alice's wallet as a linked wallet to carols root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        log('Minting an NFT for carols wallet, which is the root to alices wallet')
        await TestERC721.publicMint('TestNFT1', carolsWallet.address as Address)

        log('expect that alice can join the space')
        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('oneNftGateJoinPass', async () => {
        const testNftAddress = await TestERC721.getContractAddress('TestNFT')
        const { alice, alicesWallet, aliceSpaceDapp, bob, spaceId, channelId } =
            await setupChannelWithCustomRole([], getNftRuleData(testNftAddress))

        // Alice initially cannot join because she has no nft
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // Mint an nft for alice - she should be able to join now
        await TestERC721.publicMint('TestNFT', alicesWallet.address as Address)

        // Wait 2 seconds for the negative auth cache to expire
        await new Promise((f) => setTimeout(f, 2000))

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        await bob.stopSync()
        await alice.stopSync()
    })

    test('user with only one entitlement from 3-nested NFT rule data can join channel', async () => {
        const testNft1 = 'TestNft1'
        const testNft2 = 'TestNft2'
        const testNft3 = 'TestNft3'
        const testNftAddress = await TestERC721.getContractAddress(testNft1)
        const testNftAddress2 = await TestERC721.getContractAddress(testNft2)
        const testNftAddress3 = await TestERC721.getContractAddress(testNft3)

        const ruleData = createExternalNFTStruct([testNftAddress, testNftAddress2, testNftAddress3])
        const {
            alice,
            alicesWallet,
            aliceSpaceDapp,
            bob,
            carol,
            carolsWallet,
            carolSpaceDapp,
            spaceId,
            defaultChannelId,
            channelId,
        } = await setupChannelWithCustomRole([], ruleData)

        // Set up additional users
        const {
            alice: dave,
            alicesWallet: davesWallet,
            aliceSpaceDapp: daveSpaceDapp,
            aliceProvider: daveProvider,
        } = await setupWalletsAndContexts()
        // Add Dave to the space
        await expectUserCanJoin(
            spaceId,
            defaultChannelId,
            'dave',
            dave,
            daveSpaceDapp,
            davesWallet.address,
            daveProvider.wallet,
        )

        // Alice initially cannot join because she has no nft
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // Alice, Carol and Dave will each have one of the three NFTs, all should be able to join.
        // Mint an nft for alice - she should be able to join now
        await TestERC721.publicMint(testNft1, alicesWallet.address as Address)

        // Wait 2 seconds for the negative auth cache on the client to expire
        await new Promise((f) => setTimeout(f, 2000))

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // Mint an nft for carol - she should be able to join now
        await TestERC721.publicMint(testNft2, carolsWallet.address as Address)

        // Validate carol can join the channel
        await expectUserCanJoinChannel(carol, carolSpaceDapp, spaceId, channelId!)

        // Mint an nft for dave - he should be able to join now
        await TestERC721.publicMint(testNft3, davesWallet.address as Address)

        // Validate dave can join the channel
        await expectUserCanJoinChannel(dave, daveSpaceDapp, spaceId, channelId!)

        await bob.stopSync()
        await alice.stopSync()
        await carol.stopSync()
        await dave.stopSync()
    })

    test('user booted on key request after entitlement loss', async () => {
        const testNftAddress = await TestERC721.getContractAddress('TestNFT')
        const { alice, alicesWallet, aliceSpaceDapp, bob, spaceId, channelId } =
            await setupChannelWithCustomRole([], getNftRuleData(testNftAddress))

        // Mint an nft for alice - she should be able to join now
        const tokenId = await TestERC721.publicMint('TestNFT', alicesWallet.address as Address)

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const channelStream = await bob.waitForStream(channelId!)
        // Validate Alice is member of the channel
        await waitFor(() =>
            channelStream.view.membershipContent.isMember(MembershipOp.SO_JOIN, alice.userId),
        )

        // Burn Alice's NFT and validate her zero balance. She should now fail an entitlement check for the
        // channel.
        await TestERC721.burn('TestNFT', tokenId)
        await expect(
            TestERC721.balanceOf('TestNFT', alicesWallet.address as Address),
        ).resolves.toBe(0)

        // Wait 5 seconds for the positive auth cache to expire
        await new Promise((f) => setTimeout(f, 5000))

        // Have alice solicit keys in the channel where she just lost entitlements.
        // This key solicitation should fail because she no longer has the required NFT.
        // Additionally, she should be removed from the channel.
        const payload = make_MemberPayload_KeySolicitation({
            deviceKey: 'alice-new-device',
            sessionIds: [],
            fallbackKey: 'alice-fallback-key',
            isNewDevice: true,
        })
        await expect(alice.makeEventAndAddToStream(channelId!, payload)).rejects.toThrow(
            /7:PERMISSION_DENIED/,
        )

        // Alice's user stream should reflect that she is no longer a member of the channel.
        // TODO why no linter complain with no await here?
        const aliceUserStream = await alice.waitForStream(alice.userStreamId!)
        await waitFor(() =>
            expect(
                aliceUserStream.view.userContent.isMember(channelId!, MembershipOp.SO_LEAVE),
            ).toBeTruthy(),
        )
        await waitFor(() =>
            expect(
                channelStream.view.membershipContent.isMember(MembershipOp.SO_LEAVE, alice.userId),
            ).toBeTruthy(),
        )

        // Alice cannot rejoin the stream.
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        await bob.stopSync()
        await alice.stopSync()
    })

    test('user cannot post after entitlement loss', async () => {
        const testNftAddress = await TestERC721.getContractAddress('TestNFT')
        const { alice, alicesWallet, aliceSpaceDapp, bob, spaceId, channelId } =
            await setupChannelWithCustomRole([], getNftRuleData(testNftAddress), [
                Permission.Read,
                Permission.Write,
            ])

        // Mint an nft for alice - she should be able to join now
        const tokenId = await TestERC721.publicMint('TestNFT', alicesWallet.address as Address)

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const channelStream = await bob.waitForStream(channelId!)
        // Validate Alice is member of the channel
        await waitFor(() =>
            channelStream.view.membershipContent.isMember(MembershipOp.SO_JOIN, alice.userId),
        )

        // Burn Alice's NFT and validate her zero balance. She should now fail an entitlement check for the
        // channel.
        await TestERC721.burn('TestNFT', tokenId)
        await expect(
            TestERC721.balanceOf('TestNFT', alicesWallet.address as Address),
        ).resolves.toBe(0)

        // Wait 5 seconds for the positive auth cache to expire
        await new Promise((f) => setTimeout(f, 5000))

        // Alice should not be able to post to the channel after losing entitlements.
        // However she remains a member of the stream because this message is never sent by the
        // client.
        await expect(
            alice.sendMessage(channelId!, 'Message after entitlement loss'),
        ).rejects.toThrow(/*not entitled to add message to channel*/)

        await bob.stopSync()
        await alice.stopSync()
    })

    test('oneNftGateJoinFail', async () => {
        const testNft1Address = await TestERC721.getContractAddress('TestNFT1')
        const { alice, aliceSpaceDapp, bob, spaceId, channelId } = await setupChannelWithCustomRole(
            [],
            getNftRuleData(testNft1Address),
        )

        // Alice has no NFTs, so she should not be able to join the channel
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
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

    test('erc20 gate join pass', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))

        const { alice, bob, alicesWallet, aliceSpaceDapp, spaceId, channelId } =
            await setupChannelWithCustomRole([], ruleData)

        await TestERC20.publicMint('TestERC20', alicesWallet.address as Address, 100)

        log('expect that alice can join the channel')
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('erc20 gate join fail', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))

        const { alice, bob, aliceSpaceDapp, spaceId, channelId } = await setupChannelWithCustomRole(
            [],
            ruleData,
        )

        log('expect that alice cannot join the channel')
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('ERC20 gate join pass - join as root, asset in linked wallet', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            carolsWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], ruleData)

        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Validate alice cannot join the channel
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // Mint the needed asset to Alice's linked wallet
        log('Minting 50 ERC20 tokens for carols wallet, which is linked to alices wallet')
        await TestERC20.publicMint('TestERC20', carolsWallet.address as Address, 50)

        // Wait 2 seconds for the negative auth cache to expire
        await new Promise((f) => setTimeout(f, 2000))

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('ERC20 Gate Join Pass - join as linked wallet, assets in root wallet', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))
        const {
            alice,
            bob,
            aliceSpaceDapp,
            carolSpaceDapp,
            aliceProvider,
            carolsWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], ruleData)

        log("Joining alice's wallet as a linked wallet to carols root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        log('Minting an NFT for carols wallet, which is the root to alices wallet')
        await TestERC20.publicMint('TestERC20', carolsWallet.address as Address, 50)

        log('expect that alice can join the channel')
        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('ERC20 Gate Join Pass - assets split across wallets', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))
        const {
            alice,
            bob,
            aliceSpaceDapp,
            carolSpaceDapp,
            aliceProvider,
            carolsWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], ruleData)

        log("Joining alice's wallet as a linked wallet to carol's root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        log("Minting an NFT for carol's wallet, which is the root to alice's wallet")
        await TestERC20.publicMint('TestERC20', carolsWallet.address as Address, 25)
        await TestERC20.publicMint('TestERC20', aliceProvider.wallet.address as Address, 25)

        log('expect that alice can join the space')
        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gate pass', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(oneEth))

        const { alice, bob, alicesWallet, aliceSpaceDapp, spaceId, channelId } =
            await setupChannelWithCustomRole([], ruleData)

        await Promise.all([TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneEth)])

        log('expect that alice can join the channel')
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gate pass - across networks', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(oneEth))

        const { alice, bob, alicesWallet, aliceSpaceDapp, spaceId, channelId } =
            await setupChannelWithCustomRole([], ruleData)

        await Promise.all([
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneHalfEth),
            TestEthBalance.setRiverBalance(alicesWallet.address as Address, oneHalfEth),
        ])

        log('expect that alice can join the channel')
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gate fail', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(oneEth))

        const { alice, bob, alicesWallet, aliceSpaceDapp, spaceId, channelId } =
            await setupChannelWithCustomRole([], ruleData)

        // alice's base wallet may need to be explicitly set to zero to compensate for wallet funding in
        // initialization methods.
        await Promise.all([TestEthBalance.setBaseBalance(alicesWallet.address as Address, 0n)])

        log('expect that alice cannot join the channel (has no ETH)')
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gate join pass - join as root, linked wallet entitled', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(oneEth))
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            carolsWallet,
            alicesWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], ruleData)

        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Explicitly set wallet balances to 0
        await Promise.all([
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, 0n),
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, 0n),
        ])

        // Validate alice cannot join the channel
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        await Promise.all([
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, oneHalfEth),
            TestEthBalance.setRiverBalance(carolsWallet.address as Address, oneHalfEth),
        ])

        // Wait 2 seconds for the negative auth cache to expire
        await new Promise((f) => setTimeout(f, 2000))

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gated join pass - join as linked wallet, assets in root wallet', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(twoEth))
        const {
            alice,
            bob,
            aliceSpaceDapp,
            carolSpaceDapp,
            aliceProvider,
            alicesWallet,
            carolsWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], ruleData)

        log("Joining alice's wallet as a linked wallet to carol's root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        log("Setting carol and alice's wallet balances to 1ETH and 0, respectively")
        // Carol's cumulative balance across wallets: 2ETH
        // Alice's cumulative balance: 0
        await Promise.all([
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, oneEth),
            TestEthBalance.setRiverBalance(carolsWallet.address as Address, oneEth),
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, 0n),
        ])

        log('expect that alice can join the channel')
        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gate join pass - assets across wallets and networks', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(twoEth))
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            carolsWallet,
            alicesWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], ruleData)

        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Set wallet balances to 0
        await Promise.all([
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, oneHalfEth),
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneHalfEth),
            TestEthBalance.setRiverBalance(carolsWallet.address as Address, oneHalfEth),
            TestEthBalance.setRiverBalance(alicesWallet.address as Address, oneHalfEth),
        ])

        // Validate alice can join the channel
        log('expect that alice can join the channel')
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gate join fail - insufficient assets across wallets', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(gtTwoEth))
        const {
            alice,
            bob,
            carol,
            aliceSpaceDapp,
            carolSpaceDapp,
            aliceProvider,
            carolsWallet,
            alicesWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], ruleData)

        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Set wallet balances to 0
        await Promise.all([
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, oneHalfEth),
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneHalfEth),
            TestEthBalance.setRiverBalance(carolsWallet.address as Address, oneHalfEth),
            TestEthBalance.setRiverBalance(alicesWallet.address as Address, oneHalfEth),
        ])

        log('expect neither alice nor carol can join the channel')
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)
        await expectUserCannotJoinChannel(carol, carolSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    // Banning with entitlements — users need permission to ban other users.
    test('adminsCanRedactChannelMessages', async () => {
        // log('start adminsCanRedactChannelMessages')
        // // set up the web3 provider and spacedapp
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
        bob.startSync()

        // // Alice should have no issue joining the space and default channel.
        await expectUserCanJoin(
            spaceId,
            defaultChannelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        // Alice says something bad
        const stream = await alice.waitForStream(defaultChannelId)
        await alice.sendMessage(defaultChannelId, 'Very bad message!')
        let eventId: string | undefined
        await waitFor(() => {
            const event = stream.view.timeline.find(
                (e) =>
                    getChannelMessagePayload(e.localEvent?.channelMessage) === 'Very bad message!',
            )
            expect(event).toBeDefined()
            eventId = event?.hashStr
        })

        expect(stream).toBeDefined()
        expect(eventId).toBeDefined()

        await expect(bob.redactMessage(defaultChannelId, eventId!)).resolves.not.toThrow()
        await expect(alice.redactMessage(defaultChannelId, eventId!)).rejects.toThrow(
            /PERMISSION_DENIED/,
        )

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done')
    })
})
