/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { RoomVisibility } from '../../src/types/matrix-types'
import { registerAndStartClients } from './helpers/TestUtils'

/// Matrix rooms take a second before the client lib recognizes that they are encrypted 🤡
/// there's more to this
/// If the create channel doesn't wait for the room to be encrypted,
/// the user can send a message to the room before the room is encrypted
/// and that message will be stored in plain text in the room dag
describe('isEncrypted', () => {
    test('test that spaces and channels are encrypted when they are created', async () => {
        if (process.env.DISABLE_ENCRYPTION === 'true') {
            console.log('Skipping test because DISABLE_ENCRYPTION is true')
            return
        }
        // create clients
        const { bob } = await registerAndStartClients(['bob'])
        // bob creates a room
        const spaceId = await bob.createSpace({
            name: "bob's space",
            visibility: RoomVisibility.Public,
        })
        // is it encrypted?
        expect(bob.isRoomEncrypted(spaceId)).toBe(true)
        // bob creates a channel
        const channelId = await bob.createChannel({
            name: "bob's channel",
            visibility: RoomVisibility.Private,
            parentSpaceId: spaceId,
            roleIds: [],
        })
        // is it encrypted?
        expect(bob.isRoomEncrypted(channelId)).toBe(true)
    }) // end test
}) // end describe
