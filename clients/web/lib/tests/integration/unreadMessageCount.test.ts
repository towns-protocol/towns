/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { ClientEvent, NotificationCountType } from 'matrix-js-sdk'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerLoginAndStartClient,
} from './helpers/TestUtils'

import { Permission } from '../../src/client/web3/ContractTypes'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { RoomVisibility } from '../../src/types/matrix-types'
import { SyncState } from 'matrix-js-sdk/lib/sync'
import { TestConstants } from './helpers/TestConstants'
import { sleep } from '../../src/utils/zion-utils'
import { waitFor } from '@testing-library/dom'

/// matrix notification counts are broken during sync, but they should work
/// between syncs. This test is to make sure that the counts are correct
describe('unreadMessageCount', () => {
    // usefull for debugging or running against cloud servers
    test('create room, invite user, accept invite, and send message, check unread counts', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerLoginAndStartClient('alice', TestConstants.getWalletWithNft())
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a space
        const spaceId = (await createTestSpaceWithZionMemberRole(
            bob,
            [Permission.Read, Permission.Write],
            [],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Private,
            },
        )) as RoomIdentifier
        // and a channel
        const channel_1 = (await createTestChannelWithSpaceRoles(bob, {
            name: 'channel 1',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Private,
            roleIds: [],
        })) as RoomIdentifier
        // and another channel
        const channel_2 = (await createTestChannelWithSpaceRoles(bob, {
            name: 'channel 2',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Private,
            roleIds: [],
        })) as RoomIdentifier
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
            await alice.matrixClient.startClient()
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
            await initialSync
        }

        const countFor = (roomId: string) => {
            if (!alice.matrixClient) {
                throw new Error('alice matrix client is not defined')
            }
            return alice.matrixClient
                .getRoom(roomId)
                ?.getUnreadNotificationCount(NotificationCountType.Total)
        }

        ////// Stop alice /////
        await stopAlice()

        // bob invites alice to the room
        await bob.inviteUser(spaceId, alice.matrixUserId!)
        await bob.inviteUser(channel_1, alice.matrixUserId!)
        await bob.inviteUser(channel_2, alice.matrixUserId!)

        ////// Start alice /////
        await startAlice()

        // ali should see the room
        await waitFor(() => expect(alice.getRoom(spaceId)).toBeDefined())
        // initially we have 1 unread messages for space and each channel
        await waitFor(
            () => expect(countFor(spaceId.networkId)).toBe(0), // we don't get notifications for invites
            TestConstants.DefaultWaitForTimeout,
        )
        // alice joins the room
        await alice.joinRoom(spaceId)
        await alice.joinRoom(channel_1)
        await alice.joinRoom(channel_2)
        // expect our membership to be join
        await waitFor(
            () => expect(alice.getRoom(spaceId)?.getMyMembership()).toBe('join'),
            TestConstants.DefaultWaitForTimeout,
        )
        await waitFor(
            () => expect(alice.getRoom(channel_1)?.getMyMembership()).toBe('join'),
            TestConstants.DefaultWaitForTimeout,
        )
        await waitFor(
            () => expect(alice.getRoom(channel_2)?.getMyMembership()).toBe('join'),
            TestConstants.DefaultWaitForTimeout,
        )

        ////// Stop alice /////
        await stopAlice()

        // bob sends a message to the room
        await bob.sendMessage(channel_1, 'Hello Alice!')

        ////// Start alice /////
        await startAlice()

        // che our counts
        await waitFor(
            () => expect(countFor(spaceId.networkId)).toBe(1),
            TestConstants.DefaultWaitForTimeout,
        )
        await waitFor(
            () => expect(countFor(channel_1.networkId)).toBe(2),
            TestConstants.DefaultWaitForTimeout,
        )
        await waitFor(
            () => expect(countFor(channel_2.networkId)).toBe(1),
            TestConstants.DefaultWaitForTimeout,
        )
        // start clearing the notifications
        await alice.sendReadReceipt(channel_1)

        ////// Stop alice /////
        await stopAlice()

        ////// Start alice /////
        await startAlice()

        // and see the update
        await waitFor(
            () => expect(countFor(channel_1.networkId)).toBe(0),
            TestConstants.DefaultWaitForTimeout,
        )
        // clear
        await alice.sendReadReceipt(spaceId)
        // and see the update
        await waitFor(
            () => expect(countFor(spaceId.networkId)).toBe(0),
            TestConstants.DefaultWaitForTimeout,
        )
    }) // end test
}) // end describe
