/**
 * @group casablanca
 */

import { useTimelineStore } from '../../src/store/use-timeline-store'
import { RoomMessageEvent, ThreadStats, TimelineEvent } from '../../src/types/timeline-types'
import { ConversationBuilder } from './helpers/ConversationBuilder'

export {}

function describeEvent(event: TimelineEvent) {
    return `${event.eventId} ${event.fallbackContent}`
}

function describeEvents(events: TimelineEvent[]) {
    return events.map((e) => describeEvent(e))
}

function describeThreads(threads?: Record<string, TimelineEvent[]>) {
    if (!threads) {
        return undefined
    }
    return Object.entries(threads).reduce((acc, [threadParentId, thread]) => {
        acc[threadParentId] = thread.map((e) => describeEvent(e))
        return acc
    }, {} as Record<string, string[]>)
}

function execute(
    userId: string,
    events: TimelineEvent[],
    expected: {
        timeline: string[]
        threads?: Record<string, string[]>
        threadStats?: Record<string, ThreadStats>
    },
) {
    const { setState } = useTimelineStore.getState()
    const channelId = 'channel1'
    //
    {
        // test appending events (normal flow when syncing channels)
        setState.processEvents(events, userId, channelId)
        // get the timeline store interface
        const {
            timelines: timelinesAppended,
            threads: threadsAppended,
            threadsStats: threadStatsAppended,
        } = useTimelineStore.getState()
        // assert the timeline events are in the correct order
        expect(describeEvents(timelinesAppended[channelId])).toEqual(expected.timeline)
        // check threads
        if (expected.threads) {
            expect(describeThreads(threadsAppended[channelId])).toEqual(expected.threads)
        }
        // thread stats
        if (expected.threadStats) {
            expect(threadStatsAppended[channelId]).toEqual(expected.threadStats)
        }
    }
    // clear the timeline
    setState.reset([channelId])
    //
    {
        // test prepending events (normal flow when paginating)
        setState.prependEvents(events, userId, channelId)
        // get the timeline store interface
        const {
            timelines: timelinesPrepended,
            threads: threadsPrepended,
            threadsStats: threadStatsPrepended,
        } = useTimelineStore.getState()
        // assert the timeline events are in the correct order
        expect(describeEvents(timelinesPrepended[channelId])).toEqual(expected.timeline)
        // check threads
        if (expected.threads) {
            expect(describeThreads(threadsPrepended[channelId])).toEqual(expected.threads)
        }
        // thread stats
        if (expected.threadStats) {
            expect(threadStatsPrepended[channelId]).toEqual(expected.threadStats)
        }
    }
}

describe('UseTimelineStore', () => {
    beforeAll(() => {
        const { timelines, setState } = useTimelineStore.getState()
        const roomIds = Object.keys(timelines)
        setState.reset(roomIds)
    }),
        afterEach(() => {
            const { timelines, setState } = useTimelineStore.getState()
            const roomIds = Object.keys(timelines)
            setState.reset(roomIds)
        }),
        test('test send', () => {
            // events
            const events = new ConversationBuilder()
                .sendMessage({ from: 'alice', body: 'hi bob!' })
                .getEvents()
            // results
            execute('alice', events, { timeline: ['event0 alice: hi bob!'] })
        }),
        test('test send and edit', () => {
            // events (use a custom id for the fist message so we can edit it)
            const events = new ConversationBuilder()
                .sendMessage({ id: 'MSG_0', from: 'alice', body: 'hi bob!' })
                .editMessage({ edits: 'MSG_0', newBody: 'hi bob! (edited)' })
                .getEvents()
            // results
            execute('alice', events, { timeline: ['MSG_0 alice: hi bob! (edited)'] })
        }),
        test('test send and multiple edits', () => {
            // events (use a custom id for the fist message so we can edit it)
            const events = new ConversationBuilder()
                .sendMessage({ id: 'MSG_0', from: 'alice', body: 'hi bob!' })
                .editMessage({ edits: 'MSG_0', newBody: 'hi bob! (edited)' })
                .editMessage({ edits: 'MSG_0', newBody: 'hi bob! (edited2)' })
                .getEvents()
            // results
            execute('alice', events, { timeline: ['MSG_0 alice: hi bob! (edited2)'] })
        }),
        test('test threads and thread stats', () => {
            // events
            const events = new ConversationBuilder()
                .sendMessage({ id: 'MSG_0', from: 'alice', body: 'hi bob!' })
                .sendMessage({ threadId: 'MSG_0', from: 'bob', body: 'hi alice!' })
                .sendMessage({ threadId: 'MSG_0', from: 'bob', body: 'Hows it going?' })
                .getEvents()
            // results
            execute('alice', events, {
                timeline: [
                    'MSG_0 alice: hi bob!',
                    'event1 bob: hi alice!',
                    'event2 bob: Hows it going?',
                ],
                threads: {
                    MSG_0: ['event1 bob: hi alice!', 'event2 bob: Hows it going?'],
                },
                threadStats: {
                    MSG_0: {
                        replyCount: 2,
                        userIds: new Set(['bob']),
                        latestTs: events[2].createdAtEpocMs,
                        parentId: events[0].eventId,
                        parentEvent: events[0],
                        parentMessageContent: events[0].content as RoomMessageEvent,
                        isParticipating: true,
                    },
                },
            })
        }),
        test('test edit thread item', () => {
            // events
            const events = new ConversationBuilder()
                .sendMessage({ id: 'MSG_0', from: 'alice', body: 'hi bob!' })
                .sendMessage({ id: 'THREAD_0', threadId: 'MSG_0', from: 'bob', body: 'hi alice!' })
                .editMessage({ edits: 'THREAD_0', newBody: 'hi alice! (edited)' })
                .getEvents()
            // results
            execute('alice', events, {
                timeline: ['MSG_0 alice: hi bob!', 'THREAD_0 bob: hi alice! (edited)'],
                threads: {
                    MSG_0: ['THREAD_0 bob: hi alice! (edited)'],
                },
                threadStats: {
                    MSG_0: {
                        replyCount: 1,
                        userIds: new Set(['bob']),
                        latestTs: events[1].createdAtEpocMs,
                        parentId: events[0].eventId,
                        parentEvent: events[0],
                        parentMessageContent: events[0].content as RoomMessageEvent,
                        isParticipating: true,
                    },
                },
            })
        }),
        test('test redact thread item', () => {
            // events
            const events = new ConversationBuilder()
                .sendMessage({ id: 'MSG_0', from: 'alice', body: 'hi bob!' })
                .sendMessage({ id: 'THREAD_0', threadId: 'MSG_0', from: 'bob', body: 'hi alice!' })
                .redactMessage({ redacts: 'THREAD_0' })
                .getEvents()
            // results
            execute('alice', events, {
                timeline: [
                    'MSG_0 alice: hi bob!',
                    'THREAD_0 ~Redacted~',
                    'event2 Redacts THREAD_0',
                ],
                threads: {
                    MSG_0: ['THREAD_0 ~Redacted~'],
                },
                threadStats: {
                    MSG_0: {
                        replyCount: 0,
                        userIds: new Set([]),
                        latestTs: events[1].createdAtEpocMs,
                        parentId: events[0].eventId,
                        parentEvent: events[0],
                        parentMessageContent: events[0].content as RoomMessageEvent,
                        isParticipating: false,
                    },
                },
            })
        }),
        test('test send, edit and redact', () => {
            // events
            const events = new ConversationBuilder()
                .sendMessage({ from: 'alice', body: 'hi bob!' })
                .sendMessage({
                    id: 'MSG_1',
                    from: 'bob',
                    body: 'hi alice!',
                })
                .sendMessage({
                    id: 'MSG_2',
                    from: 'bob',
                    body: 'this is banannas',
                })
                .editMessage({
                    edits: 'MSG_1',
                    newBody: 'hi alice! (edited)',
                })
                .sendMessage({ from: 'alice', body: 'banannas? lol' })
                .redactMessage({ redacts: 'MSG_2' })
                .getEvents()
            // results
            execute('alice', events, {
                timeline: [
                    'event0 alice: hi bob!',
                    'MSG_1 bob: hi alice! (edited)',
                    'MSG_2 ~Redacted~',
                    'event4 alice: banannas? lol',
                    'event5 Redacts MSG_2',
                ],
            })
        })
})
