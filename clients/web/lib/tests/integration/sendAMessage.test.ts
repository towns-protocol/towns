/**
 * sendAMessage
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group core
 *
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    registerAndStartClients,
    waitForWithRetries,
} from './helpers/TestUtils'

import { Permission } from '@river-build/web3'
import { waitFor } from '@testing-library/dom'
import { check } from '@river-build/dlog'
import { DecryptedTimelineEvent } from '@river-build/sdk'
import { SnapshotCaseType } from '@river-build/proto'

describe('sendAMessage', () => {
    test('create room, invite user, accept invite, and send encrypted message', async () => {
        const numClients = process.env.NUM_CLIENTS ? parseInt(process.env.NUM_CLIENTS, 10) : 2
        expect(numClients).toBeGreaterThanOrEqual(2)
        console.log('sendAMessage', { numClients })
        // create clients
        const names = Array.from(Array(numClients).keys()).map((i) => `client_${i}`)
        const clients = await registerAndStartClients(names)
        const bob = clients['client_0']

        // bob creates a space
        console.log(`!!!!!! bob creates space`)
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

        // everyone joins the space
        for (let i = 1; i < numClients; i++) {
            console.log(`!!!!!! client ${i} joins room`)
            const client = clients[`client_${i}`]
            await client.joinTown(spaceId, client.wallet)
        }
        // everyone joins the room
        for (let i = 1; i < numClients; i++) {
            console.log(`!!!!!! client ${i} joins room`)
            const client = clients[`client_${i}`]
            await waitForWithRetries(() => client.joinRoom(channelId))
        }

        const members = bob.getRoomData(spaceId)?.members

        expect(members).toBeDefined()
        expect(members?.length).toBe(numClients)

        const clientEvents: DecryptedTimelineEvent[] = []
        const bobRecievedEvents: DecryptedTimelineEvent[] = []
        // everyone should receive the message
        for (let i = 0; i < numClients; i++) {
            console.log(`!!!!!! client ${i} waits for message`)
            const client = clients[`client_${i}`]
            client.casablancaClient?.on(
                'eventDecrypted',
                (streamId: string, streamKind: SnapshotCaseType, event: DecryptedTimelineEvent) => {
                    if (streamKind === 'channelContent') {
                        clientEvents.push(event)
                    }
                },
            )
        }

        // bob should receive the message
        bob.casablancaClient?.on(
            'eventDecrypted',
            (streamId: string, streamKind: SnapshotCaseType, event: DecryptedTimelineEvent) => {
                if (streamKind === 'channelContent') {
                    if (event.remoteEvent.creatorUserId !== bob?.casablancaClient?.userId) {
                        bobRecievedEvents.push(event)
                    }
                }
            },
        )

        // bob sends a message to the room
        console.log(`!!!!!! bob sends message`)
        await bob.sendMessage(channelId, 'Hello Alice!')

        // everyone sends a message to the room
        for (let i = 1; i < numClients; i++) {
            console.log(`!!!!!! client ${i} sends a message`)
            const client = clients[`client_${i}`]
            await client.sendMessage(channelId, `Hello Bob! from ${client.getUserId()}`)
        }

        await waitFor(() => {
            const events = getMessages(clientEvents)
            expect(events).toContain('Hello Alice!')
        })

        await waitFor(() => {
            const client = clients[`client_${1}`]
            const events = getMessages(bobRecievedEvents)
            expect(events).toContain(`Hello Bob! from ${client.getUserId()}`)
        })

        await bob.leave(channelId)
    }) // end test
}) // end describe

function getMessages(events: DecryptedTimelineEvent[]): string[] {
    return events.map((e) => {
        const content = e.decryptedContent
        check(content.kind === 'channelMessage')
        if (
            content !== undefined &&
            content?.content?.payload &&
            content?.content.payload?.case === 'post' &&
            content?.content.payload?.value?.content?.case === 'text'
        ) {
            return content?.content.payload?.value?.content?.value.body
        }
        return content?.content?.payload?.case ?? 'undefined'
    })
}
