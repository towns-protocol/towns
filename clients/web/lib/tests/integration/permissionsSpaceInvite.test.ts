/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group casablanca
 */
import { MAXTRIX_ERROR, MatrixError, NoThrownError } from './helpers/ErrorUtils'
import {
    createTestSpaceGatedByTownAndZionNfts,
    registerAndStartClients,
    registerAndStartClient,
    createTestSpaceGatedByTownNft,
    createTestChannelWithSpaceRoles,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { Permission } from '@river/web3'
import { Room } from 'use-zion-client/src/types/zion-types'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestClient } from './helpers/ZionTestClient'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { sleep } from '../../src/utils/zion-utils'

describe('space invite', () => {
    test('Inviter is not allowed due to missing Invite permission', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob, einstein } = await registerAndStartClients(['alice', 'bob', 'einstein'])
        await bob.fundWallet()

        // create a space with token entitlement
        const roomId = await createTestSpaceGatedByTownAndZionNfts(bob, [Permission.Read])

        /** Act */
        // invite users to join the space.
        try {
            const einsteinUserId = einstein.getUserId()
            if (roomId && einsteinUserId) {
                // TODO: add an assertion on inviteUser by typing return value
                await alice.inviteUser(roomId, einsteinUserId)
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

    test('Invitee is not allowed to write to token gated space without token', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        const roomId = await createTestSpaceGatedByTownAndZionNfts(bob, [
            Permission.Read,
            Permission.Write,
        ])

        const isEntitledRead = await alice.isEntitled(
            roomId?.streamId as string,
            '',
            alice.provider.wallet.address,
            Permission.Read,
        )
        const isEntitledWrite = await alice.isEntitled(
            roomId?.streamId as string,
            '',
            alice.provider.wallet.address,
            Permission.Write,
        )
        /** Act */
        // invite user to join the space by first checking if they can read.
        if (roomId && alice.getUserId()) {
            !isEntitledRead && (await bob.inviteUser(roomId, alice.getUserId()!))
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
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        // TODO: allow for adjusted default Everyone permission, to remove
        // default Read which invariably allows all invitees regardless of
        // token gating

        const roomId = (await createTestSpaceGatedByTownAndZionNfts(bob, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier

        await tokenGrantedUser.mintMembershipTransaction(roomId, tokenGrantedUser.wallet)

        const isEntitledRead = await tokenGrantedUser.isEntitled(
            roomId?.streamId,
            '',
            tokenGrantedUser.provider.wallet.address,
            Permission.Read,
        )
        const isEntitledWrite = await tokenGrantedUser.isEntitled(
            roomId?.streamId,
            '',
            tokenGrantedUser.provider.wallet.address,
            Permission.Write,
        )
        /** Act */
        // invite user to join the space by first checking if they can read.
        if (roomId && tokenGrantedUser.getUserId()) {
            isEntitledRead && (await bob.inviteUser(roomId, tokenGrantedUser.getUserId()!))
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
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement
        const spaceId = await createTestSpaceGatedByTownAndZionNfts(bob, [Permission.Read])

        // invite users to join the space.
        if (spaceId) {
            const tokenGrantedUserId = tokenGrantedUser.getUserId()
            if (tokenGrantedUserId) {
                await bob.inviteUser(spaceId, tokenGrantedUserId)
            }
        }
        /** Act */
        let actualJoin: Room | undefined
        if (spaceId) {
            actualJoin = await tokenGrantedUser.joinTown(spaceId, tokenGrantedUser.wallet)
        }

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
        const spaceId = await createTestSpaceGatedByTownAndZionNfts(bob, [Permission.Read])

        // invite users to join the space.
        if (spaceId) {
            const aliceUserId = alice.getUserId()
            if (aliceUserId) {
                await bob.inviteUser(spaceId, aliceUserId)
            }
        }

        /** Act */
        try {
            if (spaceId) {
                await alice.joinTown(spaceId, alice.wallet)
            }
        } catch (e) {
            const error = e as MatrixError
            /** Assert */
            // check that the returned error wasn't that no error was thrown.
            if (error.data) {
                expect(error).not.toBeInstanceOf(NoThrownError)
                // Forbidden exception because the user does not have Read permission
                expect(error.data).toHaveProperty('errcode', MAXTRIX_ERROR.M_FORBIDDEN)
            } else {
                // Casablanca
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
        const joiners: ZionTestClient[] = []
        const registerClients: Promise<Record<string, ZionTestClient>>[] = []
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
        if (spaceId) {
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
        const joiners: ZionTestClient[] = []
        const registerClients: Promise<Record<string, ZionTestClient>>[] = []
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
            parentSpaceId: spaceId as RoomIdentifier,
            roleIds: [],
        })

        // users to join the space.
        /** Act */
        if (spaceId) {
            for (const user of joiners) {
                try {
                    await user.joinTown(spaceId, user.wallet)
                } catch (e) {
                    console.log('error joining room', e)
                    break
                }
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
