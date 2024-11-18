/**
 * @group with-entitlements
 */
import { dlogger } from '@river-build/dlog'
import { SyncAgent } from './syncAgent'
import { Bot } from './utils/bot'
import { findMessageByText, waitFor } from '../util.test'
import { NoopRuleData, Permission } from '@river-build/web3'

const logger = dlogger('csb:test:syncAgents')

describe('syncAgents.test.ts', () => {
    logger.log('start')
    const bobUser = new Bot()
    const aliceUser = new Bot()
    const charlieUser = new Bot()
    let bob: SyncAgent
    let alice: SyncAgent
    let charlie: SyncAgent

    beforeEach(async () => {
        await Promise.all([bobUser.fundWallet(), aliceUser.fundWallet(), charlieUser.fundWallet()])
        bob = await bobUser.makeSyncAgent()
        alice = await aliceUser.makeSyncAgent()
        charlie = await charlieUser.makeSyncAgent()
    })

    afterEach(async () => {
        await bob.stop()
        await alice.stop()
        await charlie.stop()
    })

    test('syncAgents', async () => {
        await Promise.all([bob.start(), alice.start(), charlie.start()])

        const { spaceId } = await bob.spaces.createSpace({ spaceName: 'BlastOff' }, bobUser.signer)
        expect(bob.user.memberships.isJoined(spaceId)).toBe(true)

        await Promise.all([
            alice.spaces.getSpace(spaceId).join(aliceUser.signer),
            charlie.spaces.getSpace(spaceId).join(charlieUser.signer),
        ])
        expect(alice.user.memberships.isJoined(spaceId)).toBe(true)
        expect(charlie.user.memberships.isJoined(spaceId)).toBe(true)
    })

    test('syncAgents load async', async () => {
        await bob.start()

        const { spaceId } = await bob.spaces.createSpace(
            { spaceName: 'OuterSpace' },
            bobUser.signer,
        )
        expect(bob.user.memberships.isJoined(spaceId)).toBe(true)

        // queue up a join, then start the client (wow!)
        const alicePromise = alice.spaces.getSpace(spaceId).join(aliceUser.signer)
        await alice.start()
        await alicePromise
        expect(alice.user.memberships.isJoined(spaceId)).toBe(true)
    })

    test('syncAgents send a message', async () => {
        await Promise.all([bob.start(), alice.start()])
        await waitFor(() => bob.spaces.value.status === 'loaded')
        expect(bob.spaces.data.spaceIds.length).toBeGreaterThan(0)
        const spaceId = bob.spaces.data.spaceIds[0]
        expect(alice.user.memberships.isJoined(spaceId)).toBe(true) // alice joined above
        const space = bob.spaces.getSpace(spaceId)
        const channel = space.getDefaultChannel()
        await channel.sendMessage('Hello, World!')
        expect(findMessageByText(channel.timeline.events.value, 'Hello, World!')).toBeDefined()

        // sleep for a bit, then check if alice got the message
        const aliceChannel = alice.spaces.getSpace(spaceId).getChannel(channel.data.id)
        logger.log(aliceChannel.timeline.events.value)
        await waitFor(
            () =>
                expect(
                    findMessageByText(aliceChannel.timeline.events.value, 'Hello, World!'),
                ).toBeDefined(),
            { timeoutMS: 10000 },
        )
    })

    test('syncAgents send a message with disableSignatureValidation=true', async () => {
        const prevBobOpts = bob.riverConnection.clientParams.unpackEnvelopeOpts
        const prevAliceOpts = alice.riverConnection.clientParams.unpackEnvelopeOpts
        bob.riverConnection.clientParams.unpackEnvelopeOpts = {
            disableSignatureValidation: true,
        }
        alice.riverConnection.clientParams.unpackEnvelopeOpts = {
            disableSignatureValidation: true,
        }
        await Promise.all([bob.start(), alice.start()])
        await waitFor(() => bob.spaces.value.status === 'loaded')
        const spaceId = bob.spaces.data.spaceIds[0]
        const space = bob.spaces.getSpace(spaceId)
        const channelId = await space.createChannel('random', bobUser.signer)
        const channel = space.getChannel(channelId)
        await channel.sendMessage('Hello, World again!')

        // join the channel, find the message
        const aliceChannel = alice.spaces.getSpace(spaceId).getChannel(channel.data.id)
        await aliceChannel.join()
        logger.log(aliceChannel.timeline.events.value)
        await waitFor(
            () =>
                expect(
                    findMessageByText(aliceChannel.timeline.events.value, 'Hello, World again!'),
                ).toBeDefined(),
            { timeoutMS: 10000 },
        )
        // reset the unpackEnvelopeOpts
        bob.riverConnection.clientParams.unpackEnvelopeOpts = prevBobOpts
        alice.riverConnection.clientParams.unpackEnvelopeOpts = prevAliceOpts
    })

    test('syncAgents pin a message', async () => {
        await Promise.all([bob.start(), alice.start()])
        await waitFor(() => bob.spaces.value.status === 'loaded')
        expect(bob.spaces.data.spaceIds.length).toBeGreaterThan(0)
        const spaceId = bob.spaces.data.spaceIds[0]
        expect(alice.user.memberships.isJoined(spaceId)).toBe(true) // alice joined above
        const space = bob.spaces.getSpace(spaceId)
        const channel = space.getDefaultChannel()
        const channelId = channel.data.id
        const event = findMessageByText(channel.timeline.events.value, 'Hello, World!')
        expect(event).toBeDefined()
        // bob can pin
        const result = await channel.pin(event!.eventId)
        expect(result).toBeDefined()
        expect(result.error).toBeUndefined()
        await waitFor(() =>
            expect(
                bob.riverConnection.client?.streams.get(channelId)?.view.membershipContent.pins
                    .length,
            ).toBe(1),
        )
        // bob can unpin
        const result2 = await channel.unpin(event!.eventId)
        expect(result2).toBeDefined()
        expect(result2.error).toBeUndefined()

        // alice can't pin yet, she doesn't have permissions
        const aliceChannel = alice.spaces.getSpace(spaceId).getChannel(channelId)
        await waitFor(() => aliceChannel.value.status === 'loaded')

        // grant permissions
        const txn1 = await alice.riverConnection.spaceDapp.createRole(
            spaceId,
            'pin message role',
            [Permission.PinMessage],
            [aliceUser.rootWallet.address],
            NoopRuleData,
            bobUser.signer,
        )
        const { roleId, error: roleError } =
            await alice.riverConnection.spaceDapp.waitForRoleCreated(spaceId, txn1)
        expect(roleError).toBeUndefined()
        expect(roleId).toBeDefined()
        const txn2 = await bob.riverConnection.spaceDapp.addRoleToChannel(
            spaceId,
            channelId,
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            roleId!,
            bobUser.signer,
        )
        await txn2.wait()
        // alice can pin
        const result3 = await aliceChannel.pin(event!.eventId)
        expect(result3).toBeDefined()
        expect(result3.error).toBeUndefined()
    })

    test('dm', async () => {
        await Promise.all([bob.start(), alice.start()])
        const { streamId } = await bob.dms.createDM(alice.userId)
        const bobAndAliceDm = bob.dms.getDm(streamId)
        await waitFor(() => expect(bobAndAliceDm.members.data.initialized).toBe(true))
        expect(bobAndAliceDm.members.data.userIds).toEqual(
            expect.arrayContaining([bob.userId, alice.userId]),
        )
        await bobAndAliceDm.sendMessage('hi')
        const aliceAndBobDm = alice.dms.getDmWithUserId(bob.userId)
        await waitFor(
            () =>
                expect(findMessageByText(aliceAndBobDm.timeline.events.value, 'hi')).toBeDefined(),
            { timeoutMS: 10000 },
        )
    })

    test('gdm', async () => {
        await Promise.all([bob.start(), alice.start(), charlie.start()])
        const { streamId } = await bob.gdms.createGDM([alice.userId, charlie.userId])
        const bobGdm = bob.gdms.getGdm(streamId)
        await waitFor(() => expect(bobGdm.members.data.initialized).toBe(true))
        expect(bobGdm.members.data.userIds).toEqual(
            expect.arrayContaining([bob.userId, alice.userId, charlie.userId]),
        )
        await bobGdm.sendMessage('Hello, World!')
        const aliceGdm = alice.gdms.getGdm(streamId)
        await waitFor(
            () =>
                expect(
                    findMessageByText(aliceGdm.timeline.events.value, 'Hello, World!'),
                ).toBeDefined(),
            { timeoutMS: 10000 },
        )
    })
})
