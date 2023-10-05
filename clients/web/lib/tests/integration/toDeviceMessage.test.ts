/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 * @group casablanca
 */
import { waitFor } from '@testing-library/dom'
import { MatrixEvent } from 'matrix-js-sdk'
import { Permission } from '@river/web3'
import { RoomVisibility } from '../../src/types/zion-types'
import { createTestSpaceGatedByTownNft, registerAndStartClients } from './helpers/TestUtils'
import { OLM_ALGORITHM, RiverEvent, make_ToDevice_KeyRequest } from '@river/sdk'
import { setTimeout } from 'timers/promises'
import { ToDeviceOp } from '@river/proto'

describe('toDeviceMessage', () => {
    test('send toDeviceMessage', async () => {
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        await bob.fundWallet()

        const spaceId = (await createTestSpaceGatedByTownNft(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Public,
            },
        ))!

        await alice.joinTown(spaceId, alice.wallet)
        // needed for casablanca client to listen for toDeviceMessage
        await setTimeout(100)

        type Event = MatrixEvent | RiverEvent
        const bobsRecievedMessages: Event[] = []
        let bobUserId = ''

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

        const canSend = await alice.canSendToDeviceMessage(bobUserId)
        expect(canSend).toBe(true)
        const payload = make_ToDevice_KeyRequest({
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
