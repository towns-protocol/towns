/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group casablanca
 */
import { MessageType, SendImageMessageOptions } from '../../src/types/zion-types'
import {
    createTestSpaceGatedByTownAndZionNfts,
    makeUniqueName,
    registerAndStartClients,
    registerAndStartClient,
    createTestChannelWithSpaceRoles,
    waitForWithRetries,
} from './helpers/TestUtils'

import { Permission } from '@river/web3'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'
import { check } from '@river/waterproof'

describe('messageTypes', () => {
    test('send a m.gm message to test message types', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerAndStartClient(
            'alice',
            TestConstants.getWalletWithTestGatingNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a public room
        const spaceId = (await createTestSpaceGatedByTownAndZionNfts(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: makeUniqueName('bobs room'),
            },
        )) as string
        // create a channel
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roleIds: [],
        }))!

        // alice joins the room
        await alice.joinTown(spaceId, alice.wallet)
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
                .find((event) => event.content.content.msgType === MessageType.GM),
        ).toBeDefined()
    }) // end test

    test('send a m.image message', async () => {
        const IMAGE_MSG_CONTENT: SendImageMessageOptions = {
            messageType: MessageType.Image,
            info: {
                url: 'https://what.com/what.jpg',
                size: 500,
                mimetype: 'image/jpg',
                width: 300,
                height: 400,
            },
            thumbnail: {
                url: 'https://what.com/what-thumb.jpg',
                size: 30,
                mimetype: 'image/jpg',
                width: 100,
                height: 100,
            },
        } satisfies SendImageMessageOptions
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerAndStartClient(
            'alice',
            TestConstants.getWalletWithTestGatingNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a public room
        const spaceId = (await createTestSpaceGatedByTownAndZionNfts(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: makeUniqueName('bobs room'),
            },
        )) as string
        // create a channel
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roleIds: [],
        }))!

        // alice joins the room
        await alice.joinTown(spaceId, alice.wallet)
        await waitForWithRetries(() => alice.joinRoom(channelId))
        // alice sends a image message
        await waitForWithRetries(() => alice.sendMessage(channelId, 'what.jpg', IMAGE_MSG_CONTENT))

        await waitFor(() => {
            expect(bob.getMessages(channelId)).toContain('what.jpg')
            const imageMessage = bob
                .getEvents_TypedRoomMessage(channelId)
                .find((event) => event.content?.content.msgType === MessageType.Image)

            expect(imageMessage).toBeDefined()
            check(imageMessage?.content.content.msgType === MessageType.Image)
            expect(imageMessage?.content.content.info?.url).toBe(IMAGE_MSG_CONTENT.info.url)
            expect(imageMessage?.content.content.thumbnail?.size).toBe(30)
        })
    })
}) // end describe
