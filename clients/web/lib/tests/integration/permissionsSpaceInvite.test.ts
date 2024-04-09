/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group core
 */
import {
    createTestSpaceGatedByTownsNfts,
    registerAndStartClients,
    registerAndStartClient,
    createTestSpaceGatedByTownNft,
    createTestChannelWithSpaceRoles,
} from 'use-towns-client/tests/integration/helpers/TestUtils'

import { Permission } from '@river-build/web3'
import { TestConstants } from './helpers/TestConstants'
import { TownsTestClient } from './helpers/TownsTestClient'
import { sleep } from '../../src/utils/towns-utils'
import { check } from '@river-build/dlog'
import { isDefined } from '@river/sdk'

describe('space invite', () => {
    test('Inviter is not allowed due to missing Invite permission', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob, einstein } = await registerAndStartClients(['alice', 'bob', 'einstein'])
        await bob.fundWallet()

        // create a space with token entitlement
        const bobsSpaceId = await createTestSpaceGatedByTownsNfts(bob, [Permission.Read])
        // have alice create a space so she can create a user stream
        const aliceSpaceId = await createTestSpaceGatedByTownsNfts(alice, [Permission.Read])
        // have enstein join alice space and become a real user
        await einstein.joinTown(aliceSpaceId, einstein.wallet)

        /** Act */
        // invite users to join the space.
        try {
            const einsteinUserId = einstein.getUserId()
            if (bobsSpaceId && einsteinUserId) {
                // TODO: add an assertion on inviteUser by typing return value
                await alice.inviteUser(bobsSpaceId, einsteinUserId)
            }
        } catch (e) {
            /** Assert */
            expect((e as Error).message).toMatch(
                new RegExp('Inviter not allowed|permission_denied'),
            )
            return
        }
        expect(true).toEqual(false)
    }) // end test

    // Broken, need token entitlement on town https://linear.app/hnt-labs/issue/HNT-5239/fix-permissionsspaceinvite-test-for-token-entitlement
    test.skip('Invitee is not allowed to write to token gated space without token', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        const roomId = await createTestSpaceGatedByTownsNfts(bob, [
            Permission.Read,
            Permission.Write,
        ])

        const isEntitledRead = await alice.isEntitled(
            roomId,
            '',
            alice.provider.wallet.address,
            Permission.Read,
        )
        const isEntitledWrite = await alice.isEntitled(
            roomId,
            '',
            alice.provider.wallet.address,
            Permission.Write,
        )
        /** Act */
        // invite user to join the space by first checking if they can read.
        if (roomId && alice.getUserId()) {
            !isEntitledRead && (await bob.inviteUser(roomId, alice.getUserId()))
        }
        /** Assert */
        expect(isEntitledRead).toBe(false)
        // alice can't write because she doesn't have token entitlement
        expect(isEntitledWrite).toBe(false)
    }) // end test

    test('Invitee is allowed to write to token gated space with token', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithTestGatingNft(),
        )
        // have tokengranted user create a space so she can create a user stream
        const _ = await createTestSpaceGatedByTownsNfts(tokenGrantedUser, [Permission.Read])

        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        // TODO: allow for adjusted default Everyone permission, to remove
        // default Read which invariably allows all invitees regardless of
        // token gating

        const roomId = await createTestSpaceGatedByTownsNfts(bob, [
            Permission.Read,
            Permission.Write,
        ])

        await tokenGrantedUser.mintMembershipTransaction(roomId, tokenGrantedUser.wallet)

        const isEntitledRead = await tokenGrantedUser.isEntitled(
            roomId,
            '',
            tokenGrantedUser.provider.wallet.address,
            Permission.Read,
        )
        const isEntitledWrite = await tokenGrantedUser.isEntitled(
            roomId,
            '',
            tokenGrantedUser.provider.wallet.address,
            Permission.Write,
        )
        /** Act */
        // invite user to join the space by first checking if they can read.
        if (roomId && tokenGrantedUser.getUserId()) {
            isEntitledRead && (await bob.inviteUser(roomId, tokenGrantedUser.getUserId()))
        }
        /** Assert */
        expect(isEntitledRead).toBe(true)
        // alice can write because she has token entitlement
        expect(isEntitledWrite).toBe(true)
    }) // end test

    test('Read permission is granted', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithTestGatingNft(),
        )
        // have tokengranted user create a space so she can create a user stream
        const _ = await createTestSpaceGatedByTownsNfts(tokenGrantedUser, [Permission.Read])

        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement
        const spaceId = await createTestSpaceGatedByTownsNfts(bob, [Permission.Read])

        /** Act */
        const actualJoin = await tokenGrantedUser.joinTown(spaceId, tokenGrantedUser.wallet)

        /** Assert */
        // can join the room if the user has Read permission.
        expect(actualJoin).toBeDefined()
    }) // end test

    test('Mint permission is denied', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await bob.fundWallet()

        // create a space with token entitlement for minting
        const spaceId = await createTestSpaceGatedByTownsNfts(bob, [Permission.Read])

        check(isDefined(spaceId), 'spaceId')

        /** Act */
        try {
            await alice.joinTown(spaceId, alice.wallet)
        } catch (e) {
            const error = e as Error
            /** Assert */
            // check that the returned error wasn't that no error was thrown.
            if (error) {
                expect((e as Error).message).toMatch(new RegExp('execution reverted'))
                expect((e as Error).name).toMatch(new RegExp('Entitlement__NotAllowed'))
            }
        }
    }) // end test

    // this test is dependent on member_cap in dendrite_local_test/dendrite.yaml,
    // takse forever, and
    // shouldn't be run in integration tests
    test.skip('Cannot join Space over quota', async () => {
        /** Arrange */

        // create all the users for the test
        // maxUsers should exceed the default quota
        const maxUsers = 11
        const joiners: TownsTestClient[] = []
        const registerClients: Promise<Record<string, TownsTestClient>>[] = []
        for (let i = 0; i < maxUsers; i++) {
            registerClients.push(registerAndStartClients([`tokenGrantedUser_${i}`]))
        }
        await Promise.all(registerClients)
            .then((clients) => {
                clients.forEach((clientObj) => {
                    for (const key in clientObj) {
                        joiners.push(clientObj[key])
                    }
                })
            })
            .catch(function (err) {
                console.log('error registering clients', err)
            })
        await sleep(500)
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with everyone entitlement
        const spaceId = await createTestSpaceGatedByTownNft(bob, [Permission.Read], {
            name: 'test',
        })

        // invite users to join the space.
        /** Act */
        let failedJoinIndex = 0
        let numJoinersProcessed = 1
        for (const user of joiners) {
            try {
                await user.joinTown(spaceId, user.wallet)
                numJoinersProcessed++
            } catch (e) {
                console.log('error joining room', e)
                failedJoinIndex = numJoinersProcessed
                break
            }
        }

        /** Assert */
        expect(failedJoinIndex).toBe(maxUsers)
    }, 120000) // end test

    // this test is dependent on member_cap in dendrite_local_test/dendrite.yaml,
    // takse forever, and
    // shouldn't be run in integration tests
    test.skip('Cannot join new Channel for space over quota', async () => {
        /** Arrange */

        // create all the users for the test
        // maxUsers should exceed the default quota
        // sese member_cap in dendrite config for
        // maxUsers allowed in space
        const maxUsers = 11
        const joiners: TownsTestClient[] = []
        const registerClients: Promise<Record<string, TownsTestClient>>[] = []
        for (let i = 0; i < maxUsers; i++) {
            registerClients.push(registerAndStartClients([`tokenGrantedUser_${i}`]))
        }
        await Promise.all(registerClients).then((clients) => {
            clients.forEach((clientObj) => {
                for (const key in clientObj) {
                    joiners.push(clientObj[key])
                }
            })
        })
        await sleep(500)
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with everyone entitlement
        const spaceId = await createTestSpaceGatedByTownNft(bob, [Permission.Read], {
            name: 'test',
        })

        // create a channel with the same roles and permissions as the space
        const channelId = await createTestChannelWithSpaceRoles(bob, {
            name: 'alice channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })

        // users to join the space.
        /** Act */
        for (const user of joiners) {
            try {
                await user.joinTown(spaceId, user.wallet)
            } catch (e) {
                console.log('error joining room', e)
                break
            }
        }

        // users to join the channel. last will fail as in space
        // since quota applies to channel or space when
        // not on allow list
        /** Act */
        let failedJoinIndex = 0
        let numJoinersProcessed = 1
        if (channelId) {
            for (const user of joiners) {
                try {
                    await user.joinRoom(channelId)
                    numJoinersProcessed++
                } catch (e) {
                    console.log('error joining room', e)
                    failedJoinIndex = numJoinersProcessed
                    break
                }
            }
        }
        /** Assert */
        expect(failedJoinIndex).toBe(maxUsers)
    }, 120000) // end test
}) // end describe
