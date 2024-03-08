/**
 * @group casablanca
 */

import {
    registerAndStartClients,
    registerAndStartClient,
    waitForWithRetries,
    createTestSpaceGatedByTownsNfts,
} from './helpers/TestUtils'

import { Permission, createExternalTokenStruct, getTestGatingNftAddress } from '@river/web3'
import { TestConstants } from './helpers/TestConstants'
import { RoleIdentifier } from '../../src/types/web3-types'

test('create a public space and a public room, and have user join', async () => {
    // create clients
    // alice needs to have a valid nft in order to join bob's space / channel
    const alice = await registerAndStartClient('alice', TestConstants.getWalletWithTestGatingNft())
    const { bob } = await registerAndStartClients(['bob'])
    // bob needs funds to create a space
    await bob.fundWallet()
    // bob creates a space
    const spaceId = (await createTestSpaceGatedByTownsNfts(bob, [
        Permission.Read,
        Permission.Write,
    ])) as string

    const testGatingNftAddress = await getTestGatingNftAddress(bob.chainId)
    expect(testGatingNftAddress).toBeDefined()
    if (!testGatingNftAddress) {
        throw new Error('testGatingNftAddress is undefined')
    }
    const ruleData = createExternalTokenStruct([testGatingNftAddress])
    const roleIdentifier: RoleIdentifier | undefined = await bob.createRole(
        spaceId,
        'newRoleName',
        [Permission.Read, Permission.Write],
        [],
        ruleData,
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
    expect(alice_roomInfo?.id).toEqual(channelId)
})
