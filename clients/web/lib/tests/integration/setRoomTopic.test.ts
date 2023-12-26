/**
 * @group dendrite
 */
import {
    createTestSpaceGatedByTownAndZionNfts,
    registerAndStartClients,
    registerAndStartClient,
} from './helpers/TestUtils'

import { TestConstants } from './helpers/TestConstants'
import { getFilteredRolesFromSpace, Permission } from '@river/web3'

describe('On-chain channel creation tests', () => {
    test('update space topic with owner role', async () => {
        /* Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        // create a space with token entitlement to write
        const roomId = (await createTestSpaceGatedByTownAndZionNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])) as string

        /* Act */
        await alice.setRoomTopic(roomId, 'test topic')

        const topic = await alice.getRoomTopic(roomId)
        /* Assert */
        expect(topic).toEqual('test topic')
    })

    test('update channel topic with owner role', async () => {
        /* Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        // create a space with token entitlement to write
        const roomId = (await createTestSpaceGatedByTownAndZionNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])) as string

        const roleIds: number[] = []
        const allowedRoles = await getFilteredRolesFromSpace(alice.spaceDapp, roomId)
        for (const r of allowedRoles) {
            roleIds.push(r.roleId)
        }
        const channel = (await alice.createChannel(
            {
                name: 'test_channel',
                parentSpaceId: roomId,
                roleIds,
            },
            alice.provider.wallet,
        )) as string

        /* Act */
        await alice.setRoomTopic(channel, 'test topic')

        const topic = await alice.getRoomTopic(channel)
        /* Assert */
        expect(topic).toEqual('test topic')
    })

    test('allow update space topic with ModifySpaceSettings permission', async () => {
        /* Arrange */
        const tokenGrantedUser = await registerAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithTestGatingNft(),
        )
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        // create a space with token entitlement to modify space settings
        const spaceId = (await createTestSpaceGatedByTownAndZionNfts(alice, [
            Permission.Read,
            Permission.ModifySpaceSettings,
        ])) as string

        await alice.inviteUser(spaceId, tokenGrantedUser.getUserId() as string)
        await tokenGrantedUser.joinTown(spaceId, tokenGrantedUser.wallet)

        /* Act */
        await tokenGrantedUser.setRoomTopic(spaceId, 'test topic')
        const topic = await alice.getRoomTopic(spaceId)

        /* Assert */
        expect(topic).toEqual('test topic')
        console.log('topic', topic)
    })
})
