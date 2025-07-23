import { describe, test, expect } from 'vitest'
import {
    applyExclusionFilterToMiniblocks,
    shouldExcludeEvent,
    extractEventTypeInfo,
    matchesEventFilter,
} from '../../streamUtils'
import { ParsedMiniblock, ParsedEvent, ExclusionFilter } from '../../types'

describe('streamUtils filtering functions', () => {
    describe('extractEventTypeInfo', () => {
        test('should extract member payload key solicitation correctly', () => {
            const event = {
                payload: {
                    case: 'memberPayload',
                    value: {
                        content: {
                            case: 'keySolicitation',
                            value: {},
                        },
                    },
                },
            } as any

            const result = extractEventTypeInfo(event)
            expect(result.payloadType).toBe('member_payload')
            expect(result.contentType).toBe('key_solicitation')
        })

        test('should extract member payload username correctly', () => {
            const event = {
                payload: {
                    case: 'memberPayload',
                    value: {
                        content: {
                            case: 'username',
                            value: {},
                        },
                    },
                },
            } as any

            const result = extractEventTypeInfo(event)
            expect(result.payloadType).toBe('member_payload')
            expect(result.contentType).toBe('username')
        })

        test('should extract channel payload message correctly', () => {
            const event = {
                payload: {
                    case: 'channelPayload',
                    value: {
                        content: {
                            case: 'message',
                            value: {},
                        },
                    },
                },
            } as any

            const result = extractEventTypeInfo(event)
            expect(result.payloadType).toBe('channel_payload')
            expect(result.contentType).toBe('message')
        })

        test('should extract space payload inception correctly', () => {
            const event = {
                payload: {
                    case: 'spacePayload',
                    value: {
                        content: {
                            case: 'inception',
                            value: {},
                        },
                    },
                },
            } as any

            const result = extractEventTypeInfo(event)
            expect(result.payloadType).toBe('space_payload')
            expect(result.contentType).toBe('inception')
        })

        test('should handle payload without content', () => {
            const event = {
                payload: {
                    case: 'memberPayload',
                    value: {
                        content: undefined,
                    },
                },
            } as any

            const result = extractEventTypeInfo(event)
            expect(result.payloadType).toBe('member_payload')
            expect(result.contentType).toBe('none')
        })

        test('should handle payload without case', () => {
            const event = {
                payload: {
                    case: undefined,
                    value: undefined,
                },
            } as any

            const result = extractEventTypeInfo(event)
            expect(result.payloadType).toBe('unknown')
            expect(result.contentType).toBe('unknown')
        })

        test('should handle undefined payload', () => {
            const event = {
                payload: undefined,
            } as any

            const result = extractEventTypeInfo(event)
            expect(result.payloadType).toBe('unknown')
            expect(result.contentType).toBe('unknown')
        })
    })

    describe('matchesEventFilter', () => {
        test('should match exact payload and content types', () => {
            const filter: ExclusionFilter[0] = {
                payload: 'memberPayload',
                content: 'keySolicitation',
            }

            expect(matchesEventFilter('member_payload', 'key_solicitation', filter)).toBe(true)
            expect(matchesEventFilter('member_payload', 'username', filter)).toBe(false)
            expect(matchesEventFilter('space_payload', 'key_solicitation', filter)).toBe(false)
        })

        test('should match wildcard content type', () => {
            const filter: ExclusionFilter[0] = {
                payload: 'memberPayload',
                content: '*',
            }

            expect(matchesEventFilter('member_payload', 'key_solicitation', filter)).toBe(true)
            expect(matchesEventFilter('member_payload', 'username', filter)).toBe(true)
            expect(matchesEventFilter('member_payload', 'any_content', filter)).toBe(true)
            expect(matchesEventFilter('space_payload', 'key_solicitation', filter)).toBe(false)
        })

        test('should match wildcard payload type', () => {
            const filter: ExclusionFilter[0] = {
                payload: '*',
                content: 'keySolicitation',
            }

            expect(matchesEventFilter('member_payload', 'key_solicitation', filter)).toBe(true)
            expect(matchesEventFilter('space_payload', 'key_solicitation', filter)).toBe(true)
            expect(matchesEventFilter('any_payload', 'key_solicitation', filter)).toBe(true)
            expect(matchesEventFilter('member_payload', 'username', filter)).toBe(false)
        })

        test('should match both wildcards', () => {
            const filter: ExclusionFilter[0] = {
                payload: '*',
                content: '*',
            }

            expect(matchesEventFilter('member_payload', 'key_solicitation', filter)).toBe(true)
            expect(matchesEventFilter('space_payload', 'inception', filter)).toBe(true)
            expect(matchesEventFilter('any_payload', 'any_content', filter)).toBe(true)
        })

        test('should not match when payload type differs', () => {
            const filter: ExclusionFilter[0] = {
                payload: 'memberPayload',
                content: 'keySolicitation',
            }

            expect(matchesEventFilter('space_payload', 'key_solicitation', filter)).toBe(false)
        })

        test('should not match when content type differs', () => {
            const filter: ExclusionFilter[0] = {
                payload: 'memberPayload',
                content: 'keySolicitation',
            }

            expect(matchesEventFilter('member_payload', 'username', filter)).toBe(false)
        })
    })

    describe('shouldExcludeEvent', () => {
        test('should exclude event that matches filter', () => {
            const event = createMockParsedEvent('memberPayload', 'keySolicitation')
            const exclusionFilter: ExclusionFilter = [
                { payload: 'memberPayload', content: 'keySolicitation' },
            ]

            expect(shouldExcludeEvent(event, exclusionFilter)).toBe(true)
        })

        test('should not exclude event that does not match filter', () => {
            const event = createMockParsedEvent('memberPayload', 'username')
            const exclusionFilter: ExclusionFilter = [
                { payload: 'memberPayload', content: 'keySolicitation' },
            ]

            expect(shouldExcludeEvent(event, exclusionFilter)).toBe(false)
        })

        test('should exclude event that matches wildcard filter', () => {
            const event = createMockParsedEvent('memberPayload', 'keySolicitation')
            const exclusionFilter: ExclusionFilter = [{ payload: 'memberPayload', content: '*' }]

            expect(shouldExcludeEvent(event, exclusionFilter)).toBe(true)
        })

        test('should exclude event that matches any filter in array', () => {
            const event = createMockParsedEvent('memberPayload', 'keySolicitation')
            const exclusionFilter: ExclusionFilter = [
                { payload: 'spacePayload', content: 'inception' },
                { payload: 'memberPayload', content: 'keySolicitation' },
                { payload: 'channelPayload', content: 'message' },
            ]

            expect(shouldExcludeEvent(event, exclusionFilter)).toBe(true)
        })

        test('should not exclude event when no filters match', () => {
            const event = createMockParsedEvent('memberPayload', 'username')
            const exclusionFilter: ExclusionFilter = [
                { payload: 'spacePayload', content: 'inception' },
                { payload: 'channelPayload', content: 'message' },
            ]

            expect(shouldExcludeEvent(event, exclusionFilter)).toBe(false)
        })

        test('should not exclude event when no filters provided', () => {
            const event = createMockParsedEvent('memberPayload', 'keySolicitation')
            const exclusionFilter: ExclusionFilter = []

            expect(shouldExcludeEvent(event, exclusionFilter)).toBe(false)
        })
    })

    describe('applyExclusionFilterToMiniblocks', () => {
        test('should return original miniblocks when no filter provided', () => {
            const miniblocks = createMockMiniblocks()
            const exclusionFilter: ExclusionFilter = []

            const result = applyExclusionFilterToMiniblocks(miniblocks, exclusionFilter)

            expect(result).toEqual(miniblocks)
            expect(result[0].partial).toBeUndefined()
        })

        test('should return original miniblocks when no events match filter', () => {
            const miniblocks = createMockMiniblocks()
            const exclusionFilter: ExclusionFilter = [
                { payload: 'spacePayload', content: 'inception' },
            ]

            const result = applyExclusionFilterToMiniblocks(miniblocks, exclusionFilter)

            expect(result).toEqual(miniblocks)
            expect(result[0].partial).toBeUndefined()
        })

        test('should filter out matching events and set partial flag', () => {
            const miniblocks = createMockMiniblocks()
            const exclusionFilter: ExclusionFilter = [
                { payload: 'memberPayload', content: 'keySolicitation' },
            ]

            const result = applyExclusionFilterToMiniblocks(miniblocks, exclusionFilter)

            expect(result).toHaveLength(1)
            expect(result[0].events).toHaveLength(1) // Only username event remains
            expect(result[0].partial).toBe(true)
            expect(result[0].events[0]?.event.payload.case).toBe('memberPayload')
            expect(result[0].events[0]?.event.payload.value?.content.case).toBe('username')
        })

        test('should filter out events matching wildcard filter', () => {
            const miniblocks = createMockMiniblocks()
            const exclusionFilter: ExclusionFilter = [{ payload: 'memberPayload', content: '*' }]

            const result = applyExclusionFilterToMiniblocks(miniblocks, exclusionFilter)

            expect(result).toHaveLength(1)
            expect(result[0].events).toHaveLength(0) // All member payload events filtered out
            expect(result[0].partial).toBe(true)
        })

        test('should filter out events matching multiple filters', () => {
            const miniblocks = createMockMiniblocks()
            const exclusionFilter: ExclusionFilter = [
                { payload: 'memberPayload', content: 'keySolicitation' },
                { payload: 'memberPayload', content: 'username' },
            ]

            const result = applyExclusionFilterToMiniblocks(miniblocks, exclusionFilter)

            expect(result).toHaveLength(1)
            expect(result[0].events).toHaveLength(0) // All member payload events filtered out
            expect(result[0].partial).toBe(true)
        })

        test('should preserve non-matching events', () => {
            const miniblocks = createMockMiniblocks()
            const exclusionFilter: ExclusionFilter = [
                { payload: 'memberPayload', content: 'keySolicitation' },
            ]

            const result = applyExclusionFilterToMiniblocks(miniblocks, exclusionFilter)

            expect(result[0].events).toHaveLength(1)
            expect(result[0].events[0]?.event.payload.case).toBe('memberPayload')
            expect(result[0].events[0]?.event.payload.value?.content.case).toBe('username')
        })

        test('should handle empty miniblocks array', () => {
            const miniblocks: ParsedMiniblock[] = []
            const exclusionFilter: ExclusionFilter = [
                { payload: 'memberPayload', content: 'keySolicitation' },
            ]

            const result = applyExclusionFilterToMiniblocks(miniblocks, exclusionFilter)

            expect(result).toEqual([])
        })

        test('should handle miniblock with no events', () => {
            const miniblocks: ParsedMiniblock[] = [
                {
                    hash: new Uint8Array(32),
                    header: {
                        miniblockNum: 1n,
                        prevMiniblockHash: new Uint8Array(32),
                        eventHashes: [],
                    } as any,
                    events: [],
                },
            ]
            const exclusionFilter: ExclusionFilter = [
                { payload: 'memberPayload', content: 'keySolicitation' },
            ]

            const result = applyExclusionFilterToMiniblocks(miniblocks, exclusionFilter)

            expect(result).toEqual(miniblocks)
            expect(result[0].partial).toBeUndefined()
        })
    })

    describe('integration tests', () => {
        test('should handle complex filtering scenario', () => {
            const miniblocks = createComplexMockMiniblocks()
            const exclusionFilter: ExclusionFilter = [
                { payload: 'memberPayload', content: 'keySolicitation' },
                { payload: 'memberPayload', content: 'keyFulfillment' },
                { payload: 'userPayload', content: 'blockchainTransaction' },
            ]

            const result = applyExclusionFilterToMiniblocks(miniblocks, exclusionFilter)

            expect(result).toHaveLength(2)

            // First miniblock should have partial flag and filtered events
            expect(result[0].partial).toBe(true)
            expect(result[0].events).toHaveLength(2) // username and channel message remain

            // Second miniblock should have partial flag and filtered events
            expect(result[1].partial).toBe(true)
            expect(result[1].events).toHaveLength(1) // Only space inception remains
        })

        test('should handle wildcard filtering in complex scenario', () => {
            const miniblocks = createComplexMockMiniblocks()
            const exclusionFilter: ExclusionFilter = [{ payload: 'memberPayload', content: '*' }]

            const result = applyExclusionFilterToMiniblocks(miniblocks, exclusionFilter)

            expect(result).toHaveLength(2)

            // All member payload events should be filtered out
            result.forEach((miniblock) => {
                miniblock.events.forEach((event) => {
                    expect(event.event.payload.case).not.toBe('memberPayload')
                })
            })
        })
    })
})

// Helper functions to create mock data
function createMockParsedEvent(payloadCase: string, contentCase: string): ParsedEvent {
    const event = {
        payload: {
            case: payloadCase,
            value: {
                content: {
                    case: contentCase,
                    value: {},
                },
            },
        },
    } as any

    return {
        event,
        hash: new Uint8Array(32),
        hashStr: 'test-hash',
        signature: new Uint8Array(64),
        creatorUserId: 'test-user',
        ephemeral: false,
    }
}

function createMockMiniblocks(): ParsedMiniblock[] {
    return [
        {
            hash: new Uint8Array(32),
            header: {
                miniblockNum: 1n,
                prevMiniblockHash: new Uint8Array(32),
                eventHashes: [new Uint8Array(32), new Uint8Array(32)],
            } as any,
            events: [
                createMockParsedEvent('memberPayload', 'keySolicitation'),
                createMockParsedEvent('memberPayload', 'username'),
            ],
        },
    ]
}

function createComplexMockMiniblocks(): ParsedMiniblock[] {
    return [
        {
            hash: new Uint8Array(32),
            header: {
                miniblockNum: 1n,
                prevMiniblockHash: new Uint8Array(32),
                eventHashes: [new Uint8Array(32), new Uint8Array(32), new Uint8Array(32)],
            } as any,
            events: [
                createMockParsedEvent('memberPayload', 'keySolicitation'),
                createMockParsedEvent('memberPayload', 'username'),
                createMockParsedEvent('channelPayload', 'message'),
            ],
        },
        {
            hash: new Uint8Array(32),
            header: {
                miniblockNum: 2n,
                prevMiniblockHash: new Uint8Array(32),
                eventHashes: [new Uint8Array(32), new Uint8Array(32)],
            } as any,
            events: [
                createMockParsedEvent('userPayload', 'blockchainTransaction'),
                createMockParsedEvent('spacePayload', 'inception'),
            ],
        },
    ]
}
