import { SnapshotSchema } from '@towns-protocol/proto'
import { check } from '@towns-protocol/utils'
import { create } from '@bufbuild/protobuf'
import { snapshotMigration0003 } from '../../migrations/snapshotMigration0003'

describe('snapshotMigration0003', () => {
    test('run migration', () => {
        const snap = create(SnapshotSchema, {
            content: {
                case: 'userContent',
                value: {
                    tipsSent: {
                        ETH: 1000n,
                    },
                    tipsReceived: {
                        ETH: 1000n,
                    },
                },
            },
        })
        const result = snapshotMigration0003(snap)
        check(result.content?.case === 'userContent')
        expect(result.content.value.tipsSent).toEqual({})
        expect(result.content.value.tipsReceived).toEqual({})
        expect(result.content.value.tipsSentCount).toEqual({})
        expect(result.content.value.tipsReceivedCount).toEqual({})
    })
})
