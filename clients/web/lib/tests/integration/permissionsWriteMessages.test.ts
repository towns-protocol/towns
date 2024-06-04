/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group core
 */
import {
    createTestSpaceGatedByTownsNfts,
    registerAndStartClients,
    registerAndStartClient,
    createTestChannelWithSpaceRoles,
    waitForWithRetries,
    createTestSpaceGatedByTownNft,
} from 'use-towns-client/tests/integration/helpers/TestUtils'

import {
    Permission,
    createExternalTokenStruct,
    getTestGatingNftAddress,
    NoopRuleData,
} from '@river-build/web3'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'

describe('write messages', () => {
    test.skip('Channel member cant write messages without permission (RuleEntitlement)', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await bob.fundWallet()

        // create a space with read only member role
        // ! there is a bug with default member role and modifying permissions on it, so creating a member role with read only permissions instead of later modifying it
        const spaceId = await createTestSpaceGatedByTownNft(bob, [Permission.Read])

        const councilNftAddress = await getTestGatingNftAddress(alice.opts.baseChainId)
        if (!councilNftAddress) {
            throw new Error('councilNftAddress is undefined')
        }
        const councilToken = createExternalTokenStruct([councilNftAddress])

        // if you create the space with a member role w/ write permissions, then later modify the role to remove write permissions,
        // there are weird entilement issues in the assertions

        // create write role
        const tx2 = await bob.createRoleTransaction(
            spaceId,
            'WriteRole',
            [Permission.Write],
            [],
            councilToken,
            bob.wallet,
        )

        await tx2.transaction?.wait()

        if (!spaceId) {
            throw new Error('Failed to create room')
        }

        // create a channel that has all the roles
        const channelId = await createTestChannelWithSpaceRoles(bob, {
            name: 'new channel',
            parentSpaceId: spaceId,
            roleIds: [], // empty roleIds = all roles
        })

        const spaceContent = Array.from(
            bob.casablancaClient?.streams
                .get(spaceId)
                ?.view.spaceContent.spaceChannelsMetadata.entries() ?? [],
        )
        const defaultChannelId = spaceContent.at(0)?.[0]
        expect(defaultChannelId).toBeDefined()
        console.log('defaultChannelId', defaultChannelId)

        // /** Act */
        // user to join the space by first checking if they can read.
        await alice.joinTown(spaceId, alice.wallet)

        // alice is joining the channel that has
        // a read only role
        // and a write only role that is gated by councilNft
        // alice does not have the councilNft
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

    // https://linear.app/hnt-labs/issue/HNT-6430/fix-flaky-permissionswritemessages
    test.skip('Channel member cant write messages without permission (UserEntitlement)', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await bob.fundWallet()

        // create a space with read only member role
        // ! there is a bug with default member role and modifying permissions on it, so creating a member role with read only permissions instead of later modifying it
        const spaceId = await createTestSpaceGatedByTownNft(bob, [Permission.Read])

        // if you create the space with a member role w/ write permissions, then later modify the role to remove write permissions,
        // there are weird entilement issues in the assertions

        // create write role with user entitlement for alice
        const tx2 = await bob.createRoleTransaction(
            spaceId,
            'WriteRole',
            // the contract will not update permissions if the length is 0
            // so when we remove the write permissions later, we still need to have the read permission
            [Permission.Read, Permission.Write],
            [alice.userId],
            NoopRuleData,
            bob.wallet,
        )

        await tx2.transaction?.wait()

        if (!spaceId) {
            throw new Error('Failed to create room')
        }

        // create a channel that has all the roles
        const channelId = await createTestChannelWithSpaceRoles(bob, {
            name: 'new channel',
            parentSpaceId: spaceId,
            roleIds: [], // empty roleIds = all roles
        })

        const spaceContent = Array.from(
            bob.casablancaClient?.streams
                .get(spaceId)
                ?.view.spaceContent.spaceChannelsMetadata.entries() ?? [],
        )
        const defaultChannelId = spaceContent.at(0)?.[0]
        expect(defaultChannelId).toBeDefined()
        console.log('defaultChannelId', defaultChannelId)

        // /** Act */
        // user to join the space by first checking if they can read.
        await alice.joinTown(spaceId, alice.wallet)

        // alice is joining the channel that has
        // a read only role
        // and a write only role that she is assigned to
        await alice.joinRoom(channelId)
        // bob sends a message to the room
        await bob.sendMessage(channelId, 'Hello tokenGrantedUser!')

        await waitFor(
            () => expect(alice.getMessages(channelId)).toContain('Hello tokenGrantedUser!'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        await alice.sendMessage(channelId, 'Hello Bob!')
        await waitFor(() => expect(alice.getMessages(channelId)).toContain('Hello Bob!'))

        const writeOnlyRole = await bob.spaceDapp.getRole(spaceId, 3)
        expect(writeOnlyRole?.name).toBe('WriteRole')
        expect(writeOnlyRole?.permissions).toContain(Permission.Write)
        expect(writeOnlyRole?.users).toContain(alice.userId)

        // now remove the write permission from alice
        const tx3 = await bob.updateRoleTransaction(
            spaceId,
            writeOnlyRole!.id,
            writeOnlyRole!.name,
            // keep the permissions.length > 1 so permissions are updated in contract
            [Permission.Read],
            [alice.userId],
            NoopRuleData,
            bob.wallet,
        )

        const receipt = await bob.waitForUpdateRoleTransaction(tx3)
        expect(receipt.status).toBe('Success')

        await waitFor(async () =>
            expect((await bob.spaceDapp.getRole(spaceId, 3))?.permissions).toStrictEqual([
                Permission.Read,
            ]),
        )

        // TODO check why on Casablanca the error does not show in the console
        // const consoleErrorSpy = jest.spyOn(global.console, 'error')
        /** Assert */
        // user sends a message to the room
        try {
            await alice.sendMessage(channelId, 'Goodbye Bob!')
        } catch (e) {
            expect((e as Error).message).toMatch(new RegExp('Unauthorised|permission_denied'))
        }

        await bob.sendMessage(channelId, 'Another Bob message')
        await waitFor(
            () => expect(alice.getMessages(channelId)).toContain('Another Bob message'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
        // bob should not receive the message
        expect(bob.getMessages(channelId)).not.toContain('Goodbye Bob!')
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
        const spaceId = await createTestSpaceGatedByTownsNfts(bob, [
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

        /** Act */

        // user to join the space by first checking if they can read.
        await tokenGrantedUser.joinTown(spaceId, tokenGrantedUser.wallet)
        await waitForWithRetries(() => tokenGrantedUser.joinRoom(channelId))
        // bob send 25 messages
        for (let i = 0; i < 25; i++) {
            await bob.sendMessage(channelId, `message ${i}`)
        }
        // user should expect membership
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
        const spaceId = await createTestSpaceGatedByTownsNfts(bob, [
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

        /** Act */
        // user to join the space by first checking if they can read.
        await tokenGrantedUser.joinTown(spaceId, tokenGrantedUser.wallet)
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
