/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { waitFor } from '@testing-library/dom'
import { Permission } from '../../src/client/web3/ContractTypes'
import { RoomVisibility } from '../../src/types/zion-types'
import { ZTEvent } from '../../src/types/timeline-types'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    registerAndStartClients,
} from './helpers/TestUtils'

describe('mentions', () => {
    test('send and receive a mention', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // create a space
        const spaceId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Public,
            },
        ))!
        // create a channel
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        }))!

        console.log("bob's spaceId", { spaceId, channelId })

        await alice.joinRoom(channelId)
        const bobDisplayName = bob.getUser(bob.getUserId(channelId.protocol)!)?.displayName ?? 'bob'
        // alice sends a wenmoon message
        await alice.sendMessage(channelId, 'Hi @bob', {
            mentions: [
                {
                    userId: bob.getUserId(channelId.protocol)!,
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
                    e?.content?.mentions[0].userId === bob.getUserId(channelId.protocol) &&
                    e?.content?.mentions[0].displayName === bobDisplayName,
            ).toEqual(true)
        })
    }) // end test
}) // end describe
