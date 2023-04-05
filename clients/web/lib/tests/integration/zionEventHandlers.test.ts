import { createTestSpaceWithEveryoneRole, registerAndStartClients } from './helpers/TestUtils'
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
        await alice.createSpace(createSpaceInfo, tokenEntitlement, [])

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
        const roomId = await createTestSpaceWithEveryoneRole(
            alice,
            [Permission.Read, Permission.Write],
            {
                name: alice.makeUniqueName(),
                visibility: RoomVisibility.Private,
            },
        )

        if (!roomId) {
            throw new Error('roomId is undefined')
        }

        if (!bob.matrixUserId) {
            throw new Error('bob.matrixUserId is undefined')
        }

        // alice invites bob to the room
        await alice.inviteUser(roomId, bob.matrixUserId)

        await waitFor(() => expect(bob.getRoomData(roomId)).toBeDefined())
        // bob joins the room
        await bob.joinRoom(roomId)

        expect(eventHandlerResult).toBeDefined()
        expect(eventHandlerResult?.roomId).toEqual(roomId)
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
        const roomId = await createTestSpaceWithEveryoneRole(
            alice,
            [Permission.Read, Permission.Write],
            {
                name: alice.makeUniqueName(),
                visibility: RoomVisibility.Private,
            },
        )

        if (!roomId) {
            throw new Error('roomId is undefined')
        }

        await alice.sendMessage(roomId, 'Hello World!')

        expect(eventHandlerResult).toBeDefined()

        expect(eventHandlerResult?.roomId).toEqual(roomId)
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
            await alice.logout()

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

        await alice.logout()

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
        const roomId = await createTestSpaceWithEveryoneRole(
            alice,
            [Permission.Read, Permission.Write],
            {
                name: alice.makeUniqueName(),
                visibility: RoomVisibility.Private,
            },
        )

        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        alice.setEventHandlers(undefined)
        await alice.sendMessage(roomId, 'Hello World!')

        expect(eventHandlerResult).toBeUndefined()
    })
})
