/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group core
 */
import { waitFor } from '@testing-library/dom'
import { Permission } from '@river-build/web3'
import { ZTEvent } from '../../src/types/timeline-types'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    registerAndStartClients,
} from './helpers/TestUtils'

describe('mentions', () => {
    test('send and receive a mention', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob needs funds to create a space
        await bob.fundWallet()

        // create a space
        const spaceId = await createTestSpaceGatedByTownNft(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
            },
        )
        // create a channel
        const channelId = await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })

        console.log("bob's spaceId", { spaceId, channelId })

        await alice.joinTown(spaceId, alice.wallet)
        await alice.joinRoom(channelId)
        const bobDisplayName = bob.getUserId() ?? 'bob'
        // alice sends a message
        await alice.sendMessage(channelId, 'Hi @bob', {
            mentions: [
                {
                    userId: bob.getUserId(),
                    displayName: bobDisplayName,
                },
            ],
        })

        // bob should receive the message
        await waitFor(async () => {
            const e = await bob.getLatestEvent(channelId)
            expect(
                e?.content?.kind === ZTEvent.RoomMessage &&
                    e?.content?.body === 'Hi @bob' &&
                    e?.content?.mentions != undefined &&
                    e?.content?.mentions.length > 0 &&
                    e?.content?.mentions[0].userId === bob.getUserId() &&
                    e?.content?.mentions[0].displayName === bobDisplayName,
            ).toEqual(true)
        })
    }) // end test
}) // end describe
