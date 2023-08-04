/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 * @group casablanca
 */
import { waitFor } from '@testing-library/dom'
import { ClientEvent, MatrixEvent } from 'matrix-js-sdk'
import { Permission } from '../../src/client/web3/ContractTypes'
import { SpaceProtocol } from '../../src/client/ZionClientTypes'
import { RoomVisibility } from '../../src/types/zion-types'
import {
    createTestSpaceWithEveryoneRole,
    getPrimaryProtocol,
    registerAndStartClients,
} from './helpers/TestUtils'
import { OLM_ALGORITHM, RiverEvent, make_ToDevice_KeyRequest } from '@towns/sdk'
import { setTimeout } from 'timers/promises'
import { ToDeviceOp } from '@river/proto'

describe('toDeviceMessage', () => {
    test('send toDeviceMessage', async () => {
        const primaryProtocol = getPrimaryProtocol()
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
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
        // needed for casablanca client to listen for toDeviceMessage
        await setTimeout(100)

        type Event = MatrixEvent | RiverEvent
        const bobsRecievedMessages: Event[] = []
        let bobUserId = ''

        if (primaryProtocol === SpaceProtocol.Matrix) {
            bob.matrixClient?.on(ClientEvent.ToDeviceEvent, (event: MatrixEvent) => {
                bobsRecievedMessages.push(event)
            })
            if (bob.getUserId() !== undefined) {
                bobUserId = bob.getUserId() as string
            }
        } else if (primaryProtocol === SpaceProtocol.Casablanca) {
            bob.casablancaClient?.on('toDeviceMessage', (_streamId: string, event: RiverEvent) => {
                bobsRecievedMessages.push(event)
            })

            /* todo jterzis 07/12/23: uncomment when CasablancaDecryptionExtension is implemented
            bob.casablancaClient?.on('eventDecrypted', (event: object, _err: Error | undefined) => {
                bobsRecievedMessages.push(event as RiverEvent)
            })
            */

            if (bob.casablancaClient?.userId) {
                bobUserId = bob.casablancaClient?.userId
            }
        } else {
            throw new Error('Unknown protocol')
        }

        const canSend = await alice.canSendToDeviceMessage(bobUserId)
        expect(canSend).toBe(true)
        const payload =
            primaryProtocol === SpaceProtocol.Matrix
                ? { content: 'foo' }
                : make_ToDevice_KeyRequest({
                      spaceId: spaceId.slug,
                      channelId: spaceId.slug,
                      algorithm: OLM_ALGORITHM,
                      senderKey: 'fakeSenderKey',
                      sessionId: 'fakeSessionId',
                      content: 'foo',
                  })
        await alice.sendToDeviceMessage(bobUserId, ToDeviceOp[ToDeviceOp.TDO_KEY_REQUEST], payload)

        await waitFor(
            () =>
                expect(
                    bobsRecievedMessages.find(
                        (e) =>
                            (e.getType() ||
                                (<RiverEvent>e).getWireContentToDevice()?.content?.op) ===
                            'TDO_KEY_REQUEST',
                    ),
                ).toBeDefined(),
            { timeout: 1000 },
        )
    })
})
