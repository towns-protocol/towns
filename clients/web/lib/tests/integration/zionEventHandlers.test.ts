/**
 * @group dendrite
 * @group casablanca
 */
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    registerAndStartClients,
    waitForWithRetries,
} from './helpers/TestUtils'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { RoomVisibility } from '../../src/types/zion-types'
import {
    createExternalTokenStruct,
    getMemberNftAddress,
} from '../../src/client/web3/ContractHelpers'
import { SpaceFactoryDataTypes } from '../../src/client/web3/shims/SpaceFactoryShim'
import { waitFor } from '@testing-library/dom'
import { Permission } from '../../src/client/web3/ContractTypes'
import { SpaceProtocol } from '../../src/client/ZionClientTypes'
import { sleep } from '../../src/utils/zion-utils'

describe('Zion event handlers test', () => {
    test('onCreateSpace', async () => {
        let eventHandlerResult:
            | {
                  roomIdentifier: RoomIdentifier
              }
            | undefined

        const { alice } = await registerAndStartClients(['alice'], {
            eventHandlers: {
                onCreateSpace: (_roomIdentifier: RoomIdentifier): void => {
                    eventHandlerResult = {
                        roomIdentifier: _roomIdentifier,
                    }
                },
            },
        })
        await alice.fundWallet()
        const createSpaceInfo = {
            name: alice.makeUniqueName(),
            visibility: RoomVisibility.Public,
        }
        const memberNftAddress = getMemberNftAddress(alice.chainId)
        const tokens = createExternalTokenStruct([memberNftAddress])
        const tokenEntitlement: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct = {
            roleName: 'Member',
            permissions: [],
            tokens,
            users: [],
        }
        await waitForWithRetries(() => alice.createSpace(createSpaceInfo, tokenEntitlement, []))

        expect(eventHandlerResult).toBeDefined()
        expect(eventHandlerResult?.roomIdentifier).toBeDefined()
        expect(eventHandlerResult?.roomIdentifier.networkId).toBeDefined()
    })

    test('onJoinRoom', async () => {
        let eventHandlerResult:
            | {
                  roomId: RoomIdentifier
              }
            | undefined

        const { alice, bob } = await registerAndStartClients(['alice', 'bob'], {
            eventHandlers: {
                onJoinRoom(roomId) {
                    eventHandlerResult = {
                        roomId,
                    }
                },
            },
        })
        await alice.fundWallet()

        // alice creates a room
        const spaceId = await createTestSpaceWithEveryoneRole(
            alice,
            [Permission.Read, Permission.Write],
            {
                name: alice.makeUniqueName(),
                visibility: RoomVisibility.Private,
            },
        )

        if (!spaceId) {
            throw new Error('roomId is undefined')
        }

        const userId = bob.getUserId()

        if (!userId) {
            throw new Error('bob.getUserId() is undefined')
        }

        // alice invites bob to the room
        await alice.inviteUser(spaceId, userId)

        console.log('alice.getRoomData(spaceId)', alice.getRoomData(spaceId))

        await bob.joinRoom(spaceId)
        await waitFor(() => expect(eventHandlerResult).toBeDefined())

        expect(eventHandlerResult?.roomId).toEqual(spaceId)
    })

    test('onSendMessage', async () => {
        let eventHandlerResult:
            | {
                  roomId: RoomIdentifier
              }
            | undefined

        const { alice } = await registerAndStartClients(['alice'], {
            eventHandlers: {
                onSendMessage(roomId) {
                    eventHandlerResult = {
                        roomId,
                    }
                },
            },
        })
        await alice.fundWallet()

        // alice creates a room
        const spaceId = await createTestSpaceWithEveryoneRole(
            alice,
            [Permission.Read, Permission.Write],
            {
                name: alice.makeUniqueName(),
                visibility: RoomVisibility.Private,
            },
        )

        if (!spaceId) {
            throw new Error('roomId is undefined')
        }

        const channelId = await createTestChannelWithSpaceRoles(alice, {
            name: alice.makeUniqueName(),
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Private,
            roleIds: [],
        })

        if (!channelId) {
            throw new Error('channelId is undefined')
        }

        await alice.sendMessage(channelId, 'Hello World!')

        expect(eventHandlerResult).toBeDefined()

        expect(eventHandlerResult?.roomId).toEqual(channelId)
    })

    test('onRegister', async () => {
        const authEvents = {
            registered: false,
        }

        await registerAndStartClients(['alice'], {
            eventHandlers: {
                onRegister: () => {
                    authEvents.registered = true
                },
            },
        })

        expect(authEvents.registered).toBe(true)
    })

    test('onLogin', async () => {
        const authEvents = {
            loggedIn: false,
        }

        // registration will log in the user
        // log out first, and then test re-login
        const { alice } = await registerAndStartClients(['alice'], {
            eventHandlers: {
                onLogin: () => {
                    authEvents.loggedIn = true
                },
            },
        })

        if (alice.opts.primaryProtocol === SpaceProtocol.Matrix) {
            await sleep(5000) /// todo: fix matrix logout https://linear.app/hnt-labs/issue/HNT-1334/logging-out-is-problematic-in-the-tests
            await alice.logout()
            await sleep(5000)
            expect(authEvents.loggedIn).toBe(false)

            await alice.loginToMatrixWithTestWallet()

            expect(authEvents.loggedIn).toBe(true)
        }
    })

    test('onLogout', async () => {
        const authEvents = {
            loggedOut: false,
        }

        const { alice } = await registerAndStartClients(['alice'], {
            eventHandlers: {
                onLogout: () => {
                    authEvents.loggedOut = true
                },
            },
        })

        expect(authEvents.loggedOut).toBe(false)
        await sleep(5000) /// todo: fix matrix logout https://linear.app/hnt-labs/issue/HNT-1334/logging-out-is-problematic-in-the-tests
        await alice.logout()
        await sleep(5000)
        expect(authEvents.loggedOut).toBe(true)
    })

    test('Unset onSendMessage', async () => {
        let eventHandlerResult:
            | {
                  roomId: RoomIdentifier
              }
            | undefined

        const { alice } = await registerAndStartClients(['alice'], {
            eventHandlers: {
                onSendMessage(roomId) {
                    eventHandlerResult = {
                        roomId,
                    }
                },
            },
        })
        await alice.fundWallet()

        // alice creates a room
        const spaceId = await createTestSpaceWithEveryoneRole(
            alice,
            [Permission.Read, Permission.Write],
            {
                name: alice.makeUniqueName(),
                visibility: RoomVisibility.Private,
            },
        )

        if (!spaceId) {
            throw new Error('roomId is undefined')
        }

        const channelId = await createTestChannelWithSpaceRoles(alice, {
            name: alice.makeUniqueName(),
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Private,
            roleIds: [],
        })

        if (!channelId) {
            throw new Error('roomId is undefined')
        }

        alice.setEventHandlers(undefined)
        await alice.sendMessage(channelId, 'Hello World!')

        expect(eventHandlerResult).toBeUndefined()
    })
})
