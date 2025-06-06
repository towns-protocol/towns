import { SnapshotSchema } from '@towns-protocol/proto'
import { snapshotMigration0002 } from '../../migrations/snapshotMigration0002'
import { makeUniqueSpaceStreamId } from '../testUtils'
import { makeDefaultChannelStreamId, makeUniqueChannelStreamId, streamIdAsBytes } from '../../id'
import { check } from '@towns-protocol/dlog'
import { create } from '@bufbuild/protobuf'

describe('snapshotMigration0002', () => {
    test('run migration', () => {
        const spaceId = makeUniqueSpaceStreamId()
        const defaultChannelId = makeDefaultChannelStreamId(spaceId)
        const channelId = makeUniqueChannelStreamId(spaceId)

        const snap = create(SnapshotSchema, {
            content: {
                case: 'spaceContent',
                value: {
                    channels: [
                        { channelId: streamIdAsBytes(defaultChannelId) },
                        { channelId: streamIdAsBytes(channelId) },
                    ],
                },
            },
        })
        const result = snapshotMigration0002(snap)
        check(result.content?.case === 'spaceContent')
        expect(result.content?.value.channels[0].settings!.autojoin).toBe(true)
        expect(result.content?.value.channels[0].settings!.hideUserJoinLeaveEvents).toBe(false)

        expect(result.content?.value.channels[1].settings!.autojoin).toBe(false)
        expect(result.content?.value.channels[1].settings!.hideUserJoinLeaveEvents).toBe(false)
    })
})
