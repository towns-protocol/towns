/**
 * @group core
 */

import {
    registerAndStartClients,
    registerAndStartClient,
    createTestSpaceGatedByTownsNfts,
    waitForWithRetries,
    createTestSpaceGatedByTownNft,
    createPaidTestSpaceGatedByTownNft,
} from './helpers/TestUtils'

import {
    IArchitectBase,
    Permission,
    getContractAddress,
    isHexString,
    publicMint,
    createExternalTokenStruct,
    getDynamicPricingModule,
} from '@river-build/web3'
import { TestConstants } from './helpers/TestConstants'
import { ethers } from 'ethers'
import { ParsedChannelProperties, assert } from '@river/sdk'
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
        console.log('channelsMeta', channelsMeta)
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
    const spaceId = await createPaidTestSpaceGatedByTownNft(bob, [
        Permission.Read,
        Permission.Write,
    ])

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
        expect(error.message).toMatch(/insufficient funds/)
    }
})

// TODO enable this once the minting function is gated by IRuleGated
test.skip(
    'join_space_gated_2_NFT',
    async () => {
        // create clients
        const { alice, bob, carol } = await registerAndStartClients(['alice', 'bob', 'carol'])

        // bob creates a space
        const [tokenA, tokenB] = await Promise.all([
            getContractAddress('tokenA'),
            getContractAddress('tokenB'),
        ])

        const ruleData = createExternalTokenStruct([tokenA, tokenB])

        assert(isHexString(alice.walletAddress), 'alice.walletAddress is not a hex string')
        assert(isHexString(bob.walletAddress), 'bob.walletAddress is not a hex string')
        assert(isHexString(carol.walletAddress), 'carol.walletAddress is not a hex string')
        await Promise.all([
            await publicMint('tokenA', alice.walletAddress),
            await publicMint('tokenB', alice.walletAddress),

            await publicMint('tokenA', bob.walletAddress),
            await publicMint('tokenB', bob.walletAddress),
            // Carol only has one of the needed tokens
            await publicMint('tokenA', carol.walletAddress),
        ])

        console.log('ruleData', ruleData)
        const dynamicPricingModule = await getDynamicPricingModule(alice.spaceDapp)

        const membershipInfo: IArchitectBase.MembershipStruct = {
            settings: {
                name: 'Member',
                symbol: 'MEMBER',
                price: 0,
                maxSupply: 100,
                duration: 0,
                currency: ethers.constants.AddressZero,
                feeRecipient: alice.walletAddress ?? ethers.constants.AddressZero,
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
        const spaceId = await waitForWithRetries(() =>
            alice.createSpace(createSpaceInfo, membershipInfo),
        )

        assert(spaceId !== undefined, 'createSpace failed')

        await alice.joinTown(spaceId, alice.wallet)
        expect(alice.getRoomData(spaceId)?.id).toEqual(spaceId)
        await bob.joinTown(spaceId, bob.wallet)
        expect(bob.getRoomData(spaceId)?.id).toEqual(spaceId)

        await expect(carol.joinTown(spaceId, carol.wallet)).rejects.toThrow(
            new RegExp('execution reverted'),
        )
    },
    120 * 1000,
)

// This test fails for now because wallet linking doesn't work properly
test.skip('join_space_gated_2_NFT_2_wallet', async () => {
    // create clients
    const { alice, bob1, bob2 } = await registerAndStartClients(['alice', 'bob1', 'bob2'])

    const [tokenA, tokenB] = await Promise.all([
        getContractAddress('tokenA'),
        getContractAddress('tokenB'),
    ])
    // TODO: remove this struct helper - it's from river/web3 and only used in tests
    const ruleData = createExternalTokenStruct([tokenA, tokenB])

    assert(isHexString(alice.walletAddress), 'alice.walletAddress is not a hex string')
    assert(isHexString(bob1.walletAddress), 'bob.walletAddress is not a hex string')
    assert(isHexString(bob2.walletAddress), 'carol.walletAddress is not a hex string')
    await Promise.all([
        await publicMint('tokenA', alice.walletAddress),
        await publicMint('tokenB', alice.walletAddress),

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
            feeRecipient: alice.walletAddress ?? ethers.constants.AddressZero,
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
    const spaceId = await waitForWithRetries(() =>
        alice.createSpace(createSpaceInfo, membershipInfo),
    )

    assert(spaceId !== undefined, 'createSpace failed')

    await alice.joinTown(spaceId, alice.wallet)
    expect(alice.getRoomData(spaceId)?.id).toEqual(spaceId)
    await bob1.joinTown(spaceId, bob1.wallet)
    expect(bob1.getRoomData(spaceId)?.id).toEqual(spaceId)
})
