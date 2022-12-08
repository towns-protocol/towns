/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
    ImageMessageContent,
    MessageType,
    RoomVisibility,
    ZionTextMessageContent,
} from '../../src/types/matrix-types'
import { RoomIdentifier } from '../../src/types/room-identifier'
import {
    createTestSpaceWithZionMemberRole,
    makeUniqueName,
    registerAndStartClients,
    registerLoginAndStartClient,
} from './helpers/TestUtils'

import { MatrixEvent } from 'matrix-js-sdk'
import { Permission } from '../../src/client/web3/ZionContractTypes'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'

describe('messageTypes', () => {
    jest.setTimeout(TestConstants.DefaultJestTimeout)
    test('send a m.wenmoon message to test message types', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerLoginAndStartClient('alice', TestConstants.getWalletWithNft())
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a public room
        const roomId = (await createTestSpaceWithZionMemberRole(
            bob,
            [Permission.Read, Permission.Write],
            [],
            {
                name: makeUniqueName('bobs room'),
                visibility: RoomVisibility.Public,
            },
        )) as RoomIdentifier
        // alice joins the room
        await alice.joinRoom(roomId)
        // alice sends a wenmoon message
        await alice.sendMessage(roomId, 'Wen Moon?', {
            messageType: MessageType.WenMoon,
        })
        // bob should receive the message
        await waitFor(
            () =>
                expect(
                    bob
                        .getRoom(roomId)
                        ?.getLiveTimeline()
                        .getEvents()
                        .find(
                            (event: MatrixEvent) =>
                                event.getContent().msgtype === MessageType.WenMoon,
                        ),
                ).toBeDefined(),
            TestConstants.DefaultWaitForTimeout,
        )
    }) // end test

    test('send a m.image message', async () => {
        const IMAGE_MSG_CONTENT = {
            messageType: MessageType.Image,
            url: 'https://what.com/what.jpg',
            info: {
                size: 500,
                mimetype: 'image/jpg',
                w: 300,
                h: 400,
                thumbnail_info: {
                    w: 100,
                    h: 100,
                    size: 30,
                    mimetype: 'image/jpg',
                },
            },
        }
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerLoginAndStartClient('alice', TestConstants.getWalletWithNft())
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a public room
        const roomId = (await createTestSpaceWithZionMemberRole(
            bob,
            [Permission.Read, Permission.Write],
            [],
            {
                name: makeUniqueName('bobs room'),
                visibility: RoomVisibility.Public,
            },
        )) as RoomIdentifier
        // alice joins the room
        await alice.joinRoom(roomId)
        // alice sends a image message
        await alice.sendMessage(roomId, 'what.jpg', IMAGE_MSG_CONTENT)

        await waitFor(() => {
            const imageMessage = bob
                .getRoom(roomId)
                ?.getLiveTimeline()
                .getEvents()
                .find((event: MatrixEvent) => event.getContent().msgtype === MessageType.Image)

            expect(imageMessage).toBeDefined()
            expect(imageMessage?.getContent<ImageMessageContent>().url).toBe(IMAGE_MSG_CONTENT.url)
            expect(imageMessage?.getContent<ImageMessageContent>().info?.thumbnail_info?.size).toBe(
                30,
            )
        }, TestConstants.DefaultWaitForTimeout)
    })

    test('send a m.ZionText message', async () => {
        const ZION_TEXT_MESSAGE_CONTENT: ZionTextMessageContent = {
            messageType: MessageType.ZionText,
            attachments: [{ url: 'https://example.com' }],
        }
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerLoginAndStartClient('alice', TestConstants.getWalletWithNft())
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a public room
        const roomId = (await createTestSpaceWithZionMemberRole(
            bob,
            [Permission.Read, Permission.Write],
            [],
            {
                name: makeUniqueName('bobs room'),
                visibility: RoomVisibility.Public,
            },
        )) as RoomIdentifier
        // alice joins the room
        await alice.joinRoom(roomId)
        // alice sends a image message
        await alice.sendMessage(
            roomId,
            'this is a message with https://example.com in the body',
            ZION_TEXT_MESSAGE_CONTENT,
        )

        await waitFor(() => {
            const zionTextMessage = bob
                .getRoom(roomId)
                ?.getLiveTimeline()
                .getEvents()
                .find((event: MatrixEvent) => event.getContent().msgtype === MessageType.ZionText)

            expect(zionTextMessage).toBeDefined()
            expect(zionTextMessage?.getContent<ZionTextMessageContent>().attachments?.[0]).toEqual(
                expect.objectContaining({ url: 'https://example.com' }),
            )
        }, TestConstants.DefaultWaitForTimeout)
    })
}) // end describe
