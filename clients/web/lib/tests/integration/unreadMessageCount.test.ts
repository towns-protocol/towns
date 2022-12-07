/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { RoomIdentifier, RoomVisibility } from '../../src/types/matrix-types'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerLoginAndStartClient,
} from './helpers/TestUtils'

import { ClientEvent } from 'matrix-js-sdk'
import { IUnreadNotificationCounts } from '../../src/client/store/CustomMatrixStore'
import { Permission } from '../../src/client/web3/ZionContractTypes'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'

describe('unreadMessageCount', () => {
    // usefull for debugging or running against cloud servers
    jest.setTimeout(TestConstants.DefaultJestTimeout)
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
            space: spaceId.matrixRoomId,
            channel_1: channel_1.matrixRoomId,
            channel_2: channel_2.matrixRoomId,
        })
        // set up some local data
        const alicesLastNotifications: Record<string, IUnreadNotificationCounts> = {}
        // add a listner
        alice.on(ClientEvent.Sync, () => {
            console.log('!!!sync', alice.store.lastSyncData)
            const newNotifications = alice.store.getLastUnreadNotificationCounts()
            if (newNotifications) {
                Object.entries(newNotifications).forEach(
                    ([roomId, nots]) => (alicesLastNotifications[roomId] = nots),
                )
            }
        })
        // bob invites alice to the room
        await bob.inviteUser(spaceId, alice.matrixUserId!)
        await bob.inviteUser(channel_1, alice.matrixUserId!)
        await bob.inviteUser(channel_2, alice.matrixUserId!)
        // alice should see the room
        await waitFor(
            () => expect(alice.getRoom(spaceId)).toBeDefined(),
            TestConstants.DefaultWaitForTimeout,
        )
        // initially we have 1 unread messages for space and each channel
        await waitFor(
            () =>
                expect(
                    alicesLastNotifications?.[spaceId.matrixRoomId]?.notification_count,
                ).toBeUndefined(), // we don't get notifications for invites
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
        // bob sends a message to the room
        await bob.sendMessage(channel_1, 'Hello Alice!')

        // BUG https://linear.app/hnt-labs/issue/HNT-211/in-tests-sending-a-message-from-one-client-doesnt-immediately-update
        // alice should see the message, but it takes a moment for the client to sync
        // check our counts
        await waitFor(
            () =>
                expect(alicesLastNotifications?.[spaceId.matrixRoomId]?.notification_count).toBe(1),
            TestConstants.DefaultWaitForTimeout,
        )
        await waitFor(
            () =>
                expect(alicesLastNotifications?.[channel_1.matrixRoomId]?.notification_count).toBe(
                    2,
                ),
            TestConstants.DefaultWaitForTimeout,
        )
        await waitFor(
            () =>
                expect(alicesLastNotifications?.[channel_2.matrixRoomId]?.notification_count).toBe(
                    1,
                ),
            TestConstants.DefaultWaitForTimeout,
        )
        // start clearing the notifications
        await alice.sendReadReceipt(channel_1)
        // and see the update
        await waitFor(
            () =>
                expect(alicesLastNotifications?.[channel_1.matrixRoomId]?.notification_count).toBe(
                    0,
                ),
            TestConstants.DefaultWaitForTimeout,
        )
        // clear
        await alice.sendReadReceipt(spaceId)
        // and see the update
        await waitFor(
            () =>
                expect(alicesLastNotifications?.[spaceId.matrixRoomId]?.notification_count).toBe(0),
            TestConstants.DefaultWaitForTimeout,
        )
    }) // end test
}) // end describe
