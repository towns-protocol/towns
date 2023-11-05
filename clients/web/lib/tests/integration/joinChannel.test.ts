import {
    registerAndStartClients,
    registerAndStartClient,
    waitForWithRetries,
    createTestSpaceGatedByTownAndZionNfts,
} from './helpers/TestUtils'

import { Permission, createExternalTokenStruct, getMemberNftAddress } from '@river/web3'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { TestConstants } from './helpers/TestConstants'
import { RoleIdentifier } from '../../src/types/web3-types'

test('create a public space and a public room, and have user join', async () => {
    // create clients
    // alice needs to have a valid nft in order to join bob's space / channel
    const alice = await registerAndStartClient('alice', TestConstants.getWalletWithMemberNft())
    const { bob } = await registerAndStartClients(['bob'])
    // bob needs funds to create a space
    await bob.fundWallet()
    // bob creates a space
    const spaceId = (await createTestSpaceGatedByTownAndZionNfts(bob, [
        Permission.Read,
        Permission.Write,
    ])) as RoomIdentifier

    const memberNftAddress = getMemberNftAddress(bob.chainId)
    const memberNftToken = createExternalTokenStruct([memberNftAddress])[0]
    const roleIdentifier: RoleIdentifier | undefined = await bob.createRole(
        spaceId.networkId,
        'newRoleName',
        [Permission.Read, Permission.Write],
        [memberNftToken],
        [],
    )

    if (!roleIdentifier) {
        throw new Error('roleIdentifier is undefined')
    }

    // bob creates a channel
    const channelId = await bob.createChannel(
        {
            name: 'test_channel',
            parentSpaceId: spaceId,
            roleIds: [roleIdentifier.roleId],
        },
        bob.provider.wallet,
    )

    // alice joins the space
    await alice.joinTown(spaceId, alice.wallet)

    if (!channelId) {
        throw new Error('channelId is undefined')
    }

    // can she join it?
    await waitForWithRetries(() => alice.joinRoom(channelId))
    const alice_roomInfo = alice.getRoomData(channelId)
    expect(alice_roomInfo?.id.networkId).toEqual(channelId.networkId)
})
