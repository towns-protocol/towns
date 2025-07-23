import { SnapshotSchema } from '@towns-protocol/proto'
import { bin_toHexString } from '@towns-protocol/dlog'
import { create } from '@bufbuild/protobuf'
import { snapshotMigration0005 } from '../../migrations/snapshotMigration0005'
import { streamIdToBytes } from '../../id'
import { makeUniqueSpaceStreamId } from '../testUtils'

describe('snapshotMigration0005', () => {
    test('run migration with common session IDs and empty solicitations', () => {
        // Create a test session ID that will appear frequently
        const commonSessionIdBytes = new Uint8Array(
            'common-session-id-5'.split('').map((c) => c.charCodeAt(0)),
        )
        const commonSessionId = bin_toHexString(commonSessionIdBytes)
        const spaceId = makeUniqueSpaceStreamId()
        const spaceIdBytes = streamIdToBytes(spaceId)

        // Create a snapshot with multiple members having the same session ID
        const snap = create(SnapshotSchema, {
            content: {
                case: 'spaceContent',
                value: {
                    inception: {
                        streamId: spaceIdBytes,
                    },
                },
            },
            members: {
                joined: [
                    {
                        solicitations: [
                            { sessionIds: [commonSessionId, 'unique1_a'] },
                            { sessionIds: [commonSessionId] }, // Will become empty
                        ],
                        username: {
                            data: {
                                sessionId: commonSessionId,
                                algorithm: 'test-algo',
                            },
                        },
                        displayName: {
                            data: {
                                sessionIdBytes: commonSessionIdBytes,
                                algorithm: 'test-algo',
                            },
                        },
                    },
                    {
                        solicitations: [{ sessionIds: [commonSessionId, 'unique2'] }],
                        username: {
                            data: {
                                sessionIdBytes: commonSessionIdBytes,
                                algorithm: 'test-algo',
                            },
                        },
                    },
                    {
                        solicitations: [{ sessionIds: [commonSessionId, 'unique3'] }],
                    },
                    {
                        solicitations: [{ sessionIds: ['unique4'] }],
                    },
                ],
            },
        })

        const result = snapshotMigration0005(snap, true)

        for (const member of result.members!.joined) {
            for (const solicitation of member.solicitations) {
                expect(solicitation.sessionIds).not.toContain(commonSessionId)
            }
            // All solicitations should be non-empty
            for (const solicitation of member.solicitations) {
                expect(solicitation.sessionIds.length).toBeGreaterThan(0)
            }
            // Usernames and display names with common session IDs should be cleared
            if (member.username?.data) {
                expect(member.username.data.sessionId).not.toBe(commonSessionId)
                if (member.username.data.sessionIdBytes?.length) {
                    expect(bin_toHexString(member.username.data.sessionIdBytes)).not.toBe(
                        commonSessionId,
                    )
                }
            }
            if (member.displayName?.data) {
                expect(member.displayName.data.sessionId).not.toBe(commonSessionId)
                if (member.displayName.data.sessionIdBytes?.length) {
                    expect(bin_toHexString(member.displayName.data.sessionIdBytes)).not.toBe(
                        commonSessionId,
                    )
                }
            }
        }
    })

    test('run migration with empty members', () => {
        const snap = create(SnapshotSchema, {})
        const result = snapshotMigration0005(snap, true)
        expect(result).toEqual(snap)
    })

    test('run migration with no common session IDs', () => {
        const snap = create(SnapshotSchema, {
            members: {
                joined: [
                    {
                        solicitations: [{ sessionIds: ['unique1', 'unique2'] }],
                        username: {
                            data: {
                                sessionId: 'unique3',
                                algorithm: 'test-algo',
                            },
                        },
                    },
                    {
                        solicitations: [{ sessionIds: ['unique4', 'unique5'] }],
                    },
                ],
            },
        })

        const result = snapshotMigration0005(snap, true)
        // Verify the snapshot remains unchanged when no common session IDs are found
        expect(result).toEqual(snap)
    })
})
