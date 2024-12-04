/**
 * @group with-entitlements
 */

import {
    setupWalletsAndContexts,
    createSpaceAndDefaultChannel,
    everyoneMembershipStruct,
    createChannel,
    waitFor,
    expectUserCanJoin,
    createRole,
} from '../testUtils'
import { check } from '@river-build/dlog'
import { Permission, NoopRuleData } from '@river-build/web3'

describe('channelSpaceSettingsTests', () => {
    test('channel creation with default settings', async () => {
        const { bob, bobProvider, bobSpaceDapp } = await setupWalletsAndContexts()
        const everyoneMembership = await everyoneMembershipStruct(bobSpaceDapp, bob)

        // Track autojoin state of channels via emitted client events
        const updatedChannelAutojoinState = new Map<string, boolean>()
        bob.on('spaceChannelAutojoinUpdated', (_spaceId, channelId, autojoin) => {
            updatedChannelAutojoinState.set(channelId, autojoin)
        })

        // The default channel is created without channel settings here. It should
        // be autojoin=true and hideUserJoinLeaveEvents=false.
        const { spaceId, defaultChannelId } = await createSpaceAndDefaultChannel(
            bob,
            bobSpaceDapp,
            bobProvider.wallet,
            "bob's town",
            everyoneMembership,
        )

        // Create another channel. This channel should be autojoin=false, hideUserJoinLeaveEvents=false.
        // Create channel on contract.
        const { channelId: channel1Id, error } = await createChannel(
            bobSpaceDapp,
            bobProvider,
            spaceId,
            'channel1',
            [1], // member role created on town creation
            bobProvider.wallet,
        )
        expect(error).toBeUndefined()

        // Create channel stream
        const { streamId: channelStream1Id } = await bob.createChannel(
            spaceId,
            'channel1',
            'channel1 topic',
            channel1Id!,
        )
        expect(channelStream1Id).toEqual(channel1Id)

        const spaceStream = bob.streams.get(spaceId)
        expect(spaceStream).toBeDefined()
        const spaceStreamView = spaceStream!.view.spaceContent
        expect(spaceStreamView).toBeDefined()

        await waitFor(() => {
            const channelMetadata = spaceStreamView.spaceChannelsMetadata
            check(channelMetadata.size === 2)
            check(channelMetadata.get(defaultChannelId)?.isAutojoin === true)
            check(channelMetadata.get(defaultChannelId)?.hideUserJoinLeaveEvents === false)
            check(channelMetadata.get(channel1Id!)?.isAutojoin === false)
            check(channelMetadata.get(channel1Id!)?.hideUserJoinLeaveEvents === false)
        })
    })

    test('create announcement channel (autojoin, hide user join/leave events)', async () => {
        const { bob, bobProvider, bobSpaceDapp } = await setupWalletsAndContexts()
        const everyoneMembership = await everyoneMembershipStruct(bobSpaceDapp, bob)

        const { spaceId } = await createSpaceAndDefaultChannel(
            bob,
            bobSpaceDapp,
            bobProvider.wallet,
            "bob's town",
            everyoneMembership,
        )

        const { channelId: announcementChannelId, error } = await createChannel(
            bobSpaceDapp,
            bobProvider,
            spaceId,
            'channel2',
            [1], // member role created on town creation
            bobProvider.wallet,
        )
        expect(error).toBeUndefined()
        expect(announcementChannelId).toBeDefined()

        const { streamId: announcementStreamId } = await bob.createChannel(
            spaceId,
            'channel2',
            'channel2 topic',
            announcementChannelId!,
            undefined,
            {
                autojoin: true,
                hideUserJoinLeaveEvents: true,
            },
        )

        const spaceStream = bob.streams.get(spaceId)
        expect(spaceStream).toBeDefined()
        const spaceStreamView = spaceStream!.view.spaceContent
        expect(spaceStreamView).toBeDefined()

        await waitFor(() => {
            const channelMetadata = spaceStreamView.spaceChannelsMetadata
            check(channelMetadata.size === 2)
            check(channelMetadata.get(announcementStreamId)?.isAutojoin === true)
            check(channelMetadata.get(announcementStreamId)?.hideUserJoinLeaveEvents === true)
        })
    })

    test('set autojoin for channel', async () => {
        const { bob, bobProvider, bobSpaceDapp } = await setupWalletsAndContexts()
        const everyoneMembership = await everyoneMembershipStruct(bobSpaceDapp, bob)

        // Track autojoin state of channels via emitted client events
        const updatedChannelAutojoinState = new Map<string, boolean>()
        bob.on('spaceChannelAutojoinUpdated', (_spaceId, channelId, autojoin) => {
            updatedChannelAutojoinState.set(channelId, autojoin)
        })

        const { spaceId, defaultChannelId } = await createSpaceAndDefaultChannel(
            bob,
            bobSpaceDapp,
            bobProvider.wallet,
            "bob's town",
            everyoneMembership,
        )

        // Create channel on contract
        const { channelId: channel1Id, error } = await createChannel(
            bobSpaceDapp,
            bobProvider,
            spaceId,
            'channel1',
            [1], // member role created on town creation
            bobProvider.wallet,
        )
        expect(error).toBeUndefined()

        // Create channel stream
        const { streamId: channelStream1Id } = await bob.createChannel(
            spaceId,
            'channel1',
            'channel1 topic',
            channel1Id!,
        )
        expect(channelStream1Id).toEqual(channel1Id)

        const spaceStream = bob.streams.get(spaceId)
        expect(spaceStream).toBeDefined()
        const spaceStreamView = spaceStream!.view.spaceContent
        expect(spaceStreamView).toBeDefined()

        // Default channel only should be autojoin by default
        await waitFor(() => {
            const channelMetadata = spaceStreamView.spaceChannelsMetadata
            check(channelMetadata.size === 2)
            check(channelMetadata.get(defaultChannelId)?.isAutojoin === true)
            check(channelMetadata.get(channel1Id!)?.isAutojoin === false)
        })

        // Set channel1 to autojoin=true
        const { eventId, error: error3 } = await bob.updateChannelAutojoin(
            spaceId,
            channel1Id!,
            true,
        )
        expect(error3).toBeUndefined()
        expect(eventId).toBeDefined()

        // Validate autojoin event was emitted for channel1
        await waitFor(() => {
            expect(updatedChannelAutojoinState.size).toBe(1)
            expect(updatedChannelAutojoinState.get(channel1Id!)).toBe(true)
        })

        // Expect autojoin change to sync to space stream view
        await waitFor(() => {
            const channelMetadata = spaceStreamView.spaceChannelsMetadata
            check(channelMetadata.get(channel1Id!)?.isAutojoin === true)
        })
    })

    test('unpermitted user cannot update channel autojoin', async () => {
        const {
            bob,
            bobProvider,
            bobSpaceDapp,
            alice,
            aliceSpaceDapp,
            aliceProvider,
            carol,
            carolsWallet,
            carolProvider,
            carolSpaceDapp,
        } = await setupWalletsAndContexts()
        const everyoneMembership = await everyoneMembershipStruct(bobSpaceDapp, bob)

        const { spaceId, defaultChannelId } = await createSpaceAndDefaultChannel(
            bob,
            bobSpaceDapp,
            bobProvider.wallet,
            "bob's town",
            everyoneMembership,
        )

        // Validate current autojoin state for default channel is true
        const spaceStream = bob.streams.get(spaceId)
        expect(spaceStream).toBeDefined()
        const spaceStreamView = spaceStream!.view.spaceContent
        expect(spaceStreamView).toBeDefined()
        await waitFor(() => {
            const channelMetadata = spaceStreamView.spaceChannelsMetadata
            check(channelMetadata.size === 1)
            check(channelMetadata.get(defaultChannelId)?.isAutojoin === true)
        })

        // Unpermitted user alice should not be able to update autojoin.
        // First, add alice to the space and channel.
        await expectUserCanJoin(
            spaceId,
            defaultChannelId,
            'alice',
            alice,
            aliceSpaceDapp,
            aliceProvider.wallet.address,
            aliceProvider.wallet,
        )

        // Alice's update should fail
        await expect(alice.updateChannelAutojoin(spaceId, defaultChannelId, false)).rejects.toThrow(
            /7:PERMISSION_DENIED/,
        )

        // Add Carol to a role that gives her AddRemoveChannels permission so she can update autojoin
        const { error: roleError } = await createRole(
            bobSpaceDapp,
            bobProvider,
            spaceId,
            'gated role',
            [Permission.AddRemoveChannels],
            [carolsWallet.address],
            NoopRuleData,
            bobProvider.wallet,
        )
        expect(roleError).toBeUndefined()

        // Add Carol to the space and the channel
        await expectUserCanJoin(
            spaceId,
            defaultChannelId,
            'carol',
            carol,
            carolSpaceDapp,
            carolProvider.wallet.address,
            carolProvider.wallet,
        )

        // Carol's update should succeed
        await expect(carol.updateChannelAutojoin(spaceId, defaultChannelId, false)).toResolve()

        // Validate autojoin event was applied on client
        await waitFor(() => {
            const channelMetadata = spaceStreamView.spaceChannelsMetadata
            check(channelMetadata.size === 1)
            check(channelMetadata.get(defaultChannelId)?.isAutojoin === false)
        })
    })

    test('set hideUserJoinLeaveEvents on channels', async () => {
        const { bob, bobProvider, bobSpaceDapp } = await setupWalletsAndContexts()
        const everyoneMembership = await everyoneMembershipStruct(bobSpaceDapp, bob)

        // Track hideJoinLeaveEvent state of channels via emitted client events
        const updatedChannelHideJoinLeaveEventsState = new Map<string, boolean>()
        bob.on(
            'spaceChannelHideUserJoinLeaveEventsUpdated',
            (_spaceId, channelId, hideJoinLeaveEvents) => {
                updatedChannelHideJoinLeaveEventsState.set(channelId, hideJoinLeaveEvents)
            },
        )

        const { spaceId, defaultChannelId } = await createSpaceAndDefaultChannel(
            bob,
            bobSpaceDapp,
            bobProvider.wallet,
            "bob's town",
            everyoneMembership,
        )

        const spaceStream = bob.streams.get(spaceId)
        expect(spaceStream).toBeDefined()
        const spaceStreamView = spaceStream!.view.spaceContent
        expect(spaceStreamView).toBeDefined()

        // All channels show join/leave events by default
        await waitFor(() => {
            const channelMetadata = spaceStreamView.spaceChannelsMetadata
            check(channelMetadata.size === 1)
            check(channelMetadata.get(defaultChannelId)?.hideUserJoinLeaveEvents === false)
        })

        // Set channel1 to hideUserJoinLeaveEvents=true
        const { eventId, error: error2 } = await bob.updateChannelHideUserJoinLeaveEvents(
            spaceId,
            defaultChannelId,
            true,
        )
        expect(error2).toBeUndefined()
        expect(eventId).toBeDefined()

        // Validate updateHideUserJoinLeaveEvent event was emitted for channel1
        await waitFor(() => {
            expect(updatedChannelHideJoinLeaveEventsState.size).toBe(1)
            expect(updatedChannelHideJoinLeaveEventsState.get(defaultChannelId)).toBe(true)
        })

        // Expect hideUserJoinLeaveEvents change to sync to space stream view
        await waitFor(() => {
            const channelMetadata = spaceStreamView.spaceChannelsMetadata
            check(channelMetadata.get(defaultChannelId)?.hideUserJoinLeaveEvents === true)
        })
    })

    test('unpermitted user cannot update channel hideUserJoinLeaveEvents', async () => {
        const {
            bob,
            bobProvider,
            bobSpaceDapp,
            alice,
            aliceSpaceDapp,
            aliceProvider,
            carol,
            carolsWallet,
            carolSpaceDapp,
            carolProvider,
        } = await setupWalletsAndContexts()
        const everyoneMembership = await everyoneMembershipStruct(bobSpaceDapp, bob)

        const { spaceId, defaultChannelId } = await createSpaceAndDefaultChannel(
            bob,
            bobSpaceDapp,
            bobProvider.wallet,
            "bob's town",
            everyoneMembership,
        )

        // Validate local synced client state for channel setting is false
        const spaceStream = bob.streams.get(spaceId)
        expect(spaceStream).toBeDefined()
        const spaceStreamView = spaceStream!.view.spaceContent
        expect(spaceStreamView).toBeDefined()
        await waitFor(() => {
            const channelMetadata = spaceStreamView.spaceChannelsMetadata
            check(channelMetadata.size === 1)
            check(channelMetadata.get(defaultChannelId)?.hideUserJoinLeaveEvents === false)
        })

        // Unpermitted user alice should not be able to update hideUserJoinLeaveEvents.
        // First, add alice to the space and channel.
        await expectUserCanJoin(
            spaceId,
            defaultChannelId,
            'alice',
            alice,
            aliceSpaceDapp,
            aliceProvider.wallet.address,
            aliceProvider.wallet,
        )

        await expect(
            alice.updateChannelHideUserJoinLeaveEvents(spaceId, defaultChannelId, true),
        ).rejects.toThrow(/7:PERMISSION_DENIED/)

        // Add Carol to a role that gives her AddRemoveChannels permission so she can update
        // hideUserJoinLeaveEvents
        const { error: roleError } = await createRole(
            bobSpaceDapp,
            bobProvider,
            spaceId,
            'gated role',
            [Permission.AddRemoveChannels],
            [carolsWallet.address],
            NoopRuleData,
            bobProvider.wallet,
        )
        expect(roleError).toBeUndefined()

        // Add Carol to the space and channel.
        await expectUserCanJoin(
            spaceId,
            defaultChannelId,
            'carol',
            carol,
            carolSpaceDapp,
            carolProvider.wallet.address,
            carolProvider.wallet,
        )

        // Carol's update should succeed
        await expect(
            carol.updateChannelHideUserJoinLeaveEvents(spaceId, defaultChannelId, true),
        ).toResolve()

        // Validate updateHideUserJoinLeaveEvents event was applied on client
        await waitFor(() => {
            const channelMetadata = spaceStreamView.spaceChannelsMetadata
            check(channelMetadata.size === 1)
            check(channelMetadata.get(defaultChannelId)?.hideUserJoinLeaveEvents === true)
        })
    })
})
