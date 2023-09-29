/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 */
import { ClientEvent, NotificationCountType } from 'matrix-js-sdk'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownAndZionNfts,
    registerAndStartClients,
    registerAndStartClient,
    waitForWithRetries,
} from './helpers/TestUtils'

import { Permission } from '@river/web3'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { RoomVisibility } from '../../src/types/zion-types'
import { SyncState } from 'matrix-js-sdk/lib/sync'
import { TestConstants } from './helpers/TestConstants'
import { sleep, staticAssertNever } from '../../src/utils/zion-utils'
import { waitFor } from '@testing-library/dom'
import { SpaceProtocol } from '../../src/client/ZionClientTypes'

/// matrix notification counts are broken during sync, but they should work
/// between syncs. This test is to make sure that the counts are correct
describe('unreadMessageCount', () => {
    // usefull for debugging or running against cloud servers
    test('create room, invite user, accept invite, and send message, check unread counts', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerAndStartClient('alice', TestConstants.getWalletWithMemberNft())
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a space
        const spaceId = (await createTestSpaceGatedByTownAndZionNfts(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Private,
            },
        ))!
        // and a channel
        const channel_1 = (await createTestChannelWithSpaceRoles(bob, {
            name: 'channel 1',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Private,
            roleIds: [],
        }))!
        // and another channel
        const channel_2 = (await createTestChannelWithSpaceRoles(bob, {
            name: 'channel 2',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Private,
            roleIds: [],
        }))!
        // log
        console.log('!!!sync room ids', {
            space: spaceId.networkId,
            channel_1: channel_1.networkId,
            channel_2: channel_2.networkId,
        })

        const stopAlice = async () => {
            if (!alice.matrixClient) {
                throw new Error('alice matrix client is not defined')
            }
            alice.matrixClient.stopClient()
            await sleep(1000)
        }

        const startAlice = async () => {
            if (!alice.matrixClient) {
                throw new Error('alice matrix client is not defined')
            }
            const initialSync = new Promise<string>((resolve, reject) => {
                if (!alice.matrixClient) {
                    throw new Error('alice matrix client is not defined')
                }
                alice.matrixClient.once(ClientEvent.Sync, (state: SyncState) => {
                    if (state === SyncState.Prepared) {
                        resolve(state)
                    } else {
                        reject(new Error(`sync state is ${state}`))
                    }
                })
            })
            await alice.matrixClient.startClient()
            await initialSync
            console.log('!!!started alice', { syncData: alice.matrixClient.getSyncStateData() })
        }

        const countFor = (roomId: RoomIdentifier) => {
            if (!alice.matrixClient) {
                throw new Error('alice matrix client is not defined')
            }
            switch (roomId.protocol) {
                case SpaceProtocol.Matrix:
                    return alice.matrixClient
                        .getRoom(roomId.networkId)
                        ?.getUnreadNotificationCount(NotificationCountType.Total)
                case SpaceProtocol.Casablanca:
                    throw new Error('casablanca not implemented')
                default:
                    staticAssertNever(roomId)
            }
        }

        ////// Stop alice /////
        await stopAlice()

        // bob invites alice to the room
        await bob.inviteUser(spaceId, alice.getUserId()!)
        await bob.inviteUser(channel_1, alice.getUserId()!)
        await bob.inviteUser(channel_2, alice.getUserId()!)

        ////// Start alice /////
        await startAlice()

        // ali should see the room
        await waitFor(() => expect(alice.getRoomData(spaceId)).toBeDefined())
        // initially we have 0 unread messages for space and each channel
        await waitFor(() => expect(countFor(spaceId)).toBe(0))
        await waitFor(() => expect(countFor(channel_1)).toBe(0))
        await waitFor(() => expect(countFor(channel_2)).toBe(0))

        // alice joins the room
        await alice.joinTown(spaceId, alice.wallet)
        await waitForWithRetries(() => alice.joinRoom(channel_1))
        await waitForWithRetries(() => alice.joinRoom(channel_2))
        // expect our membership to be join
        await waitFor(() => expect(alice.getRoomData(spaceId)?.membership).toBe('join'))
        await waitFor(() => expect(alice.getRoomData(channel_1)?.membership).toBe('join'))
        await waitFor(() => expect(alice.getRoomData(channel_2)?.membership).toBe('join'))

        // Even after invite and join we have 0 unread messages for space and each channel
        await waitFor(() => expect(countFor(spaceId)).toBe(0))
        await waitFor(() => expect(countFor(channel_1)).toBe(0))
        await waitFor(() => expect(countFor(channel_2)).toBe(0))

        ////// Stop alice /////
        await stopAlice()

        // bob sends a message to the room
        await bob.sendMessage(channel_1, 'Hello Alice!')

        ////// Start alice /////
        await startAlice()

        // Wait for message decryption to complete, otherwise we may not see the message
        console.log(`!!!startAlice after message and sleep`, alice.matrixClient?.getSyncStateData())
        alice.logEvents(spaceId)
        alice.logEvents(channel_1)
        alice.logEvents(channel_2)

        // check our counts with extended timeout to await decryption
        await waitFor(
            () => expect(countFor(spaceId)).toBe(0),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        await waitFor(
            () => expect(countFor(channel_1)).toBe(2),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        await waitFor(
            () => expect(countFor(channel_2)).toBe(0),
            TestConstants.DecaDefaultWaitForTimeout,
        )

        // start clearing the notifications
        await alice.sendReadReceipt(channel_1)

        ////// Stop alice /////
        await stopAlice()

        ////// Start alice /////
        await startAlice()

        // and see the update
        await waitFor(() => expect(countFor(spaceId)).toBe(0))
        await waitFor(() => expect(countFor(channel_1)).toBe(0))
        await waitFor(() => expect(countFor(channel_2)).toBe(0))
        // clear
        await alice.sendReadReceipt(spaceId)
        // and see the update
        await waitFor(() => expect(countFor(spaceId)).toBe(0))
        await waitFor(() => expect(countFor(channel_1)).toBe(0))
        await waitFor(() => expect(countFor(channel_2)).toBe(0))
    }, 120000) // slow test that takes more than 60 seconds occasionally
}) // end describe
