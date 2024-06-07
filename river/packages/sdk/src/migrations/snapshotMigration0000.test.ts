/**
 * @group main
 */

import { Snapshot } from '@river-build/proto'
import { snapshotMigration0000 } from './snapshotMigration0000'

// a no-op migration test for the initial snapshot, use as a template for new migrations
describe('snapshotMigration0000', () => {
    test('run migration', () => {
        const snapshot = new Snapshot()
        const result = snapshotMigration0000(snapshot)
        expect(result).toBe(snapshot)
    })
})
