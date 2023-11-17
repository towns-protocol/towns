/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group casablanca
 */
import { waitFor } from '@testing-library/dom'
import { MatrixEvent } from 'matrix-js-sdk'
import { Permission } from '@river/web3'
import { createTestSpaceGatedByTownNft, registerAndStartClients } from './helpers/TestUtils'
import { OLM_ALGORITHM, make_ToDevice_KeyRequest } from '@river/sdk'
import { setTimeout } from 'timers/promises'
import { ToDeviceMessage, ToDeviceOp, UserPayload_ToDevice } from '@river/proto'

describe('toDeviceMessage', () => {
    test('send toDeviceMessage', async () => {
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        await bob.fundWallet()

        const spaceId = (await createTestSpaceGatedByTownNft(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
            },
        ))!

        await alice.joinTown(spaceId, alice.wallet)
        // needed for casablanca client to listen for toDeviceMessage
        await setTimeout(100)

        type Event = MatrixEvent | UserPayload_ToDevice
        const bobsRecievedMessages: Event[] = []
        let bobUserId = ''

        bob.casablancaClient?.on(
            'toDeviceMessage',
            (_streamId: string, event: UserPayload_ToDevice, _senderUserId: string): void => {
                bobsRecievedMessages.push(event)
            },
        )

        if (bob.casablancaClient?.userId) {
            bobUserId = bob.casablancaClient?.userId
        }

        const canSend = await alice.canSendToDeviceMessage(bobUserId)
        expect(canSend).toBe(true)
        const payload = make_ToDevice_KeyRequest({
            streamId: spaceId.slug,
            algorithm: OLM_ALGORITHM,
            senderKey: 'fakeSenderKey',
            sessionId: 'fakeSessionId',
            content: 'foo',
        })
        await alice.casablancaClient?.encryptAndSendToDevicesMessage(
            bobUserId,
            new ToDeviceMessage(payload),
            ToDeviceOp[ToDeviceOp.TDO_KEY_REQUEST],
        )

        await waitFor(
            () =>
                expect(
                    bobsRecievedMessages.find(
                        (e) =>
                            ((<UserPayload_ToDevice>e).op || e.getType()) ===
                            ToDeviceOp.TDO_KEY_REQUEST,
                    ),
                ).toBeDefined(),
            { timeout: 1000 },
        )
    })
})
