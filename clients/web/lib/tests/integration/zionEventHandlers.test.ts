import { createTestSpaceWithEveryoneRole, registerAndStartClients } from './helpers/TestUtils'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { CreateSpaceInfo, RoomVisibility } from '../../src/types/zion-types'
import {
    createExternalTokenStruct,
    getCouncilNftAddress,
} from '../../src/client/web3/ContractHelpers'
import { SpaceFactoryDataTypes } from '../../src/client/web3/shims/SpaceFactoryShim'
import { waitFor } from '@testing-library/dom'
import { Permission } from '../../src/client/web3/ContractTypes'
import { TestConstants } from './helpers/TestConstants'

describe('Zion event handlers test', () => {
    test('onCreateSpace', async () => {
        let eventHandlerResult:
            | {
                  createSpaceInfo: CreateSpaceInfo
                  roomIdentifier: RoomIdentifier
              }
            | undefined

        const { alice } = await registerAndStartClients(['alice'], {
            eventHandlers: {
                onCreateSpace: (
                    _createSpaceInfo: CreateSpaceInfo,
                    _roomIdentifier: RoomIdentifier,
                ): void => {
                    eventHandlerResult = {
                        createSpaceInfo: _createSpaceInfo,
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
        const councilNftAddress = getCouncilNftAddress(alice.chainId)
        const tokens = createExternalTokenStruct([councilNftAddress])
        const tokenEntitlement: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct = {
            roleName: 'Member',
            permissions: [],
            tokens,
            users: [],
        }
        await alice.createSpace(createSpaceInfo, tokenEntitlement, [])

        expect(eventHandlerResult).toBeDefined()
        expect(eventHandlerResult?.createSpaceInfo).toEqual(createSpaceInfo)
        expect(eventHandlerResult?.roomIdentifier).toBeDefined()
        expect(eventHandlerResult?.roomIdentifier.networkId).toBeDefined()
    })

    test('onInviteUser', async () => {
        let eventHandlerResult:
            | {
                  roomId: RoomIdentifier
                  userId: string
              }
            | undefined

        const { alice, bob } = await registerAndStartClients(['alice', 'bob'], {
            eventHandlers: {
                onInviteUser(roomId, userId) {
                    eventHandlerResult = {
                        roomId,
                        userId,
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

        expect(eventHandlerResult).toBeDefined()
        expect(eventHandlerResult?.roomId).toEqual(roomId)
        expect(eventHandlerResult?.userId).toBeDefined()
        expect(eventHandlerResult?.userId).toEqual(bob.matrixUserId)
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

        await waitFor(
            () => expect(bob.getRoomData(roomId)).toBeDefined(),
            TestConstants.DefaultWaitForTimeout,
        )
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
})
