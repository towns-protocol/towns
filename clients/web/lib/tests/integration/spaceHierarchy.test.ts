/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { RoomVisibility } from '../../src/types/matrix-types'
import { RoomIdentifier } from '../../src/types/room-identifier'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithZionMemberRole,
    makeUniqueName,
    registerAndStartClients,
    registerLoginAndStartClient,
} from './helpers/TestUtils'

import { Permission } from '../../src/client/web3/ZionContractTypes'
import { TestConstants } from './helpers/TestConstants'

describe('spaceHierarchy', () => {
    jest.setTimeout(TestConstants.DefaultJestTimeout)
    test('create a public space and a public room, have user join space and search for space childs', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerLoginAndStartClient('alice', TestConstants.getWalletWithNft())
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

        const bob_spaceInfo = await bob.syncSpace(spaceId)
        expect(bob_spaceInfo?.children.length).toEqual(1)

        // alice peeks the space // todo https://github.com/HereNotThere/harmony/issues/188
        // await alice.client.peekInRoom(spaceId.matrixRoomId);
        // expect alice to see info about the space

        // alice joins the space
        await alice.joinRoom(spaceId)

        // alice syncs the space
        const alice_spaceInfo = await alice.syncSpace(spaceId)
        expect(alice_spaceInfo?.children.length).toEqual(1)

        // can she join it?
        const alice_roomInfo = await alice.joinRoom(roomId)
        expect(alice_roomInfo.id.matrixRoomId).toEqual(roomId.matrixRoomId)
    })
    test('create a private space and a public room, have user join space and search for space childs', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerLoginAndStartClient('alice', TestConstants.getWalletWithNft())
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

        const bob_spaceInfo = await bob.syncSpace(spaceId)
        expect(bob_spaceInfo?.children.length).toEqual(1)

        // alice syncs the space before getting an invite...
        const alice_spaceInfo_pre_join = await alice.syncSpace(spaceId)
        expect(alice_spaceInfo_pre_join?.children).toBeUndefined()

        // bob invites alice
        await bob.inviteUser(spaceId, alice.matrixUserId!)

        // alice joins the space
        await alice.joinRoom(spaceId)

        // alice syncs the space
        const alice_spaceInfo = await alice.syncSpace(spaceId)
        expect(alice_spaceInfo?.children.length).toEqual(1)

        // can she join it?
        const alice_roomInfo = await alice.joinRoom(roomId)
        expect(alice_roomInfo.id.matrixRoomId).toEqual(roomId.matrixRoomId)
    })
})
