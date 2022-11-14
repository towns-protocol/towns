import { DataTypes } from '../../src/client/web3/shims/ZionSpaceManagerShim'
import { Permission } from '../../src/client/web3/ZionContractTypes'
import { RoomIdentifier, RoomVisibility } from '../../src/types/matrix-types'
import {
    createTestChannelWithEntitlement,
    createTestSpaceWithEntitlement,
    registerAndStartClients,
} from './helpers/TestUtils'

describe('On-chain channel tests', () => {
    jest.setTimeout(30000)
    test('create channel on-chain', async () => {
        /* Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        // create a space with token entitlement to write
        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        const writePermission: DataTypes.PermissionStruct = { name: Permission.Write }

        const roomId = await createTestSpaceWithEntitlement(
            alice,
            [readPermission, writePermission],
            [],
        )
        let channel: RoomIdentifier | undefined

        /* Act */
        if (roomId) {
            // create a channel on-chain
            channel = await createTestChannelWithEntitlement(alice, {
                name: 'test_channel',
                visibility: RoomVisibility.Public,
                parentSpaceId: roomId,
            })
        }

        /* Assert */
        expect(channel).toBeDefined()
    })
})
