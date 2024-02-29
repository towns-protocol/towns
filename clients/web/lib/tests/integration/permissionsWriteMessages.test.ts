/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group casablanca
 */
import {
    createTestSpaceGatedByTownAndZionNfts,
    registerAndStartClients,
    registerAndStartClient,
    createTestChannelWithSpaceRoles,
    waitForWithRetries,
    createTestSpaceGatedByTownNft,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { Permission, createExternalTokenStruct, getTestGatingNftAddress } from '@river/web3'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'

describe('write messages', () => {
    test('Channel member cant write messages without permission', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await bob.fundWallet()

        // create a space
        const spaceId = await createTestSpaceGatedByTownNft(bob, [
            Permission.Read,
            Permission.Write,
        ])

        if (!spaceId) {
            throw new Error('Failed to create room')
        }

        const membershipTokenAddress = await alice.spaceDapp.getTownMembershipTokenAddress(spaceId)
        const councilNftAddress = await getTestGatingNftAddress(alice.chainId)
        if (!councilNftAddress) {
            throw new Error('councilNftAddress is undefined')
        }
        const councilToken = createExternalTokenStruct([councilNftAddress])
        const bothToken = createExternalTokenStruct([
            councilNftAddress,
            membershipTokenAddress as `0x${string}`,
        ])
        const membershipToken = createExternalTokenStruct([membershipTokenAddress as `0x${string}`])

        // update the member role so only council nft holders can write
        const tx1 = await bob.updateRoleTransaction(
            spaceId,
            2,
            'Read only',
            [Permission.Read],
            [],
            membershipToken,
            bob.wallet,
        )
        await bob.waitForUpdateRoleTransaction(tx1)

        // create read only role
        const tx2 = await bob.createRoleTransaction(
            spaceId,
            'Member',
            [Permission.Read, Permission.Write],
            [],
            bothToken,
            bob.wallet,
        )

        await tx2.transaction?.wait()

        // create read only role
        const tx3 = await bob.createRoleTransaction(
            spaceId,
            'Read only',
            [Permission.Read],
            [],
            councilToken,
            bob.wallet,
        )
        await tx3.transaction?.wait()

        if (!spaceId) {
            throw new Error('Failed to create room')
        }

        // create a channel that has this read only role
        const channelId = await createTestChannelWithSpaceRoles(bob, {
            name: 'main channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })

        if (!channelId) {
            throw new Error('Failed to create room')
        }

        const spaceContent = Array.from(
            bob.casablancaClient?.streams
                .get(spaceId)
                ?.view.spaceContent.spaceChannelsMetadata.entries() ?? [],
        )
        const defaultChannelId = spaceContent.at(0)?.[0]
        console.log('defaultChannelId', defaultChannelId)

        // /** Act */
        // invite user to join the space by first checking if they can read.
        await alice.joinTown(spaceId, alice.wallet)
        await bob.inviteUser(channelId, alice.getUserId() as string)

        await alice.joinRoom(channelId)
        // bob sends a message to the room
        await bob.sendMessage(channelId, 'Hello tokenGrantedUser!')

        // TODO check why on Casablanca the error does not show in the console
        // const consoleErrorSpy = jest.spyOn(global.console, 'error')
        /** Assert */
        // user sends a message to the room
        try {
            await alice.sendMessage(channelId, 'Hello Bob!')
        } catch (e) {
            expect((e as Error).message).toMatch(new RegExp('Unauthorised|permission_denied'))
        }
        //expect(consoleErrorSpy).toHaveBeenCalled()
        await waitFor(
            () => expect(alice.getMessages(channelId)).toContain('Hello tokenGrantedUser!'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        // bob should not receive the message
        expect(bob.getMessages(channelId)).not.toContain('Hello Bob!')
    })

    test('Channel member can sync messages', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithTestGatingNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        const spaceId = await createTestSpaceGatedByTownAndZionNfts(bob, [
            Permission.Read,
            Permission.Write,
        ])

        if (!spaceId) {
            throw new Error('Failed to create room')
        }

        const channelId = await createTestChannelWithSpaceRoles(bob, {
            name: 'main channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })

        if (!channelId) {
            throw new Error('Failed to create room')
        }

        /** Act */

        // invite user to join the space by first checking if they can read.
        await bob.inviteUser(spaceId, tokenGrantedUser.getUserId() as string)
        await tokenGrantedUser.joinTown(spaceId, tokenGrantedUser.wallet)
        await waitForWithRetries(() => tokenGrantedUser.joinRoom(channelId))
        // bob send 25 messages (20 is our default initialSyncLimit)
        for (let i = 0; i < 25; i++) {
            await bob.sendMessage(channelId, `message ${i}`)
        }

        // /** Assert */

        // user should expect an invite to the room
        await waitFor(() => expect(tokenGrantedUser.getRoomData(channelId)).toBeDefined())

        // we should get more events
        await waitFor(() =>
            expect(tokenGrantedUser.getEvents(channelId).length).toBeGreaterThan(20),
        )
    }, 180_000)

    test('Channel member can write messages', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithTestGatingNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        const spaceId = await createTestSpaceGatedByTownAndZionNfts(bob, [
            Permission.Read,
            Permission.Write,
        ])

        if (!spaceId) {
            throw new Error('Failed to create room')
        }

        const channelId = await createTestChannelWithSpaceRoles(bob, {
            name: 'main channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })

        if (!channelId) {
            throw new Error('Failed to create room')
        }

        /** Act */
        // invite user to join the space by first checking if they can read.
        await tokenGrantedUser.joinTown(spaceId, tokenGrantedUser.wallet)
        await bob.inviteUser(channelId, tokenGrantedUser.getUserId() as string)
        await tokenGrantedUser.joinRoom(channelId)

        // bob sends a message to the room
        await bob.sendMessage(channelId, 'Hello tokenGrantedUser!')

        // user sends a message to the room
        await waitForWithRetries(() => tokenGrantedUser.sendMessage(channelId, 'Hello Bob!'))

        /** Assert */

        await waitFor(
            () => expect(bob.getMessages(channelId)).toContain('Hello Bob!'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
    }, 180_000)
})
