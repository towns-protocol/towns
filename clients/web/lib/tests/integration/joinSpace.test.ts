/**
 * @group casablanca
 */

import {
    registerAndStartClients,
    registerAndStartClient,
    createTestSpaceGatedByTownAndZionNfts,
} from './helpers/TestUtils'

import { Permission } from '@river/web3'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { TestConstants } from './helpers/TestConstants'

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
    ])) as RoomIdentifier

    // alice joins the space
    await alice.joinTown(spaceId, alice.wallet)
    expect(alice.getRoomData(spaceId)?.id.streamId).toEqual(spaceId.streamId)
})

test('create space, and have user that already has membership NFT join ', async () => {
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
    ])) as RoomIdentifier

    await alice.mintMembershipTransaction(spaceId, alice.wallet)
    // alice joins the space
    await alice.joinTown(spaceId, alice.wallet)
    expect(alice.getRoomData(spaceId)?.id.streamId).toEqual(spaceId.streamId)
})
