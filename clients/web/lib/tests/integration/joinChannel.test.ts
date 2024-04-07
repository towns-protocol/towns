/**
 * @group core
 */

import {
    registerAndStartClients,
    registerAndStartClient,
    waitForWithRetries,
    createTestSpaceGatedByTownsNfts,
    EVERYONE_ADDRESS,
} from './helpers/TestUtils'

import { NoopRuleData, Permission, getTestGatingNftAddress } from '@river-build/web3'
import { TestConstants } from './helpers/TestConstants'
import { RoleIdentifier } from '../../src/types/web3-types'

// https://linear.app/hnt-labs/issue/HNT-5149/fix-channelsettingstest-and-joinchanneltest
test('create a public space and a public room, and have user join', async () => {
    // create clients
    // alice needs to have a valid nft in order to join bob's space / channel
    const alice = await registerAndStartClient('alice', TestConstants.getWalletWithTestGatingNft())
    const { bob } = await registerAndStartClients(['bob'])
    // bob needs funds to create a space
    await bob.fundWallet()
    // bob creates a space
    const spaceId = await createTestSpaceGatedByTownsNfts(bob, [Permission.Read, Permission.Write])

    const testGatingNftAddress = await getTestGatingNftAddress(bob.opts.baseChainId)
    expect(testGatingNftAddress).toBeDefined()
    if (!testGatingNftAddress) {
        throw new Error('testGatingNftAddress is undefined')
    }
    // TODO: this should be the rule data for the role that is created once xchain work is completed
    // const ruleData = createOperationsTree([
    //     {
    //         address: testGatingNftAddress,
    //         chainId: BigInt(bob.chainId),
    //     },
    // ])
    const roleIdentifier: RoleIdentifier | undefined = await bob.createRole(
        spaceId,
        'newRoleName',
        [Permission.Read, Permission.Write],
        [EVERYONE_ADDRESS], // TODO: remove EVERYONE_ADDRESS once xchain work is completed
        NoopRuleData,
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
