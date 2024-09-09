/**
 * @group with-entitlements
 */
import { dlogger } from '@river-build/dlog'
import { SyncAgent } from './syncAgent'
import { Bot } from './utils/bot'
import { waitFor } from '../util.test'
import { NoopRuleData, Permission } from '@river-build/web3'

const logger = dlogger('csb:test:syncAgents')

describe('syncAgents.test.ts', () => {
    logger.log('start')
    const bobUser = new Bot()
    const aliceUser = new Bot()
    let bob: SyncAgent
    let alice: SyncAgent

    beforeEach(async () => {
        await bobUser.fundWallet()
        await aliceUser.fundWallet()
        bob = await bobUser.makeSyncAgent()
        alice = await aliceUser.makeSyncAgent()
    })

    afterEach(async () => {
        await bob.stop()
        await alice.stop()
    })

    test('syncAgents', async () => {
        await Promise.all([bob.start(), alice.start()])

        const { spaceId } = await bob.spaces.createSpace({ spaceName: 'BlastOff' }, bobUser.signer)
        expect(bob.user.memberships.isJoined(spaceId)).toBe(true)

        await alice.spaces.getSpace(spaceId).join(aliceUser.signer)
        expect(alice.user.memberships.isJoined(spaceId)).toBe(true)
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
        expect(channel.timeline.events.value.find((e) => e.text === 'Hello, World!')).toBeDefined()

        // sleep for a bit, then check if alice got the message
        const aliceChannel = alice.spaces.getSpace(spaceId).getChannel(channel.data.id)
        logger.log(aliceChannel.timeline.events.value)
        await waitFor(
            () =>
                expect(
                    aliceChannel.timeline.events.value.find((e) => e.text === 'Hello, World!'),
                ).toBeDefined(),
            { timeoutMS: 10000 },
        )
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
        const event = channel.timeline.events.value.find((e) => e.text === 'Hello, World!')
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
})
