/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group casablanca
 * @group dendrite
 */
import {
    ImageMessageContent,
    MessageType,
    RoomVisibility,
    SendImageMessageOptions,
} from '../../src/types/zion-types'
import { RoomIdentifier } from '../../src/types/room-identifier'
import {
    createTestSpaceWithZionMemberRole,
    makeUniqueName,
    registerAndStartClients,
    registerAndStartClient,
    createTestChannelWithSpaceRoles,
    waitForWithRetries,
} from './helpers/TestUtils'

import { Permission } from '@river/web3'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'

describe('messageTypes', () => {
    test('send a m.gm message to test message types', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerAndStartClient('alice', TestConstants.getWalletWithMemberNft())
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a public room
        const spaceId = (await createTestSpaceWithZionMemberRole(
            bob,
            [Permission.Read, Permission.Write],
            [],
            {
                name: makeUniqueName('bobs room'),
                visibility: RoomVisibility.Public,
            },
        )) as RoomIdentifier
        // create a channel
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        }))!

        // alice joins the room
        await waitForWithRetries(() => alice.joinRoom(channelId))

        // alice sends a gm message
        await waitForWithRetries(() =>
            alice.sendMessage(channelId, 'GM', {
                messageType: MessageType.GM,
            }),
        )
        // bob should receive the message
        await waitFor(() => expect(bob.getMessages(channelId)).toContain('GM'))
        expect(
            bob
                .getEvents_TypedRoomMessage(channelId)
                .find((event) => event.content.msgType === MessageType.GM),
        ).toBeDefined()
    }) // end test

    test('send a m.image message', async () => {
        const IMAGE_MSG_CONTENT: SendImageMessageOptions = {
            messageType: MessageType.Image,
            info: {
                url: 'https://what.com/what.jpg',
                size: 500,
                mimetype: 'image/jpg',
                w: 300,
                h: 400,
            },
            thumbnail: {
                url: 'https://what.com/what-thumb.jpg',
                size: 30,
                mimetype: 'image/jpg',
                w: 100,
                h: 100,
            },
        } satisfies SendImageMessageOptions
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerAndStartClient('alice', TestConstants.getWalletWithMemberNft())
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a public room
        const spaceId = (await createTestSpaceWithZionMemberRole(
            bob,
            [Permission.Read, Permission.Write],
            [],
            {
                name: makeUniqueName('bobs room'),
                visibility: RoomVisibility.Public,
            },
        )) as RoomIdentifier
        // create a channel
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        }))!

        // alice joins the room
        await waitForWithRetries(() => alice.joinRoom(channelId))
        // alice sends a image message
        await waitForWithRetries(() => alice.sendMessage(channelId, 'what.jpg', IMAGE_MSG_CONTENT))

        await waitFor(() => {
            expect(bob.getMessages(channelId)).toContain('what.jpg')
            const imageMessage = bob
                .getEvents_TypedRoomMessage(channelId)
                .find((event) => event.content?.msgType === MessageType.Image)

            expect(imageMessage).toBeDefined()
            expect((imageMessage?.content.content as ImageMessageContent).info.url).toBe(
                IMAGE_MSG_CONTENT.info.url,
            )
            expect((imageMessage?.content.content as ImageMessageContent).thumbnail?.size).toBe(30)
        })
    })
}) // end describe
