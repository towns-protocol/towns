/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 */
import { MAXTRIX_ERROR, MatrixError, NoThrownError, getError } from './helpers/ErrorUtils'
import {
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerAndStartClient,
    createTestSpaceWithEveryoneRole,
    createTestChannelWithSpaceRoles,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { Permission } from 'use-zion-client/src/client/web3/ContractTypes'
import { Room, RoomVisibility } from 'use-zion-client/src/types/zion-types'
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
        const roomId = await createTestSpaceWithZionMemberRole(bob, [Permission.Read])

        /** Act */
        // invite users to join the space.
        try {
            if (roomId && einstein.matrixUserId) {
                // TODO: add an assertion on inviteUser by typing return value
                await alice.inviteUser(roomId, einstein.matrixUserId)
            }
        } catch (e) {
            /** Assert */
            expect((e as Error).message).toContain('Inviter not allowed')
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
        const roomId = await createTestSpaceWithZionMemberRole(bob, [
            Permission.Read,
            Permission.Write,
        ])

        const isEntitledRead = await alice.isEntitled(
            roomId?.networkId as string,
            '',
            alice.provider.wallet.address,
            Permission.Read,
        )
        const isEntitledWrite = await alice.isEntitled(
            roomId?.networkId as string,
            '',
            alice.provider.wallet.address,
            Permission.Write,
        )
        /** Act */
        // invite user to join the space by first checking if they can read.
        if (roomId && alice.matrixUserId) {
            !isEntitledRead && (await bob.inviteUser(roomId, alice.matrixUserId))
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
            TestConstants.getWalletWithNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        // TODO: allow for adjusted default Everyone permission, to remove
        // default Read which invariably allows all invitees regardless of
        // token gating

        const roomId = await createTestSpaceWithZionMemberRole(bob, [
            Permission.Read,
            Permission.Write,
        ])
        const isEntitledRead = await tokenGrantedUser.isEntitled(
            roomId?.networkId as string,
            '',
            tokenGrantedUser.provider.wallet.address,
            Permission.Read,
        )
        const isEntitledWrite = await tokenGrantedUser.isEntitled(
            roomId?.networkId as string,
            '',
            tokenGrantedUser.provider.wallet.address,
            Permission.Write,
        )
        /** Act */
        // invite user to join the space by first checking if they can read.
        if (roomId && tokenGrantedUser.matrixUserId) {
            isEntitledRead && (await bob.inviteUser(roomId, tokenGrantedUser.matrixUserId))
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
            TestConstants.getWalletWithNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement
        const roomId = await createTestSpaceWithZionMemberRole(bob, [Permission.Read])

        // invite users to join the space.
        if (roomId) {
            tokenGrantedUser.matrixUserId &&
                (await bob.inviteUser(roomId, tokenGrantedUser.matrixUserId))
        }
        /** Act */
        let actualJoin: Room | undefined
        if (roomId) {
            actualJoin = await tokenGrantedUser.joinRoom(roomId)
        }

        /** Assert */
        // can join the room if the user has Read permission.
        expect(actualJoin).toBeDefined()
    }) // end test

    test('Read permission is denied', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await bob.fundWallet()

        // create a space with token entitlement
        const roomId = await createTestSpaceWithZionMemberRole(bob, [Permission.Read])

        // invite users to join the space.
        if (roomId) {
            alice.matrixUserId && (await bob.inviteUser(roomId, alice.matrixUserId))
        }

        /** Act */
        const error = await getError<MatrixError>(async function () {
            if (roomId) {
                await alice.joinRoom(roomId)
            }
        })

        /** Assert */
        // check that the returned error wasn't that no error was thrown.
        expect(error).not.toBeInstanceOf(NoThrownError)
        // Forbidden exception because the user does not have Read permission
        expect(error.data).toHaveProperty('errcode', MAXTRIX_ERROR.M_FORBIDDEN)
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
        const roomId = await createTestSpaceWithEveryoneRole(bob, [Permission.Read], {
            name: 'test',
            visibility: RoomVisibility.Public,
        })

        // invite users to join the space.
        /** Act */
        let failedJoinIndex = 0
        let numJoinersProcessed = 1
        if (roomId) {
            for (const user of joiners) {
                try {
                    await user.joinRoom(roomId)
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
        const spaceId = await createTestSpaceWithEveryoneRole(bob, [Permission.Read], {
            name: 'test',
            visibility: RoomVisibility.Public,
        })

        // create a channel with the same roles and permissions as the space
        const channelId = await createTestChannelWithSpaceRoles(bob, {
            name: 'alice channel',
            visibility: RoomVisibility.Public,
            parentSpaceId: spaceId as RoomIdentifier,
            roleIds: [],
        })

        // users to join the space.
        /** Act */
        if (spaceId) {
            for (const user of joiners) {
                try {
                    await user.joinRoom(spaceId)
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
