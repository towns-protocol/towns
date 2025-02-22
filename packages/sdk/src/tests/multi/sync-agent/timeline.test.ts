import { Permission } from '@river-build/web3'
import { findMessageByText, waitFor } from '../../testUtils'
import { Bot } from '../../../sync-agent/utils/bot'
import { makeDefaultMembershipInfo } from '../../../sync-agent/utils/spaceUtils'
import { RiverTimelineEvent } from '../../../sync-agent/timeline/models/timeline-types'

const setupTest = async () => {
    const bobUser = new Bot()
    const aliceUser = new Bot()
    const charlieUser = new Bot()
    await Promise.all([bobUser.fundWallet(), aliceUser.fundWallet(), charlieUser.fundWallet()])
    const [bob, alice, charlie] = await Promise.all([
        bobUser.makeSyncAgent(),
        aliceUser.makeSyncAgent(),
        charlieUser.makeSyncAgent(),
    ])
    return { bob, alice, charlie, bobUser, aliceUser, charlieUser }
}

describe('timeline.test.ts', () => {
    test.concurrent('send and receive a mention', async () => {
        const { bob, alice, bobUser, aliceUser } = await setupTest()
        await Promise.all([bob.start(), alice.start()])
        const { spaceId } = await bob.spaces.createSpace({ spaceName: 'BlastOff' }, bobUser.signer)
        expect(bob.user.memberships.isJoined(spaceId)).toBe(true)
        await alice.spaces.getSpace(spaceId).join(aliceUser.signer)
        const aliceChannel = alice.spaces.getSpace(spaceId).getDefaultChannel()
        expect(alice.user.memberships.isJoined(spaceId)).toBe(true)
        await aliceChannel.sendMessage('Hi @bob', {
            mentions: [
                {
                    userId: bob.userId,
                    displayName: 'bob',
                    mentionBehavior: { case: undefined, value: undefined }, // geez
                },
            ],
        })
        const bobChannel = bob.spaces.getSpace(spaceId).getDefaultChannel()

        // bob should receive the message
        await waitFor(async () => {
            const e = findMessageByText(bobChannel.timeline.events.value, 'Hi @bob')
            expect(
                e?.content?.kind === RiverTimelineEvent.ChannelMessage &&
                    e?.content?.body === 'Hi @bob' &&
                    e?.content?.mentions != undefined &&
                    e?.content?.mentions.length > 0 &&
                    e?.content?.mentions[0].userId === bob.userId &&
                    e?.content?.mentions[0].displayName === 'bob',
            ).toEqual(true)
        })
    })

    // aellis 2025-01-25: this test is flaky and fails intermittently
    test.skip('scrollback', async () => {
        const NUM_MESSAGES = 100
        const { bob, alice, bobUser, aliceUser } = await setupTest()
        await Promise.all([bob.start(), alice.start()])
        const { spaceId } = await bob.spaces.createSpace(
            { spaceName: 'Scrollback Team 🔙' },
            bobUser.signer,
        )
        const bobChannel = bob.spaces.getSpace(spaceId).getDefaultChannel()

        for (let i = 0; i < NUM_MESSAGES; i++) {
            await bobChannel.sendMessage(`message ${i}`)
            // force miniblocks, if we're going fast it's possible that the miniblock is not created
            if ((i % NUM_MESSAGES) / 4 == 0) {
                await bob.riverConnection.client?.debugForceMakeMiniblock(bobChannel.data.id, {
                    forceSnapshot: true,
                })
            }
        }
        // alice joins the room
        await alice.spaces.getSpace(spaceId).join(aliceUser.signer)
        const aliceChannel = alice.spaces.getSpace(spaceId).getDefaultChannel()
        // alice shouldnt receive all the messages, only a few
        await waitFor(() =>
            expect(aliceChannel.timeline.events.value.length).toBeLessThan(NUM_MESSAGES),
        )
        const aliceChannelLength = aliceChannel.timeline.events.value.length
        // call scrollback
        await aliceChannel.timeline.scrollback()
        // did we get more events?
        await waitFor(() =>
            expect(aliceChannel.timeline.events.value.length).toBeGreaterThanOrEqual(
                aliceChannelLength,
            ),
        )
    })

    test.concurrent('three users in a room', async () => {
        const { bob, alice, charlie, bobUser, aliceUser, charlieUser } = await setupTest()
        await Promise.all([bob.start(), alice.start(), charlie.start()])
        // bob creates a space
        const { spaceId } = await bob.spaces.createSpace(
            { spaceName: 'Encrypted Room 🔐' },
            bobUser.signer,
        )
        const bobSpace = bob.spaces.getSpace(spaceId)
        // create a channel
        // const channelId = await bobSpace.createChannel('Vault 🔒', bobUser.signer)

        // Join the space and channel
        await Promise.all([
            alice.spaces.getSpace(spaceId).join(aliceUser.signer),
            charlie.spaces.getSpace(spaceId).join(charlieUser.signer),
        ])
        // TODO: join channel by id
        const aliceChannel = alice.spaces.getSpace(spaceId).getDefaultChannel()
        const charlieChannel = charlie.spaces.getSpace(spaceId).getDefaultChannel()
        const bobChannel = bobSpace.getDefaultChannel()

        // Confirm that the members are in
        await waitFor(() => {
            const members = bobChannel.members.value
            expect(members.data.initialized).toBe(true)
            expect(members.data.userIds.length).toBe(3)
        })

        await bobChannel.sendMessage('hey everyone!')

        // everyone should receive the message
        await Promise.all([
            waitFor(() =>
                expect(
                    findMessageByText(aliceChannel.timeline.events.value, 'hey everyone!'),
                ).toBeTruthy(),
            ),
            waitFor(() =>
                expect(
                    findMessageByText(charlieChannel.timeline.events.value, 'hey everyone!'),
                ).toBeTruthy(),
            ),
        ])

        // everyone sends a message to the room
        await Promise.all([
            aliceChannel.sendMessage('Hello Bob from Alice!'),
            charlieChannel.sendMessage('Hello Bob from Charlie!'),
        ])

        // bob should receive the messages
        await waitFor(() => {
            expect(
                findMessageByText(bobChannel.timeline.events.value, 'Hello Bob from Alice!'),
            ).toBeTruthy()
            expect(
                findMessageByText(bobChannel.timeline.events.value, 'Hello Bob from Charlie!'),
            ).toBeTruthy()
        })
    })

    test.concurrent('create room, send message, send a reaction and redact', async () => {
        const { bob, alice, bobUser, aliceUser } = await setupTest()
        await Promise.all([bob.start(), alice.start()])
        const defaultMembership = await makeDefaultMembershipInfo(
            bob.riverConnection.spaceDapp,
            bob.userId,
        )
        const { spaceId } = await bob.spaces.createSpace(
            {
                spaceName: 'ReActers 🤠',
                membership: {
                    ...defaultMembership,
                    permissions: [
                        Permission.Read,
                        Permission.Write,
                        Permission.Redact,
                        Permission.React,
                    ],
                },
            },
            bobUser.signer,
        )
        const bobChannel = bob.spaces.getSpace(spaceId).getDefaultChannel()
        await alice.spaces.getSpace(spaceId).join(aliceUser.signer)
        const aliceChannel = alice.spaces.getSpace(spaceId).getDefaultChannel()
        // bob sends a message to the room
        await bobChannel.sendMessage('hey!')
        // wait for alice to receive the message
        await waitFor(async () => {
            const event = findMessageByText(aliceChannel.timeline.events.value, 'hey!')
            expect(
                event?.content?.kind === RiverTimelineEvent.ChannelMessage &&
                    event?.content?.body === 'hey!',
            ).toEqual(true)
        })
        // alice grabs the message
        const messageEvent = findMessageByText(aliceChannel.timeline.events.value, 'hey!')
        expect(messageEvent).toBeTruthy()
        // alice sends a reaction
        const { eventId: reactionEventId } = await aliceChannel.sendReaction(
            messageEvent!.eventId,
            '👍',
        )
        // wait for bob to receive the reaction
        await waitFor(async () => {
            const reaction = bobChannel.timeline.reactions.get(messageEvent!.eventId)
            expect(reaction).toBeTruthy()
            expect(reaction?.['👍']).toBeTruthy()
            expect(reaction?.['👍'][alice.userId].eventId).toEqual(reactionEventId)
        })
        // alice deletes the reaction
        await aliceChannel.redact(reactionEventId)
        // wait for bob to no longer see the reaction
        await waitFor(() => {
            const reaction = bobChannel.timeline.reactions.get(messageEvent!.eventId)
            expect(reaction).toBeUndefined()
        })
    })

    test.concurrent(
        'create room, invite user, accept invite, and send threadded message',
        async () => {
            const { bob, alice, bobUser, aliceUser } = await setupTest()
            await Promise.all([bob.start(), alice.start()])
            const defaultMembership = await makeDefaultMembershipInfo(
                bob.riverConnection.spaceDapp,
                bob.userId,
            )
            const { spaceId } = await bob.spaces.createSpace(
                {
                    spaceName: 'Monday Sewing Club 🧵',
                    membership: {
                        ...defaultMembership,
                        permissions: [
                            Permission.Read,
                            Permission.Write,
                            Permission.Redact,
                            Permission.React,
                        ],
                    },
                },
                bobUser.signer,
            )
            const bobChannel = bob.spaces.getSpace(spaceId).getDefaultChannel()
            await alice.spaces.getSpace(spaceId).join(aliceUser.signer)
            const aliceChannel = alice.spaces.getSpace(spaceId).getDefaultChannel()
            // bob sends a message to the room
            await bobChannel.sendMessage('hey alice, ready to sew?')
            // wait for alice to receive the message
            await waitFor(async () => {
                const event = findMessageByText(
                    aliceChannel.timeline.events.value,
                    'hey alice, ready to sew?',
                )
                expect(
                    event?.content?.kind === RiverTimelineEvent.ChannelMessage &&
                        event?.content?.body === 'hey alice, ready to sew?',
                ).toEqual(true)
            })
            const event = aliceChannel.timeline.events.getLatestEvent(
                RiverTimelineEvent.ChannelMessage,
            )!
            // a non threaded message should not have a thread parent id
            expect(event?.threadParentId).toBeUndefined()
            // alice sends a threaded reply room
            const firstReply = await aliceChannel.sendMessage('yey lesgo!', {
                threadId: event.eventId,
            })
            const secondReply = await aliceChannel.sendMessage('i was planning to make a hat', {
                threadId: event.eventId,
            })
            // bob should receive the message in the thread and the thread id should be set to parent event id
            await waitFor(() => {
                const thread = bobChannel.timeline.threads.get(event.eventId)
                expect(thread).toBeTruthy()
                expect(
                    thread?.find((e) => e.eventId === firstReply.eventId)?.content?.kind ===
                        RiverTimelineEvent.ChannelMessage,
                ).toBeTruthy()
                expect(
                    thread?.find((e) => e.eventId === secondReply.eventId)?.content?.kind ===
                        RiverTimelineEvent.ChannelMessage,
                ).toBeTruthy()
            })
            // alice deletes the first reply
            await aliceChannel.redact(firstReply.eventId)
            // bob should no longer see the first reply
            await waitFor(() => {
                const thread = bobChannel.timeline.threads.get(event.eventId)!
                expect(
                    thread.find((e) => e.eventId === firstReply.eventId)?.content?.kind ===
                        RiverTimelineEvent.RedactedEvent,
                ).toBeTruthy()
                expect(
                    thread.find((e) => e.eventId === secondReply.eventId)?.content?.kind ===
                        RiverTimelineEvent.ChannelMessage,
                ).toBeTruthy()
            })
        },
    )
})
