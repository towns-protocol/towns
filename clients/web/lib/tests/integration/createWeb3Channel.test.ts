import { DataTypes } from '../../src/client/web3/shims/ZionSpaceManagerShim'
import { Permission } from '../../src/client/web3/ZionContractTypes'
import { RoomIdentifier, RoomVisibility } from '../../src/types/matrix-types'
import {
    createChannelWithEntitlement,
    createSpaceWithEntitlement,
    registerAndStartClients,
} from './helpers/TestUtils'

describe.skip('On-chain channel tests', () => {
    jest.setTimeout(30000)
    test('create channel on-chain', async () => {
        /* Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        // create a space with token entitlement to write
        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        const writePermission: DataTypes.PermissionStruct = { name: Permission.Write }

        const roomId = await createSpaceWithEntitlement(
            alice,
            [readPermission, writePermission],
            [],
        )
        let channel: RoomIdentifier | undefined

        /* Act */
        if (roomId) {
            // create a channel on-chain
            channel = await createChannelWithEntitlement(alice, {
                name: 'test_channel',
                visibility: RoomVisibility.Public,
                parentSpaceId: roomId,
            })
        }

        /* Assert */
        expect(channel).toBeDefined()
    })
})
