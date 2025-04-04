import { SnapshotSchema } from '@towns-protocol/proto'
import { snapshotMigration0001 } from '../../migrations/snapshotMigration0001'
import { ethers } from 'ethers'
import { makeUniqueSpaceStreamId } from '../testUtils'
import { addressFromUserId, makeUniqueChannelStreamId, streamIdAsBytes } from '../../id'
import { check } from '@towns-protocol/dlog'
import { create } from '@bufbuild/protobuf'

// a no-op migration test for the initial snapshot, use as a template for new migrations
describe('snapshotMigration0001', () => {
    test('run migration', () => {
        const wallet = ethers.Wallet.createRandom()
        const userAddress = addressFromUserId(wallet.address)
        const spaceIdStr = makeUniqueSpaceStreamId()
        const spaceId = streamIdAsBytes(spaceIdStr)
        const channelIdStr = makeUniqueChannelStreamId(spaceIdStr)
        const channelId = streamIdAsBytes(channelIdStr)

        // members
        const badMemberSnap = create(SnapshotSchema, {
            members: {
                joined: [{ userAddress: userAddress }, { userAddress: userAddress }],
            },
        })
        const result = snapshotMigration0001(badMemberSnap)
        expect(result.members?.joined.length).toBe(1)

        // space channel payloads
        const badSpaceSnap = create(SnapshotSchema, {
            content: {
                case: 'spaceContent',
                value: {
                    channels: [{ channelId: channelId }, { channelId: channelId }],
                },
            },
        })
        const result2 = snapshotMigration0001(badSpaceSnap)
        check(result2.content.case === 'spaceContent')
        expect(result2.content?.value.channels.length).toBe(1)

        // user payload
        const badUserPayload = create(SnapshotSchema, {
            content: {
                case: 'userContent',
                value: {
                    memberships: [{ streamId: spaceId }, { streamId: spaceId }],
                },
            },
        })
        const result3 = snapshotMigration0001(badUserPayload)
        check(result3.content.case === 'userContent')
        expect(result3.content?.value.memberships.length).toBe(1)

        // user settings
        const badUserSettings = create(SnapshotSchema, {
            content: {
                case: 'userSettingsContent',
                value: {
                    fullyReadMarkers: [{ streamId: spaceId }, { streamId: spaceId }],
                },
            },
        })
        const result4 = snapshotMigration0001(badUserSettings)
        check(result4.content.case === 'userSettingsContent')
        expect(result4.content?.value.fullyReadMarkers.length).toBe(1)
    })
})
