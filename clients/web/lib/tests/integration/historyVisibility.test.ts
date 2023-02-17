/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { waitFor } from '@testing-library/react'
import { MatrixEvent } from 'matrix-js-sdk'
import { Permission } from '../../src/client/web3/ContractTypes'
import { SpaceProtocol } from '../../src/client/ZionClientTypes'
import { RoomVisibility } from '../../src/types/zion-types'
import { sleep } from '../../src/utils/zion-utils'
import { TestConstants } from './helpers/TestConstants'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    makeUniqueName,
    registerAndStartClients,
} from './helpers/TestUtils'
import { ZionTestClient } from './helpers/ZionTestClient'

describe('historyVisibility', () => {
    test('create public room, send message, join second user, read message', async () => {
        // create bob
        const { bob, john } = await registerAndStartClients(['bob', 'john'])
        //
        await bob.fundWallet()
        // bob creates a room
        const spaceId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: makeUniqueName('bobsroom'),
                visibility: RoomVisibility.Public,
            },
        ))!

        const roomId = await createTestChannelWithSpaceRoles(bob, {
            parentSpaceId: spaceId,
            name: 'bobs channel',
            visibility: RoomVisibility.Public,
            roleIds: [],
        })

        if (!roomId) {
            throw new Error('roomId is undefined')
        }

        await john.joinRoom(spaceId)

        await john.joinRoom(roomId)
        // if we don't wait for encryption, we'll send unencrypted messages :(
        await waitFor(() => expect(john.isRoomEncrypted(roomId)).toBeTruthy())

        await john.sendMessage(roomId, "I'm John!")

        await waitFor(() =>
            expect(
                bob
                    .getEvents_TypedRoomMessage(roomId)
                    .find((event) => event.content.body === "I'm John!"),
            ).toBeDefined(),
        )

        await john.logout()

        await waitFor(() => expect(bob.isRoomEncrypted(roomId)).toBeTruthy())
        await bob.sendMessage(roomId, 'Hello World!')
        // create alice (important to do in this order, we had a bug were alice
        // would not be able to see messages if she registered after bob sent a message)
        const { alice } = await registerAndStartClients(['alice'])
        // alice joins the room
        await alice.joinRoom(spaceId)
        await alice.joinRoom(roomId)
        if (roomId.protocol === SpaceProtocol.Matrix) {
            // alice should eventually see the room
            await waitFor(() => expect(alice.matrixClient?.getRoom(roomId.networkId)).toBeTruthy())
            // get the room
            const alicesRoom = alice.matrixClient!.getRoom(roomId.networkId)!

            await sleep(1)

            // await decryptRoom(alice, bob, alicesRoom, 2)

            // and we should see the message
            await waitFor(
                () =>
                    expect(
                        alicesRoom
                            .getLiveTimeline()
                            .getEvents()
                            .find(
                                (event: MatrixEvent) => event.getContent().body === 'Hello World!',
                            ),
                    ).toBeDefined(),
                TestConstants.DoubleDefaultWaitForTimeout,
            )

            await waitFor(() =>
                expect(
                    alicesRoom
                        .getLiveTimeline()
                        .getEvents()
                        .find((event: MatrixEvent) => event.getContent().body === "I'm John!"),
                ).toBeDefined(),
            )
        } else {
            expect(false) // TODO https://linear.app/hnt-labs/issue/HNT-634/getroom-for-casablanca
        }

        await alice.sendMessage(roomId, "I'm Alice!")

        await alice.logout()

        await john.loginWalletAndStartClient()

        await waitFor(() => expect(john.matrixClient?.getRoom(roomId.networkId)).toBeTruthy())
        const johnsRoom = john.matrixClient!.getRoom(roomId.networkId)!

        //await decryptRoom(john, bob, johnsRoom, 3)
        //
        console.log(
            'johns room',
            johnsRoom
                .getLiveTimeline()
                .getEvents()
                .map(
                    (event: MatrixEvent) =>
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                        `${event.getType()} ${event.getContent().body ?? ''}`,
                ),
        )
        // and we should see the message
        await waitFor(
            () =>
                expect(
                    johnsRoom
                        .getLiveTimeline()
                        .getEvents()
                        .find((event: MatrixEvent) => event.getContent().body === 'Hello World!'),
                ).toBeDefined(),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        await waitFor(() =>
            expect(
                johnsRoom
                    .getLiveTimeline()
                    .getEvents()
                    .find((event: MatrixEvent) => event.getContent().body === "I'm John!"),
            ).toBeDefined(),
        )

        await waitFor(() =>
            expect(
                johnsRoom
                    .getLiveTimeline()
                    .getEvents()
                    .find((event: MatrixEvent) => event.getContent().body === "I'm Alice!"),
            ).toBeDefined(),
        )

        // create a new client with same wallet, but different deviceId/auth
        const alice2 = new ZionTestClient(
            alice.chainId,
            'alice2',
            alice.props,
            alice.provider,
            alice.delegateWallet,
        )

        await alice2.loginWalletAndStartClient()

        expect(alice2.auth?.deviceId).not.toEqual(alice.auth?.deviceId)
        await waitFor(() => expect(alice2.matrixClient?.getRoom(roomId.networkId)).toBeTruthy())
        const alice2sRoom = john.matrixClient!.getRoom(roomId.networkId)!

        await waitFor(
            () =>
                expect(
                    alice2sRoom
                        .getLiveTimeline()
                        .getEvents()
                        .find((event: MatrixEvent) => event.getContent().body === 'Hello World!'),
                ).toBeDefined(),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        await waitFor(() =>
            expect(
                alice2sRoom
                    .getLiveTimeline()
                    .getEvents()
                    .find((event: MatrixEvent) => event.getContent().body === "I'm John!"),
            ).toBeDefined(),
        )

        await waitFor(() =>
            expect(
                alice2sRoom
                    .getLiveTimeline()
                    .getEvents()
                    .find((event: MatrixEvent) => event.getContent().body === "I'm Alice!"),
            ).toBeDefined(),
        )
    })
})
