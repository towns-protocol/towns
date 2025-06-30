/**
 * @group with-entitlements
 */

import {
    waitFor,
    setupWalletsAndContexts,
    createSpaceAndDefaultChannel,
    expectUserCanJoin,
    everyoneMembershipStruct,
    getXchainConfigForTesting,
    setupChannelWithCustomRole,
    expectUserCanJoinChannel,
    getTimelineMessagePayload,
} from '../../testUtils'
import { dlog } from '@towns-protocol/dlog'
import { NoopRuleData, Permission } from '@towns-protocol/web3'

const log = dlog('csb:test:channelsWithEntitlements')

describe('channelsWithEntitlements', () => {
    test('banned user not entitled to channel', async () => {
        const {
            alice,
            alicesWallet,
            aliceSpaceDapp,
            bob,
            bobSpaceDapp,
            bobProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole(['alice'], NoopRuleData)

        await expectUserCanJoinChannel(
            alice,
            aliceSpaceDapp,
            spaceId,
            channelId!,
        )

        const tx = await bobSpaceDapp.banWalletAddress(
            spaceId,
            alicesWallet.address,
            bobProvider.wallet,
        )
        await tx.wait()

        // Wait 5 seconds for the positive auth cache on the client to expire
        await new Promise((f) => setTimeout(f, 5000))

        await expect(
            aliceSpaceDapp.isEntitledToChannel(
                spaceId,
                channelId!,
                alice.userId,
                Permission.Read,
                getXchainConfigForTesting(),
            ),
        ).resolves.toBeFalsy()

        // unban alice
        const unbanTx = await bobSpaceDapp.unbanWalletAddress(
            spaceId,
            alicesWallet.address,
            bobProvider.wallet,
        )
        await unbanTx.wait()

        // Wait 5 seconds for the caches to expire
        await new Promise((f) => setTimeout(f, 5000))

        await expect(
            aliceSpaceDapp.isEntitledToChannel(
                spaceId,
                channelId!,
                alice.userId,
                Permission.Read,
                getXchainConfigForTesting(),
            ),
        ).resolves.toBeTruthy()

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    // Banning with entitlements — users need permission to ban other users.
    test('adminsCanRedactChannelMessages', async () => {
        // log('start adminsCanRedactChannelMessages')
        // // set up the web3 provider and spacedapp
        const {
            alice,
            bob,
            alicesWallet,
            aliceProvider,
            bobProvider,
            aliceSpaceDapp,
            bobSpaceDapp,
        } = await setupWalletsAndContexts()

        const { spaceId, defaultChannelId } =
            await createSpaceAndDefaultChannel(
                bob,
                bobSpaceDapp,
                bobProvider.wallet,
                'bob',
                await everyoneMembershipStruct(bobSpaceDapp, bob),
            )
        bob.startSync()

        // // Alice should have no issue joining the space and default channel.
        await expectUserCanJoin(
            spaceId,
            defaultChannelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        // Alice says something bad
        const stream = await alice.waitForStream(defaultChannelId)
        await alice.sendMessage(defaultChannelId, 'Very bad message!')
        let eventId: string | undefined
        await waitFor(() => {
            const event = stream.view.timeline.find(
                (e) => getTimelineMessagePayload(e) === 'Very bad message!',
            )
            expect(event).toBeDefined()
            eventId = event?.eventId
        })

        expect(stream).toBeDefined()
        expect(eventId).toBeDefined()

        await expect(
            bob.redactMessage(defaultChannelId, eventId!),
        ).resolves.not.toThrow()
        await expect(
            alice.redactMessage(defaultChannelId, eventId!),
        ).rejects.toThrow(/PERMISSION_DENIED/)

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done')
    })
})
