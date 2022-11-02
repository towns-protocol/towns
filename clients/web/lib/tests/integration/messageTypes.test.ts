/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { waitFor } from '@testing-library/dom'
import { MatrixEvent } from 'matrix-js-sdk'
import {
    ImageMessageContent,
    MessageType,
    RoomVisibility,
    ZionTextMessageContent,
} from '../../src/types/matrix-types'
import { registerAndStartClients } from './helpers/TestUtils'

describe('messageTypes', () => {
    jest.setTimeout(30000)
    test('send a m.wenmoon message to test message types', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob creates a public room
        const roomId = await bob.createSpace({
            name: "bob's room",
            visibility: RoomVisibility.Public,
        })
        // alice joins the room
        await alice.joinRoom(roomId)
        // alice sends a wenmoon message
        await alice.sendMessage(roomId, 'Wen Moon?', {
            messageType: MessageType.WenMoon,
        })
        // bob should receive the message
        await waitFor(() =>
            expect(
                bob
                    .getRoom(roomId)
                    ?.getLiveTimeline()
                    .getEvents()
                    .find(
                        (event: MatrixEvent) => event.getContent().msgtype === MessageType.WenMoon,
                    ),
            ).toBeDefined(),
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
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob creates a public room
        const roomId = await bob.createSpace({
            name: "bob's room",
            visibility: RoomVisibility.Public,
        })
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
        })
    })

    test('send a m.ZionText message', async () => {
        const ZION_TEXT_MESSAGE_CONTENT: ZionTextMessageContent = {
            messageType: MessageType.ZionText,
            attachments: [{ url: 'https://example.com' }],
        }
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob creates a public room
        const roomId = await bob.createSpace({
            name: "bob's room",
            visibility: RoomVisibility.Public,
        })
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
        })
    })
}) // end describe
