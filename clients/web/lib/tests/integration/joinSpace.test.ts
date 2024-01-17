/**
 * @group casablanca
 */

import {
    registerAndStartClients,
    registerAndStartClient,
    createTestSpaceGatedByTownAndZionNfts,
} from './helpers/TestUtils'

import {
    ITownArchitectBase,
    Permission,
    createExternalTokenStruct,
    getContractAddress,
    isHexString,
    publicMint,
} from '@river/web3'
import { TestConstants } from './helpers/TestConstants'
import { ethers } from 'ethers'
import { assert } from '@river/mecholm'
import { getTransactionHashFromTransactionOrUserOp } from '@towns/userops'

test('create space, and have user join ', async () => {
    // create clients
    // alice needs to have a valid nft in order to join bob's space / channel
    const alice = await registerAndStartClient('alice', TestConstants.getWalletWithTestGatingNft())
    const { bob } = await registerAndStartClients(['bob'])
    // bob needs funds to create a space
    await bob.fundWallet()
    // bob creates a space
    const spaceId = (await createTestSpaceGatedByTownAndZionNfts(bob, [
        Permission.Read,
        Permission.Write,
    ])) as string

    // alice joins the space
    await alice.joinTown(spaceId, alice.wallet)
    expect(alice.getRoomData(spaceId)?.id).toEqual(spaceId)
})

test('create space, and have user that already has membership NFT join ', async () => {
    // create clients
    // alice needs to have a valid nft in order to join bob's space / channel
    const alice = await registerAndStartClient('alice', TestConstants.getWalletWithTestGatingNft())
    const { bob } = await registerAndStartClients(['bob'])
    // bob needs funds to create a space
    await bob.fundWallet()
    // bob creates a space
    const spaceId = await createTestSpaceGatedByTownAndZionNfts(bob, [
        Permission.Read,
        Permission.Write,
    ])

    assert(spaceId !== undefined, 'createTestSpaceGatedByTownAndZionNfts failed')

    await alice.mintMembershipTransaction(spaceId, alice.wallet)
    // alice joins the space
    await alice.joinTown(spaceId, alice.wallet)
    expect(alice.getRoomData(spaceId)?.id).toEqual(spaceId)
})

test('join_space_gated_2_NFT', async () => {
    // create clients
    const { alice, bob, carol } = await registerAndStartClients(['alice', 'bob', 'carol'])

    // bob creates a space
    const [tokenA, tokenB] = await Promise.all([
        getContractAddress('tokenA'),
        getContractAddress('tokenB'),
    ])
    const externalTokens = createExternalTokenStruct([tokenA, tokenB])

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
    console.log('create space gated by tokenA and tokenB tokens', externalTokens)

    const membershipInfo: ITownArchitectBase.MembershipStruct = {
        settings: {
            name: 'Member',
            symbol: 'MEMBER',
            price: 0,
            maxSupply: 100,
            duration: 0,
            currency: ethers.constants.AddressZero,
            feeRecipient: alice.walletAddress ?? ethers.constants.AddressZero,
            freeAllocation: 0,
            pricingModule: ethers.constants.AddressZero,
        },
        permissions: [Permission.Read, Permission.Write],
        requirements: {
            everyone: false,
            tokens: externalTokens,
            users: [],
            rule: ethers.constants.AddressZero,
        },
    }

    const createSpaceInfo = {
        name: alice.makeUniqueName(),
    }
    // createSpace is gated by the mock NFT. Mint one for yourself before proceeding.
    const spaceId = await alice.createSpace(createSpaceInfo, membershipInfo)

    assert(spaceId !== undefined, 'createSpace failed')

    await alice.joinTown(spaceId, alice.wallet)
    expect(alice.getRoomData(spaceId)?.id).toEqual(spaceId)
    await bob.joinTown(spaceId, bob.wallet)
    expect(bob.getRoomData(spaceId)?.id).toEqual(spaceId)

    await expect(carol.joinTown(spaceId, carol.wallet)).rejects.toThrow(
        new RegExp('execution reverted'),
    )
})

// This test fails for now because wallet linking doesn't work properly
test.skip('join_space_gated_2_NFT_2_wallet', async () => {
    // create clients
    const { alice, bob1, bob2 } = await registerAndStartClients(['alice', 'bob1', 'bob2'])

    // bob creates a space
    const [tokenA, tokenB] = await Promise.all([
        getContractAddress('tokenA'),
        getContractAddress('tokenB'),
    ])
    const externalTokens = createExternalTokenStruct([tokenA, tokenB])

    assert(isHexString(alice.walletAddress), 'alice.walletAddress is not a hex string')
    assert(isHexString(bob1.walletAddress), 'bob.walletAddress is not a hex string')
    assert(isHexString(bob2.walletAddress), 'carol.walletAddress is not a hex string')
    await Promise.all([
        await publicMint('tokenA', alice.walletAddress),
        await publicMint('tokenB', alice.walletAddress),

        await publicMint('tokenA', bob1.walletAddress),
        await publicMint('tokenB', bob2.walletAddress),
    ])
    console.log('create space gated by tokenA and tokenB tokens', externalTokens)

    const tx_link = await bob1.linkWallet(bob1.provider.wallet, bob2.provider.wallet)
    const txHash = await getTransactionHashFromTransactionOrUserOp(tx_link.transaction)

    assert(txHash !== undefined, 'linkWallet failed')
    if (txHash) {
        const receipt = await bob1.opts.web3Provider?.waitForTransaction(txHash)
        expect(receipt?.status).toEqual(1)
    }
    expect(tx_link.error).toBeUndefined()

    const membershipInfo: ITownArchitectBase.MembershipStruct = {
        settings: {
            name: 'Member',
            symbol: 'MEMBER',
            price: 0,
            maxSupply: 100,
            duration: 0,
            currency: ethers.constants.AddressZero,
            feeRecipient: alice.walletAddress ?? ethers.constants.AddressZero,
            freeAllocation: 0,
            pricingModule: ethers.constants.AddressZero,
        },
        permissions: [Permission.Read, Permission.Write],
        requirements: {
            everyone: false,
            tokens: externalTokens,
            users: [],
            rule: ethers.constants.AddressZero,
        },
    }

    const createSpaceInfo = {
        name: alice.makeUniqueName(),
    }
    // createSpace is gated by the mock NFT. Mint one for yourself before proceeding.
    const spaceId = await alice.createSpace(createSpaceInfo, membershipInfo)

    assert(spaceId !== undefined, 'createSpace failed')

    await alice.joinTown(spaceId, alice.wallet)
    expect(alice.getRoomData(spaceId)?.id).toEqual(spaceId)
    await bob1.joinTown(spaceId, bob1.wallet)
    expect(bob1.getRoomData(spaceId)?.id).toEqual(spaceId)
})
