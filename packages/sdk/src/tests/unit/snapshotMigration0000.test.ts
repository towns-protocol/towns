import { SnapshotSchema } from '@towns-protocol/proto'
import { create } from '@bufbuild/protobuf'
import { snapshotMigration0000 } from '../../migrations/snapshotMigration0000'

// a no-op migration test for the initial snapshot, use as a template for new migrations
describe('snapshotMigration0000', () => {
    test('run migration', () => {
        const snapshot = create(SnapshotSchema, {})
        const result = snapshotMigration0000(snapshot)
        expect(result).toBe(snapshot)
    })
})
