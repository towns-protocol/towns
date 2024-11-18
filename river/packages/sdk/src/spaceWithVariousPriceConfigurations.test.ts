import { dlog } from '@river-build/dlog'
import {
    createSpaceAndDefaultChannel,
    dynamicMembershipStruct,
    expectUserCanJoin,
    fixedPriceMembershipStruct,
    setupWalletsAndContexts,
    zeroPriceWithLimitedAllocationMembershipStruct,
} from './util.test'
import { ethers } from 'ethers'
const log = dlog('csb:test:spaceWithVariousPriceConfigurations')

test('a space that has a price of 0 and no further free allocations should start charging', async () => {
    log('start a space that has a price of 0 and no further free allocations should start charging')
    const {
        bob,
        bobProvider,
        bobSpaceDapp,
        alice,
        aliceSpaceDapp,
        aliceProvider,
        alicesWallet,
        carol,
        carolsWallet,
        carolProvider,
        carolSpaceDapp,
    } = await setupWalletsAndContexts()

    // create a membership that has a price of 0 and 1 free allocation
    const membershipRequirements = await zeroPriceWithLimitedAllocationMembershipStruct(
        bobSpaceDapp,
        bob,
        // set to # of users that should be able to join for free + 1
        // 2 b/c - the owner takes 1
        // the first user takes 1
        // the 3rd user should be charged
        { freeAllocation: 2 },
    )

    const { spaceId, defaultChannelId: channelId } = await createSpaceAndDefaultChannel(
        bob,
        bobSpaceDapp,
        bobProvider.wallet,
        "bob's town",
        membershipRequirements,
    )

    const space = bobSpaceDapp.getSpace(spaceId)
    const { price: joinPrice } = await bobSpaceDapp.getJoinSpacePriceDetails(spaceId)

    expect(joinPrice.toBigInt()).toBe(0n)

    log('Alice should be able to join space')

    await expectUserCanJoin(
        spaceId,
        channelId,
        'alice',
        alice,
        aliceSpaceDapp,
        alicesWallet.address,
        aliceProvider.wallet,
    )

    expect((await space?.ERC721A.read.totalSupply())?.toNumber()).toBe(2)
    const { price: joinPrice2 } = await bobSpaceDapp.getJoinSpacePriceDetails(spaceId)

    expect(joinPrice2.toBigInt()).toBeGreaterThan(0n)

    await expectUserCanJoin(
        spaceId,
        channelId,
        'carol',
        carol,
        carolSpaceDapp,
        carolsWallet.address,
        carolProvider.wallet,
    )

    // kill the clients
    await bob.stopSync()
    await alice.stopSync()
    await carol.stopSync()
    log('Done')
})

test('a space that uses dynamic pricing should charge', async () => {
    log('start a space that uses dynamic pricing should charge')
    const { bob, bobProvider, bobSpaceDapp, alice, aliceSpaceDapp, aliceProvider, alicesWallet } =
        await setupWalletsAndContexts()

    // create a membership that has a price of 0 and 1 free allocation
    const membershipRequirements = await dynamicMembershipStruct(bobSpaceDapp, bob)

    const { spaceId, defaultChannelId: channelId } = await createSpaceAndDefaultChannel(
        bob,
        bobSpaceDapp,
        bobProvider.wallet,
        "bob's town",
        membershipRequirements,
    )

    const { price: joinPrice } = await bobSpaceDapp.getJoinSpacePriceDetails(spaceId)

    expect(joinPrice.toBigInt()).toBeGreaterThan(0n)

    log('Alice should be able to join space')

    await expectUserCanJoin(
        spaceId,
        channelId,
        'alice',
        alice,
        aliceSpaceDapp,
        alicesWallet.address,
        aliceProvider.wallet,
    )

    // kill the clients
    await bob.stopSync()
    await alice.stopSync()
    log('Done')
})

test('a space that uses fixed pricing w/o free allocations should charge', async () => {
    log('start a space that uses fixed pricing w/o free allocations should charge')
    const { bob, bobProvider, bobSpaceDapp, alice, aliceSpaceDapp, aliceProvider, alicesWallet } =
        await setupWalletsAndContexts()

    // create a membership that has a price of 0 and 1 free allocation
    const membershipRequirements = await fixedPriceMembershipStruct(bobSpaceDapp, bob)

    const { spaceId, defaultChannelId: channelId } = await createSpaceAndDefaultChannel(
        bob,
        bobSpaceDapp,
        bobProvider.wallet,
        "bob's town",
        membershipRequirements,
    )

    const { price: joinPrice } = await bobSpaceDapp.getJoinSpacePriceDetails(spaceId)

    expect(joinPrice.toBigInt()).toBe(ethers.utils.parseEther('1').toBigInt())

    log('Alice should be able to join space')

    await expectUserCanJoin(
        spaceId,
        channelId,
        'alice',
        alice,
        aliceSpaceDapp,
        alicesWallet.address,
        aliceProvider.wallet,
    )

    // kill the clients
    await bob.stopSync()
    await alice.stopSync()
    log('Done')
})
