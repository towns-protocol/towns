/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/**
 * @group with-entitilements
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
} from './util.test'
import { MembershipOp } from '@river-build/proto'
import { makeUserStreamId } from './id'
import { dlog } from '@river-build/dlog'
import {
    NoopRuleData,
    IRuleEntitlement,
    Permission,
    getContractAddress,
    publicMint,
    LogicalOperationType,
    OperationType,
    Operation,
    CheckOperationType,
    treeToRuleData,
} from '@river-build/web3'
import { Client } from './client'

const log = dlog('csb:test:channelsWithEntitlements')

// pass in users as 'alice', 'bob', 'carol' - b/c their wallets are created here
async function setupChannelWithCustomRole(
    userNames: string[],
    ruleData: IRuleEntitlement.RuleDataStruct,
) {
    const {
        alice,
        bob,
        alicesWallet,
        bobsWallet,
        carolsWallet,
        aliceProvider,
        bobProvider,
        carolProvider,
        aliceSpaceDapp,
        bobSpaceDapp,
        carolSpaceDapp,
    } = await setupWalletsAndContexts()

    const userNameToWallet: Record<string, string> = {
        alice: alicesWallet.address,
        bob: bobsWallet.address,
        carol: carolsWallet.address,
    }
    const users = userNames.map((user) => userNameToWallet[user])

    const { spaceId, defaultChannelId } = await createSpaceAndDefaultChannel(
        bob,
        bobSpaceDapp,
        bobProvider.wallet,
        'bob',
        await everyoneMembershipStruct(bobSpaceDapp, bob),
    )

    const { roleId, error: roleError } = await createRole(
        bobSpaceDapp,
        bobProvider,
        spaceId,
        'nft-gated read role',
        [Permission.Read],
        users,
        ruleData,
        bobProvider.wallet,
    )
    expect(roleError).toBeUndefined()
    log('roleId', roleId)

    // Create a channel gated by the above role in the space contract.
    const { channelId, error: channelError } = await createChannel(
        bobSpaceDapp,
        bobProvider,
        spaceId,
        'custom-role-gated-channel',
        [roleId!.valueOf()],
        bobProvider.wallet,
    )
    expect(channelError).toBeUndefined()
    log('channelId', channelId)

    // Then, establish a stream for the channel on the river node.
    const { streamId: channelStreamId } = await bob.createChannel(
        spaceId,
        'nft-gated-channel',
        'talk about nfts here',
        channelId!,
    )
    expect(channelStreamId).toEqual(channelId)
    // As the space owner, Bob should always be able to join the channel regardless of the custom role.
    await expect(bob.joinStream(channelId!)).toResolve()

    // Join alice to the town so she can attempt to join the role-gated channel.
    // Alice should have no issue joining the space and default channel for an "everyone" towne.
    await expectUserCanJoin(
        spaceId,
        defaultChannelId,
        'alice',
        alice,
        aliceSpaceDapp,
        alicesWallet.address,
        aliceProvider.wallet,
    )

    return {
        alice,
        bob,
        alicesWallet,
        bobsWallet,
        carolsWallet,
        aliceProvider,
        bobProvider,
        carolProvider,
        aliceSpaceDapp,
        bobSpaceDapp,
        carolSpaceDapp,
        spaceId,
        defaultChannelId,
        channelId,
        roleId,
    }
}

async function expectUserCanJoinChannel(client: Client, channelId: string) {
    await expect(client.joinStream(channelId!)).toResolve()
    const aliceUserStreamView = (await client.waitForStream(makeUserStreamId(client.userId))!).view
    // Wait for alice's user stream to have the join
    await waitFor(() => aliceUserStreamView.userContent.isMember(channelId!, MembershipOp.SO_JOIN))
}

describe('channelsWithEntitlements', () => {
    test('userEntitlementPass', async () => {
        const { alice, bob, channelId } = await setupChannelWithCustomRole(['alice'], NoopRuleData)

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('userEntitlementFail', async () => {
        const { alice, bob, channelId } = await setupChannelWithCustomRole(['carol'], NoopRuleData)

        await expect(alice.joinStream(channelId!)).rejects.toThrow(/7:PERMISSION_DENIED/)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('banned user cannot join', async () => {
        const { alice, alicesWallet, bob, bobSpaceDapp, bobProvider, spaceId, channelId } =
            await setupChannelWithCustomRole(['alice'], NoopRuleData)

        const tx = await bobSpaceDapp.banWalletAddress(
            spaceId,
            alicesWallet.address,
            bobProvider.wallet,
        )
        await tx.wait()

        await expect(alice.joinStream(channelId!)).rejects.toThrow(/7:PERMISSION_DENIED/)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('userEntitlementPass - join as root, linked wallet whitelisted', async () => {
        const { alice, aliceSpaceDapp, aliceProvider, carolProvider, bob, channelId } =
            await setupChannelWithCustomRole(['carol'], NoopRuleData)

        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('userEntitlementPass - join as linked wallet, root wallet whitelisted', async () => {
        const { alice, carolSpaceDapp, aliceProvider, carolProvider, bob, channelId } =
            await setupChannelWithCustomRole(['carol'], NoopRuleData)

        // Link alice's wallet to Carol's wallet as root
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done linked-wallet-whitelist', Date.now() - doneStart)
    })

    test('oneNftGateJoinPass - join as root, asset in linked wallet', async () => {
        const testNft1Address = await getContractAddress('TestNFT1')
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            carolsWallet,
            carolProvider,
            channelId,
        } = await setupChannelWithCustomRole([], getNftRuleData(testNft1Address as `0x${string}`))

        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        log('Minting an NFT for carols wallet, which is linked to alices wallet')
        await publicMint('TestNFT1', carolsWallet.address as `0x${string}`)

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('oneNftGateJoinPass - join as linked wallet, asset in root wallet', async () => {
        const testNft1Address = await getContractAddress('TestNFT1')
        const {
            alice,
            bob,
            carolSpaceDapp,
            aliceProvider,
            carolsWallet,
            carolProvider,
            channelId,
        } = await setupChannelWithCustomRole([], getNftRuleData(testNft1Address as `0x${string}`))

        log("Joining alice's wallet as a linked wallet to carols root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        log('Minting an NFT for carols wallet, which is the root to alices wallet')
        await publicMint('TestNFT1', carolsWallet.address as `0x${string}`)

        log('expect that alice can join the space')
        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('oneNftGateJoinPass', async () => {
        const testNftAddress = await getContractAddress('TestNFT')
        const { alice, alicesWallet, bob, channelId } = await setupChannelWithCustomRole(
            [],
            getNftRuleData(testNftAddress),
        )

        // Mint an nft for alice - she should be able to join now
        log('Minting NFT for Alice', testNftAddress, alicesWallet.address)
        await publicMint('TestNFT', alicesWallet.address as `0x${string}`)

        // Alice should be able to join the nft-gated channel since she has the required NFT token.
        await expectUserCanJoinChannel(alice, channelId!)

        await bob.stopSync()
        await alice.stopSync()
    })

    test('oneNftGateJoinFail', async () => {
        const testNft1Address = await getContractAddress('TestNFT1')
        const { alice, bob, channelId } = await setupChannelWithCustomRole(
            [],
            getNftRuleData(testNft1Address as `0x${string}`),
        )

        log('Alice about to attempt to join channel', { alicesUserId: alice.userId })
        await expect(alice.joinStream(channelId!)).rejects.toThrow(/7:PERMISSION_DENIED/)

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
    })

    test('twoNftGateJoinPass', async () => {
        const testNft1Address = await getContractAddress('TestNFT1')
        const testNft2Address = await getContractAddress('TestNFT2')
        const { alice, bob, alicesWallet, channelId } = await setupChannelWithCustomRole(
            [],
            twoNftRuleData(testNft1Address, testNft2Address),
        )

        const aliceMintTx1 = publicMint('TestNFT1', alicesWallet.address as `0x${string}`)
        const aliceMintTx2 = publicMint('TestNFT2', alicesWallet.address as `0x${string}`)

        log('Minting nfts for alice')
        await Promise.all([aliceMintTx1, aliceMintTx2])

        log('expect that alice can join the channel')
        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('twoNftGateJoinPass - acrossLinkedWallets', async () => {
        const testNft1Address = await getContractAddress('TestNFT1')
        const testNft2Address = await getContractAddress('TestNFT2')
        const {
            alice,
            bob,
            alicesWallet,
            carolsWallet,
            aliceSpaceDapp,
            aliceProvider,
            carolProvider,
            channelId,
        } = await setupChannelWithCustomRole([], twoNftRuleData(testNft1Address, testNft2Address))

        const aliceMintTx1 = publicMint('TestNFT1', alicesWallet.address as `0x${string}`)
        const carolMintTx2 = publicMint('TestNFT2', carolsWallet.address as `0x${string}`)

        log('Minting nfts for alice and carol')
        await Promise.all([aliceMintTx1, carolMintTx2])

        log("linking carols wallet to alice's wallet")
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        log('Alice should be able to join channel with one asset in carol wallet')
        await expectUserCanJoinChannel(alice, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('twoNftGateJoinFail', async () => {
        const testNft1Address = await getContractAddress('TestNFT1')
        const testNft2Address = await getContractAddress('TestNFT2')
        const { alice, bob, alicesWallet, channelId } = await setupChannelWithCustomRole(
            [],
            twoNftRuleData(testNft1Address, testNft2Address),
        )

        // Mint only one of the required NFTs for alice
        log('Minting only one of two required NFTs for alice')
        await publicMint('TestNFT1', alicesWallet.address as `0x${string}`)

        log('expect that alice cannot join the channel')
        await expect(alice.joinStream(channelId!)).rejects.toThrow(/7:PERMISSION_DENIED/)

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
    })

    test('OrOfTwoNftGateJoinPass', async () => {
        const testNft1Address = await getContractAddress('TestNFT1')
        const testNft2Address = await getContractAddress('TestNFT2')
        const { alice, bob, alicesWallet, channelId } = await setupChannelWithCustomRole(
            [],
            twoNftRuleData(testNft1Address, testNft2Address, LogicalOperationType.OR),
        )
        // join alice
        log('Minting an NFT for alice')
        await publicMint('TestNFT1', alicesWallet.address as `0x${string}`)

        log('expect that alice can join the channel')
        await expectUserCanJoinChannel(alice, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('orOfTwoNftOrOneNftGateJoinPass', async () => {
        const testNft1Address = await getContractAddress('TestNFT1')
        const testNft2Address = await getContractAddress('TestNFT2')
        const testNft3Address = await getContractAddress('TestNFT3')
        const leftOperation: Operation = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC721,
            chainId: 31337n,
            contractAddress: testNft1Address as `0x${string}`,
            threshold: 1n,
        }

        const rightOperation: Operation = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC721,
            chainId: 31337n,
            contractAddress: testNft2Address as `0x${string}`,
            threshold: 1n,
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
                contractAddress: testNft3Address as `0x${string}`,
                threshold: 1n,
            },
        }

        const ruleData = treeToRuleData(root)
        const { alice, bob, alicesWallet, channelId } = await setupChannelWithCustomRole(
            [],
            ruleData,
        )

        log("Mint Alice's NFTs")
        const aliceMintTx1 = publicMint('TestNFT1', alicesWallet.address as `0x${string}`)
        const aliceMintTx2 = publicMint('TestNFT2', alicesWallet.address as `0x${string}`)
        await Promise.all([aliceMintTx1, aliceMintTx2])

        log('expect that alice can join the channel')
        await expectUserCanJoinChannel(alice, channelId!)

        // kill the clients
        const doneStart = Date.now()
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

        await expect(bob.redactMessage(defaultChannelId, eventId!)).toResolve()
        await expect(alice.redactMessage(defaultChannelId, eventId!)).rejects.toThrow(
            expect.objectContaining({
                message: expect.stringContaining('7:PERMISSION_DENIED'),
            }),
        )

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done')
    })
})
