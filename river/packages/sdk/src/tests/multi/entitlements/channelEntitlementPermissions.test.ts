/**
 * @group with-entitlements
 */

import { setupChannelWithCustomRole, expectUserCanJoinChannel } from '../../testUtils'
import { dlog } from '@river-build/dlog'
import { NoopRuleData, Permission } from '@river-build/web3'

const log = dlog('csb:test:channelEntitlementPermissions')

describe('channelEntitlementPermissions', () => {
    test("READ-only user cannot write or react to a channel's messages", async () => {
        const { alice, bob, aliceSpaceDapp, spaceId, channelId } = await setupChannelWithCustomRole(
            ['alice'],
            NoopRuleData,
        )

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const { eventId: refEventId } = await bob.sendMessage(channelId!, 'Hello, world!')

        // React to Bob's message not allowed.
        await expect(
            alice.sendChannelMessage_Reaction(channelId!, { reaction: '👍', refEventId }),
        ).rejects.toThrow(/*not entitled to add message to channel*/)

        // Reply to Bob's message not allowed.
        await expect(
            alice.sendChannelMessage_Text(channelId!, {
                content: {
                    body: 'Hello, world!',
                    mentions: [],
                    attachments: [],
                },
                threadId: refEventId, // reply to Bob's message
            }),
        ).rejects.toThrow(/*not entitled to add message to channel*/)

        // Top-level post not allowed.
        await expect(
            alice.sendMessage(channelId!, 'Hello, world!'),
        ).rejects.toThrow(/*not entitled to add message to channel*/)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('READ + REACT user can react and redact reactions, but cannot write (top-level or reply)', async () => {
        const { alice, bob, aliceSpaceDapp, spaceId, channelId } = await setupChannelWithCustomRole(
            ['alice'],
            NoopRuleData,
            [Permission.Read, Permission.React],
        )

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const { eventId: refEventId } = await bob.sendMessage(channelId!, 'Hello, world!')

        // Reacting to Bob's message should be allowed. Redacting the reaction should also be allowed.
        const { eventId } = await alice.sendChannelMessage_Reaction(channelId!, {
            reaction: '👍',
            refEventId,
        })
        expect(eventId).toBeDefined()
        await expect(
            alice.sendChannelMessage_Redaction(channelId!, {
                refEventId: eventId,
            }),
        ).resolves.not.toThrow()

        // Replying to Bob's message should not be allowed.
        await expect(
            alice.sendChannelMessage_Text(channelId!, {
                content: {
                    body: 'Hello, world!',
                    mentions: [],
                    attachments: [],
                },
                threadId: refEventId, // reply to Bob's message
            }),
        ).rejects.toThrow(/*not entitled to add message to channel*/)

        // Cannot make a top-level post to the channel.
        await expect(
            alice.sendMessage(channelId!, 'Hello, world!'),
        ).rejects.toThrow(/*not entitled to add message to channel*/)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    // In practice we would never have a user with only write permissions, but this is a good test
    // to make sure our permissions are non-overlapping.
    test('WRITE user can write (top-level plus reply), react', async () => {
        const { alice, bob, aliceSpaceDapp, spaceId, channelId } = await setupChannelWithCustomRole(
            ['alice'],
            NoopRuleData,
            [Permission.Read, Permission.Write],
        )

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const { eventId: refEventId } = await bob.sendMessage(channelId!, 'Hello, world!')

        // Reacting to Bob's message should be allowed. Redacting the reaction should also be allowed.
        const { eventId } = await alice.sendChannelMessage_Reaction(channelId!, {
            reaction: '👍',
            refEventId,
        })
        expect(eventId).toBeDefined()
        await expect(
            alice.sendChannelMessage_Redaction(channelId!, {
                refEventId: eventId,
            }),
        ).resolves.not.toThrow()

        // Replying to Bob's message should be allowed.
        await expect(
            alice.sendChannelMessage_Text(channelId!, {
                content: {
                    body: 'Hello, world!',
                    mentions: [],
                    attachments: [],
                },
                threadId: refEventId, // reply to Bob's message
            }),
        ).resolves.not.toThrow()

        // Top-level post currently allowed.
        await expect(alice.sendMessage(channelId!, 'Hello, world!')).resolves.not.toThrow()

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('REACT + WRITE user can do all WRITE user can do', async () => {
        const { alice, bob, aliceSpaceDapp, spaceId, channelId } = await setupChannelWithCustomRole(
            ['alice'],
            NoopRuleData,
            [Permission.Read, Permission.React, Permission.Write],
        )

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const { eventId: refEventId } = await bob.sendMessage(channelId!, 'Hello, world!')

        // Reacting to Bob's message should be allowed. Redacting the reaction should also be allowed.
        const { eventId } = await alice.sendChannelMessage_Reaction(channelId!, {
            reaction: '👍',
            refEventId,
        })
        expect(eventId).toBeDefined()
        await expect(
            alice.sendChannelMessage_Redaction(channelId!, {
                refEventId: eventId,
            }),
        ).resolves.not.toThrow()

        // Replying to Bob's message should be allowed.
        await expect(
            alice.sendChannelMessage_Text(channelId!, {
                content: {
                    body: 'Hello, world!',
                    mentions: [],
                    attachments: [],
                },
                threadId: refEventId, // reply to Bob's message
            }),
        ).resolves.not.toThrow()

        // Top-level post currently allowed.
        await expect(alice.sendMessage(channelId!, 'Hello, world!')).resolves.not.toThrow()

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })
})
