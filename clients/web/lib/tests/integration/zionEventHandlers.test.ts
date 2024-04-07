/**
 * @group core
 */
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    registerAndStartClients,
    waitForWithRetries,
} from './helpers/TestUtils'
import { waitFor } from '@testing-library/dom'
import { sleep } from '../../src/utils/towns-utils'
import {
    getTestGatingNftAddress,
    IArchitectBase,
    NoopRuleData,
    Permission,
} from '@river-build/web3'
import { ethers } from 'ethers'
import { getDynamicPricingModule } from '../../src/utils/web3'

describe('Towns event handlers test', () => {
    test('onCreateSpace', async () => {
        let eventHandlerResult:
            | {
                  roomIdentifier: string
              }
            | undefined

        const { alice } = await registerAndStartClients(['alice'], {
            eventHandlers: {
                onCreateSpace: (_roomIdentifier: string): void => {
                    eventHandlerResult = {
                        roomIdentifier: _roomIdentifier,
                    }
                },
            },
        })
        await alice.fundWallet()
        const createSpaceInfo = {
            name: alice.makeUniqueName(),
        }
        const testGatingNftAddress = await getTestGatingNftAddress(alice.opts.baseChainId)
        if (!testGatingNftAddress) {
            throw new Error('testGatingNftAddress is undefined')
        }
        expect(testGatingNftAddress).toBeDefined()
        expect(testGatingNftAddress).not.toBe('')

        const dynamicPricingModule = await getDynamicPricingModule(alice.spaceDapp)

        const membership: IArchitectBase.MembershipStruct = {
            settings: {
                name: 'Member',
                symbol: 'MEMBER',
                price: 0,
                maxSupply: 100,
                duration: 0,
                currency: ethers.constants.AddressZero,
                feeRecipient: alice.wallet.address,
                freeAllocation: 0,
                pricingModule: dynamicPricingModule.module,
            },
            permissions: [Permission.Read, Permission.Write],
            requirements: {
                everyone: false,
                users: [alice.wallet.address],
                ruleData: NoopRuleData,
            },
        }
        // createSpace is gated by the mock NFT. Mint one for yourself before proceeding.
        await alice.mintMockNFT()
        await waitForWithRetries(() => alice.createSpace(createSpaceInfo, membership))

        expect(eventHandlerResult).toBeDefined()
        expect(eventHandlerResult?.roomIdentifier).toBeDefined()
    })

    test('onJoinRoom', async () => {
        const eventHandlerResult: {
            roomId: string
        }[] = []

        const { alice, bob } = await registerAndStartClients(['alice', 'bob'], {
            eventHandlers: {
                onJoinRoom(roomId) {
                    eventHandlerResult.push({
                        roomId,
                    })
                },
            },
        })
        await alice.fundWallet()

        // alice creates a room
        const spaceId = await createTestSpaceGatedByTownNft(
            alice,
            [Permission.Read, Permission.Write],
            {
                name: alice.makeUniqueName(),
            },
        )

        const userId = bob.getUserId()

        if (!userId) {
            throw new Error('bob.getUserId() is undefined')
        }

        // alice invites bob to the room
        await alice.inviteUser(spaceId, userId)

        console.log('alice.getRoomData(spaceId)', alice.getRoomData(spaceId))

        await bob.joinTown(spaceId, bob.wallet)
        await waitFor(() => expect(eventHandlerResult).toBeDefined())

        expect(eventHandlerResult.at(0)?.roomId).toEqual(spaceId)
    })

    test('onSendMessage', async () => {
        let eventHandlerResult:
            | {
                  roomId: string
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
        const spaceId = await createTestSpaceGatedByTownNft(
            alice,
            [Permission.Read, Permission.Write],
            {
                name: alice.makeUniqueName(),
            },
        )

        const channelId = await createTestChannelWithSpaceRoles(alice, {
            name: alice.makeUniqueName(),
            parentSpaceId: spaceId,
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
        console.log('alice.getUserId()', alice.getUserId())
        expect(authEvents.loggedIn).toBe(false) // todo implement for river
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
        await sleep(5000)
        await alice.logout()
        await sleep(5000)
        expect(authEvents.loggedOut).toBe(true)
    })

    test('Unset onSendMessage', async () => {
        let eventHandlerResult:
            | {
                  roomId: string
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
        const spaceId = await createTestSpaceGatedByTownNft(
            alice,
            [Permission.Read, Permission.Write],
            {
                name: alice.makeUniqueName(),
            },
        )

        const channelId = await createTestChannelWithSpaceRoles(alice, {
            name: alice.makeUniqueName(),
            parentSpaceId: spaceId,
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
