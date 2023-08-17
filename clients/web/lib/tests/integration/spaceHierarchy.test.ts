/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 */
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithZionMemberRole,
    makeUniqueName,
    registerAndStartClients,
    registerAndStartClient,
    waitForWithRetries,
} from './helpers/TestUtils'

import { Permission } from '../../src/client/web3/ContractTypes'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { RoomVisibility } from '../../src/types/zion-types'
import { TestConstants } from './helpers/TestConstants'

describe('spaceHierarchy', () => {
    // TODO: https://linear.app/hnt-labs/issue/HNT-1614/testsintegrationspacehierarchytestts
    test('create a public space and a public room, have user join space and search for space childs', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerAndStartClient('alice', TestConstants.getWalletWithMemberNft())
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a space
        const spaceId = (await createTestSpaceWithZionMemberRole(
            bob,
            [Permission.Read, Permission.Write],
            [],
        )) as RoomIdentifier

        // bob creates a room
        const roomId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })) as RoomIdentifier

        const bob_spaceInfo = await bob.syncSpace(spaceId, bob.provider.wallet.address)
        expect(bob_spaceInfo?.children.length).toEqual(2)

        // alice peeks the space // todo https://github.com/HereNotThere/harmony/issues/188
        // await alice.client.peekInRoom(spaceId.networkId);
        // expect alice to see info about the space

        // alice joins the space
        await alice.joinRoom(spaceId)

        // alice syncs the space
        const alice_spaceInfo = await alice.syncSpace(spaceId, alice.provider.wallet.address)
        expect(alice_spaceInfo?.children.length).toEqual(2)

        // can she join it?
        await waitForWithRetries(() => alice.joinRoom(roomId))
        const alice_roomInfo = alice.getRoomData(roomId)
        expect(alice_roomInfo?.id.networkId).toEqual(roomId.networkId)
    })
    test('create a private space and a public room, have user join space and search for space childs', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerAndStartClient('alice', TestConstants.getWalletWithMemberNft())
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a space
        const spaceId = (await createTestSpaceWithZionMemberRole(
            bob,
            [Permission.Read, Permission.Write],
            [],
            {
                name: makeUniqueName('bobs space'),
                visibility: RoomVisibility.Private,
            },
        )) as RoomIdentifier

        // bob creates a room
        const roomId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })) as RoomIdentifier

        const bob_spaceInfo = await bob.syncSpace(spaceId, bob.provider.wallet.address)
        expect(bob_spaceInfo?.children.length).toEqual(2)

        // alice syncs the space before getting an invite...
        const alice_spaceInfo_pre_join = await alice.syncSpace(
            spaceId,
            alice.provider.wallet.address,
        )
        expect(alice_spaceInfo_pre_join?.children).toBeUndefined()

        // bob invites alice
        await bob.inviteUser(spaceId, alice.getUserId()!)

        // alice joins the space
        await alice.joinRoom(spaceId)

        // alice syncs the space
        const alice_spaceInfo = await alice.syncSpace(spaceId, alice.provider.wallet.address)
        expect(alice_spaceInfo?.children.length).toEqual(2)

        // can she join it?
        await waitForWithRetries(() => alice.joinRoom(roomId))
        const alice_roomInfo = alice.getRoomData(roomId)
        expect(alice_roomInfo?.id.networkId).toEqual(roomId.networkId)
    })
})
