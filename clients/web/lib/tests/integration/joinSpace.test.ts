/**
 * @group core
 */

import {
    registerAndStartClients,
    registerAndStartClient,
    createTestSpaceGatedByTownsNfts,
    createTestSpaceGatedByTownNft,
    createPaidTestSpaceGatedByTownNft,
} from './helpers/TestUtils'

import {
    IArchitectBase,
    Permission,
    getContractAddress,
    isHexString,
    publicMint,
    createExternalNFTStruct,
    getDynamicPricingModule,
} from '@river-build/web3'
import { TestConstants } from './helpers/TestConstants'
import { ethers } from 'ethers'
import { ParsedChannelProperties, assert } from '@river-build/sdk'
import { getTransactionHashFromTransactionOrUserOp } from '@towns/userops'
import { waitFor } from '@testing-library/dom'

test('create space, and have user join', async () => {
    // create clients
    // alice needs to have a valid nft in order to join bob's space / channel
    const alice = await registerAndStartClient('alice', TestConstants.getWalletWithTestGatingNft())
    const { bob } = await registerAndStartClients(['bob'])
    // bob needs funds to create a space
    await bob.fundWallet()
    // bob creates a space
    const spaceId = await createTestSpaceGatedByTownsNfts(bob, [Permission.Read, Permission.Write])

    // alice joins the space
    await alice.joinTown(spaceId, alice.wallet)
    expect(alice.getRoomData(spaceId)?.id).toEqual(spaceId)

    let defaultChannel: [string, ParsedChannelProperties] | undefined
    await waitFor(() => {
        const channelsMeta =
            alice.casablancaClient?.streams.get(spaceId)?.view.spaceContent.spaceChannelsMetadata
        expect(channelsMeta).toBeDefined()
        expect(channelsMeta?.size).toBeGreaterThan(0)
        defaultChannel = Array.from(channelsMeta!.entries()).find((c) => c[1].isDefault)
        expect(defaultChannel).toBeDefined()
    })

    const channelId = defaultChannel![0]

    // expect alice to also join the default channel
    const channelStream = alice.casablancaClient?.streams.get(channelId)
    expect(channelStream).toBeDefined()
    await waitFor(() =>
        expect(channelStream!.view.getMembers().isMemberJoined(alice.getUserId())).toBeTruthy(),
    )
    const userStreamId = alice.casablancaClient?.userStreamId
    const userStream = alice.casablancaClient?.streams.get(userStreamId!)
    await waitFor(() => expect(userStream?.view.userContent.isJoined(channelId)).toBeTruthy())
})

test('create space with additional autojoin channels, and have user join', async () => {
    const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
    await bob.fundWallet()
    const spaceId = await createTestSpaceGatedByTownNft(bob, [Permission.Read, Permission.Write])

    let defaultChannel: [string, ParsedChannelProperties] | undefined
    await waitFor(() => {
        const channelsMeta =
            bob.casablancaClient?.streams.get(spaceId)?.view.spaceContent.spaceChannelsMetadata
        expect(channelsMeta).toBeDefined()
        defaultChannel = Array.from(channelsMeta!.entries()).find((c) => c[1].isDefault)
        expect(defaultChannel).toBeDefined()
    })
    const defaultChannellId = defaultChannel![0]

    const channel1 = await bob.createChannel(
        {
            name: 'channel 1',
            parentSpaceId: spaceId,
            roleIds: [0, 1, 2], // default member role
        },
        bob.provider.wallet,
    )

    const channel2 = await bob.createChannel(
        {
            name: 'channel 2',
            parentSpaceId: spaceId,
            roleIds: [0, 1, 2], // default member role
            channelSettings: {
                autojoin: true,
                hideUserJoinLeaveEvents: false,
            },
        },
        bob.provider.wallet,
    )

    // Alice joins the town - should be autojoined to default channel and autojoin channel
    await alice.joinTown(spaceId, alice.wallet)

    const aliceUserStreamId = alice.casablancaClient?.userStreamId
    const aliceUserStream = alice.casablancaClient?.streams.get(aliceUserStreamId!)
    await waitFor(() => {
        expect(aliceUserStream?.view.userContent.isJoined(defaultChannellId)).toBeTruthy()
        expect(aliceUserStream?.view.userContent.isJoined(channel2)).toBeTruthy()
        expect(aliceUserStream?.view.userContent.isJoined(channel1)).toBeFalsy()
    })

    // Toggle autojoins for created channels
    await bob.setChannelAutojoin(spaceId, channel1, true)
    await bob.setChannelAutojoin(spaceId, channel2, false)

    // Wait for events to be committed to space snapshot
    await waitFor(() => {
        const channelsMeta =
            bob.casablancaClient?.streams.get(spaceId)?.view.spaceContent.spaceChannelsMetadata
        expect(channelsMeta).toBeDefined()
        expect(channelsMeta?.size).toBeGreaterThan(0)
        expect(channelsMeta?.get(channel1)?.isAutojoin).toBeTruthy()
        expect(channelsMeta?.get(channel2)?.isAutojoin).toBeFalsy()
    })

    const { carol } = await registerAndStartClients(['carol'])
    // Join carol to the space. She should be autojoined to the default channel and channel 1
    await carol.joinTown(spaceId, carol.wallet)
    const carolUserStreamId = carol.casablancaClient?.userStreamId
    const carolUserStream = carol.casablancaClient?.streams.get(carolUserStreamId!)
    await waitFor(() => {
        // carol's channel membership state
        expect(carolUserStream?.view.userContent.isJoined(defaultChannellId)).toBeTruthy()
        expect(carolUserStream?.view.userContent.isJoined(channel1)).toBeTruthy()
        expect(carolUserStream?.view.userContent.isJoined(channel2)).toBeFalsy()
    })
})

test('create space, and have user that already has membership NFT join ', async () => {
    // create clients
    // alice needs to have a valid nft in order to join bob's space / channel
    const alice = await registerAndStartClient('alice', TestConstants.getWalletWithTestGatingNft())
    const { bob } = await registerAndStartClients(['bob'])
    // bob needs funds to create a space
    await bob.fundWallet()
    // bob creates a space
    const spaceId = await createTestSpaceGatedByTownNft(bob, [Permission.Read, Permission.Write])

    await alice.mintMembershipTransaction(spaceId, alice.wallet)
    // alice joins the space
    await alice.joinTown(spaceId, alice.wallet)
    expect(alice.getRoomData(spaceId)?.id).toEqual(spaceId)
})

test('create a space with a fixed cost, user must pay to join', async () => {
    // create clients
    // alice needs to have a valid nft in order to join bob's space / channel
    const alice = await registerAndStartClient('alice', TestConstants.getWalletWithTestGatingNft())
    const { bob } = await registerAndStartClients(['bob'])
    // bob needs funds to create a space
    await bob.fundWallet()

    const DEFAULT_FIXED_COST = '0.1'
    // bob creates a space with (default) 0.1 eth fixed cost
    const spaceId = await createPaidTestSpaceGatedByTownNft(
        bob,
        [Permission.Read, Permission.Write],
        parseFloat(DEFAULT_FIXED_COST),
    )

    const spaceInfo = await bob.spaceDapp.getMembershipInfo(spaceId)
    assert(spaceInfo !== undefined, 'spaceInfo undefined')

    const membershipPriceInEth = ethers.utils.formatEther(await spaceInfo.price)
    expect(membershipPriceInEth).toEqual(DEFAULT_FIXED_COST)

    const alicesBalanceBefore = await alice.provider.getBalance(alice.wallet.address)

    // alice joins the space
    await alice.joinTown(spaceId, alice.wallet)
    expect(alice.getRoomData(spaceId)?.id).toEqual(spaceId)

    expect((await alice.provider.getBalance(alice.wallet.address)).toBigInt()).toBeLessThan(
        alicesBalanceBefore.sub(ethers.utils.parseEther(DEFAULT_FIXED_COST)).toBigInt(),
    )
})

test('create a space with a fixed cost that is higher than joining user balance', async () => {
    // create clients
    // alice needs to have a valid nft in order to join bob's space / channel
    const alice = await registerAndStartClient('alice', TestConstants.getWalletWithTestGatingNft())
    const { bob } = await registerAndStartClients(['bob'])
    // bob needs funds to create a space
    await bob.fundWallet()

    const FIXED_COST = '100.0'
    // bob creates a space with (default) 0.1 eth fixed cost
    const spaceId = await createPaidTestSpaceGatedByTownNft(
        bob,
        [Permission.Read, Permission.Write],
        +FIXED_COST,
    )

    const spaceInfo = await bob.spaceDapp.getMembershipInfo(spaceId)
    assert(spaceInfo !== undefined, 'spaceInfo undefined')

    const membershipPriceInEth = ethers.utils.formatEther(await spaceInfo.price)
    expect(membershipPriceInEth).toEqual(FIXED_COST)

    // alice joins the space
    try {
        await alice.joinTown(spaceId, alice.wallet)
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(error.message).toMatch(/insufficient funds/i)
    }
})

test(
    'joinSpace gated with 2 NFTs',
    async () => {
        // create clients
        const { alice, bob, carol } = await registerAndStartClients(['alice', 'bob', 'carol'])

        // bob creates a space
        const [tokenA, tokenB] = await Promise.all([
            getContractAddress('tokenA'),
            getContractAddress('tokenB'),
        ])

        const ruleData = createExternalNFTStruct([tokenA, tokenB])

        assert(isHexString(alice.walletAddress), 'alice.walletAddress is not a hex string')
        assert(isHexString(bob.walletAddress), 'bob.walletAddress is not a hex string')
        assert(isHexString(carol.walletAddress), 'carol.walletAddress is not a hex string')

        await Promise.all([
            // Mint both required tokens for Bob
            await publicMint('tokenA', bob.walletAddress),
            await publicMint('tokenB', bob.walletAddress),
            // Carol only has one of the needed tokens
            await publicMint('tokenA', carol.walletAddress),
        ])
        const dynamicPricingModule = await getDynamicPricingModule(alice.spaceDapp)

        const membershipInfo: IArchitectBase.MembershipStruct = {
            settings: {
                name: 'Member',
                symbol: 'MEMBER',
                price: 0,
                maxSupply: 100,
                duration: 0,
                currency: ethers.constants.AddressZero,
                feeRecipient: ethers.constants.AddressZero,
                freeAllocation: 0,
                pricingModule: dynamicPricingModule.module,
            },
            permissions: [Permission.Read, Permission.Write],
            requirements: {
                everyone: false,
                users: [],
                ruleData: ruleData,
            },
        }

        const createSpaceInfo = {
            name: alice.makeUniqueName(),
        }
        const spaceId = await alice.createSpace(createSpaceInfo, membershipInfo)
        assert(spaceId !== undefined, 'createSpace failed')
        // Alice is the space creator and should already be a town member
        expect(alice.getRoomData(spaceId)?.id).toEqual(spaceId)
        // Bob has both NFTs and should be able to join
        await bob.joinTown(spaceId, bob.wallet)
        expect(bob.getRoomData(spaceId)?.id).toEqual(spaceId)
        // Carol only has one of the required NFTs and should not be able to join
        await expect(carol.joinTown(spaceId, carol.wallet)).rejects.toThrow(/execution reverted/)
    },
    120 * 1000,
)

test('joinSpace gated with 2 NFTs, wallet linking', async () => {
    // create clients
    const { alice, bob1, bob2 } = await registerAndStartClients(['alice', 'bob1', 'bob2'])

    const [tokenA, tokenB] = await Promise.all([
        getContractAddress('tokenA'),
        getContractAddress('tokenB'),
    ])
    // TODO: remove this struct helper - it's from river/web3 and only used in tests
    const ruleData = createExternalNFTStruct([tokenA, tokenB])

    assert(isHexString(alice.walletAddress), 'alice.walletAddress is not a hex string')
    assert(isHexString(bob1.walletAddress), 'bob1.walletAddress is not a hex string')
    assert(isHexString(bob2.walletAddress), 'bob2.walletAddress is not a hex string')
    await Promise.all([
        // Mint both required tokens for Bob, one in each wallet
        await publicMint('tokenA', bob1.walletAddress),
        await publicMint('tokenB', bob2.walletAddress),
    ])

    // bob1 must have funds to link wallet
    const tx_link = await bob1.linkEOAToRootKey(bob1.provider.wallet, bob2.provider.wallet)
    const txHash = await getTransactionHashFromTransactionOrUserOp(tx_link.transaction)

    assert(txHash !== undefined, 'linkWallet failed')
    if (txHash) {
        const receipt = await bob1.opts.baseProvider?.waitForTransaction(txHash)
        expect(receipt?.status).toEqual(1)
    }
    expect(tx_link.error).toBeUndefined()
    const dynamicPricingModule = await getDynamicPricingModule(alice.spaceDapp)

    const membershipInfo: IArchitectBase.MembershipStruct = {
        settings: {
            name: 'Member',
            symbol: 'MEMBER',
            price: 0,
            maxSupply: 100,
            duration: 0,
            currency: ethers.constants.AddressZero,
            feeRecipient: ethers.constants.AddressZero,
            freeAllocation: 0,
            pricingModule: dynamicPricingModule.module,
        },
        permissions: [Permission.Read, Permission.Write],
        requirements: {
            everyone: false,
            users: [],
            ruleData: ruleData,
        },
    }

    const createSpaceInfo = {
        name: alice.makeUniqueName(),
    }
    const spaceId = await alice.createSpace(createSpaceInfo, membershipInfo)

    assert(spaceId !== undefined, 'createSpace failed')

    // Alice is the space creator and should already be a town member
    expect(alice.getRoomData(spaceId)?.id).toEqual(spaceId)
    // Bob has both NFTs spread across his linked wallets, and should be able to join
    await bob1.joinTown(spaceId, bob1.wallet)
    expect(bob1.getRoomData(spaceId)?.id).toEqual(spaceId)
})
