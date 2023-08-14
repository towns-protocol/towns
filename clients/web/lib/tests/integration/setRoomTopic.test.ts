/**
 * @group dendrite
 */
import {
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerAndStartClient,
} from './helpers/TestUtils'

import { Permission } from '../../src/client/web3/ContractTypes'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { RoomVisibility } from '../../src/types/zion-types'
import { getFilteredRolesFromSpace } from '../../src/client/web3/ContractHelpers'
import { TestConstants } from './helpers/TestConstants'
import { assert } from 'console'

describe('On-chain channel creation tests', () => {
    test('update space topic with owner role', async () => {
        /* Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        // create a space with token entitlement to write
        const roomId = (await createTestSpaceWithZionMemberRole(alice, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier

        /* Act */
        await alice.setRoomTopic(roomId, 'test topic')

        const topic = await alice.getRoomTopic(roomId)
        /* Assert */
        assert(topic === 'test topic')
    })

    test('update channel topic with owner role', async () => {
        /* Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        // create a space with token entitlement to write
        const roomId = (await createTestSpaceWithZionMemberRole(alice, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier

        const roleIds: number[] = []
        const allowedRoles = await getFilteredRolesFromSpace(alice, roomId.networkId)
        for (const r of allowedRoles) {
            roleIds.push(r.roleId)
        }
        const channel = (await alice.createChannel(
            {
                name: 'test_channel',
                visibility: RoomVisibility.Public,
                parentSpaceId: roomId,
                roleIds,
            },
            alice.provider.wallet,
        )) as RoomIdentifier

        /* Act */
        await alice.setRoomTopic(channel, 'test topic')

        const topic = await alice.getRoomTopic(channel)
        /* Assert */
        assert(topic === 'test topic')
    })

    test('allow update space topic with ModifySpaceSettings permission', async () => {
        /* Arrange */
        const tokenGrantedUser = await registerAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithMemberNft(),
        )
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        // create a space with token entitlement to modify space settings
        const roomId = (await createTestSpaceWithZionMemberRole(alice, [
            Permission.Read,
            Permission.ModifySpaceSettings,
        ])) as RoomIdentifier

        await alice.inviteUser(roomId, tokenGrantedUser.getUserId() as string)
        await tokenGrantedUser.joinRoom(roomId)

        /* Act */
        await tokenGrantedUser.setRoomTopic(roomId, 'test topic')
        const topic = await alice.getRoomTopic(roomId)

        /* Assert */
        assert(topic === 'test topic')
    })
})
