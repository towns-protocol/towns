/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 */
import { waitFor } from '@testing-library/dom'
import { ClientEvent, MatrixEvent } from 'matrix-js-sdk'
import { Permission } from '../../src/client/web3/ContractTypes'
import { SpaceProtocol } from '../../src/client/ZionClientTypes'
import { RoomVisibility } from '../../src/types/zion-types'
import { createTestSpaceWithEveryoneRole, registerAndStartClients } from './helpers/TestUtils'

describe('toDeviceMessage', () => {
    test('send toDeviceMessage', async () => {
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        const primaryProtocol = bob.opts.primaryProtocol

        await bob.fundWallet()

        const spaceId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Public,
            },
        ))!

        await alice.joinRoom(spaceId)

        const bobsRecievedMessages: MatrixEvent[] = []

        if (primaryProtocol === SpaceProtocol.Matrix) {
            bob.matrixClient?.on(ClientEvent.ToDeviceEvent, (event: MatrixEvent) => {
                bobsRecievedMessages.push(event)
            })
        } else {
            throw new Error('not implemented')
        }

        await waitFor(() => expect(alice.canSendToDeviceMessage(bob.getUserId()!)).toEqual(true))

        await alice.sendToDeviceMessage(bob.getUserId()!, 'm.zion.foo', { foo: 'bar' })

        await waitFor(() =>
            expect(bobsRecievedMessages.find((e) => e.getType() === 'm.zion.foo')).toBeDefined(),
        )
    })
})
