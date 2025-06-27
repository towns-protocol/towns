/**
 * @group core
 */

import { TimelinesView } from '../../views/streams/timelines'
import {
    ChannelMessageEvent,
    MessageTips,
    ThreadStatsData,
    TimelineEvent,
} from '../../views/models/timelineTypes'
import { ConversationBuilder } from './helpers/ConversationBuilder'

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
    return Object.entries(threads).reduce(
        (acc, [threadParentId, thread]) => {
            acc[threadParentId] = thread.map((e) => describeEvent(e))
            return acc
        },
        {} as Record<string, string[]>,
    )
}

function describeTips(tipsMap?: Record<string, MessageTips>): Record<string, string[]> | undefined {
    if (!tipsMap) {
        return undefined
    }
    const returnValue: Record<string, string[]> = {}
    for (const [eventId, tips] of Object.entries(tipsMap)) {
        const described = tips.map(
            (t) =>
                `${t.eventId} amount: ${t.content.tip.event?.amount.toString() ?? '??'} from: ${
                    t.content.fromUserId
                } to: ${t.content.toUserId}`,
        )
        returnValue[eventId] = described
    }
    return returnValue
}

function execute(
    timelinesView: TimelinesView,
    userId: string,
    events: TimelineEvent[],
    expected: {
        timeline: string[]
        threads?: Record<string, string[]>
        threadStats?: Record<string, ThreadStatsData>
        tips?: Record<string, string[]>
    },
) {
    const setState = timelinesView.setState
    const channelId = 'channel1'
    //
    {
        // test appending events (normal flow when syncing channels)
        setState.appendEvents(events, userId, channelId)
        // get the timeline store interface
        const {
            timelines: timelinesAppended,
            threads: threadsAppended,
            threadsStats: threadStatsAppended,
            tips: tipsAppended,
        } = timelinesView.value
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
        // check tips
        if (expected.tips) {
            expect(describeTips(tipsAppended[channelId])).toEqual(expected.tips)
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
            tips: tipsPrepended,
        } = timelinesView.value
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
        // check tips
        if (expected.tips) {
            expect(describeTips(tipsPrepended[channelId])).toEqual(expected.tips)
        }
    }
}

describe('UseTimelinesView', () => {
    const timelinesView = new TimelinesView('', undefined)
    beforeAll(() => {
        const { timelines } = timelinesView.value
        const setState = timelinesView.setState
        const roomIds = Object.keys(timelines)
        setState.reset(roomIds)
    })
    afterEach(() => {
        const { timelines } = timelinesView.value
        const setState = timelinesView.setState
        const roomIds = Object.keys(timelines)
        setState.reset(roomIds)
    })
    test('test send', () => {
        // events
        const events = new ConversationBuilder()
            .sendMessage({ from: 'alice', body: 'hi bob!' })
            .getEvents()
        // results
        execute(timelinesView, 'alice', events, { timeline: ['event0 alice: hi bob!'] })
    })
    test('test send and edit', () => {
        // events (use a custom id for the fist message so we can edit it)
        const events = new ConversationBuilder()
            .sendMessage({ id: 'MSG_0', from: 'alice', body: 'hi bob!' })
            .editMessage({ edits: 'MSG_0', newBody: 'hi bob! (edited)' })
            .getEvents()
        // results
        execute(timelinesView, 'alice', events, { timeline: ['MSG_0 alice: hi bob! (edited)'] })
    })
    test('test send and edit with different sender', () => {
        // events (use a custom id for the fist message so we can edit it)
        const events = new ConversationBuilder()
            .sendMessage({ id: 'MSG_0', from: 'alice', body: 'hi bob!' })
            .editMessage({ edits: 'MSG_0', newBody: 'alice sucks! (edited)', senderId: 'bob' })
            .getEvents()
        // results
        execute(timelinesView, 'alice', events, { timeline: ['MSG_0 alice: hi bob!'] })
    })
    test('test send and multiple edits', () => {
        // events (use a custom id for the fist message so we can edit it)
        const events = new ConversationBuilder()
            .sendMessage({ id: 'MSG_0', from: 'alice', body: 'hi bob!' })
            .editMessage({ edits: 'MSG_0', newBody: 'hi bob! (edited)' })
            .editMessage({ edits: 'MSG_0', newBody: 'hi bob! (edited2)' })
            .getEvents()
        // results
        execute(timelinesView, 'alice', events, { timeline: ['MSG_0 alice: hi bob! (edited2)'] })
    })
    test('test send and multiple edits out of order', () => {
        // events (use a custom id for the fist message so we can edit it)
        const events = new ConversationBuilder()
            .sendMessage({ id: 'MSG_0', from: 'alice', body: 'hi bob!' })
            .editMessage({ edits: 'MSG_0', newBody: 'hi bob! (edited)' })
            .editMessage({ edits: 'MSG_0', newBody: 'hi bob! (edited2)' })
            .getEvents()
        // results
        const ex = events[events.length - 1]
        events[events.length - 1] = events[events.length - 2]
        events[events.length - 2] = ex
        execute(timelinesView, 'alice', events, { timeline: ['MSG_0 alice: hi bob! (edited2)'] })
    })
    test('test threads and thread stats', () => {
        // events
        const events = new ConversationBuilder()
            .sendMessage({ id: 'MSG_0', from: 'alice', body: 'hi bob!' })
            .sendMessage({ threadId: 'MSG_0', from: 'bob', body: 'hi alice!' })
            .sendMessage({ threadId: 'MSG_0', from: 'bob', body: 'Hows it going?' })
            .getEvents()
        // results
        execute(timelinesView, 'alice', events, {
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
                    replyEventIds: new Set(['event1', 'event2']),
                    userIds: new Set(['bob']),
                    latestTs: events[2].createdAtEpochMs,
                    parentId: events[0].eventId,
                    parentEvent: events[0],
                    parentMessageContent: events[0].content as ChannelMessageEvent,
                    isParticipating: true,
                },
            },
        })
    })
    test('test tip', () => {
        // ids must be hex
        const msgId_0 = '0x1234'
        const msgId_1 = '0x1235'
        const tipId_a = '0x1236'
        const tipId_b = '0x1237'
        const tipId_c = '0x1238'
        // events
        const events = new ConversationBuilder()
            .sendMessage({ id: msgId_0, from: 'alice', body: 'hi bob!' })
            .sendMessage({ id: msgId_1, from: 'bob', body: 'hi alice!' })
            .sendTip({ tip: 10, ref: msgId_1, id: tipId_a, from: 'bob', to: 'alice' })
            .sendTip({ tip: 10, ref: msgId_0, id: tipId_b, from: 'alice', to: 'bob' })
            .sendTip({ tip: 10, ref: msgId_0, id: tipId_c, from: 'alice', to: 'bob' })
            .getEvents()
        // results
        execute(timelinesView, 'alice', events, {
            timeline: [
                `${msgId_0} alice: hi bob!`,
                `${msgId_1} bob: hi alice!`,
                `${tipId_a} tip from: bob to: alice refEventId: ${msgId_1} amount: 10`,
                `${tipId_b} tip from: alice to: bob refEventId: ${msgId_0} amount: 10`,
                `${tipId_c} tip from: alice to: bob refEventId: ${msgId_0} amount: 10`,
            ],
            tips: {
                [msgId_1]: [`${tipId_a} amount: 10 from: bob to: alice`],
                [msgId_0]: [
                    `${tipId_b} amount: 10 from: alice to: bob`,
                    `${tipId_c} amount: 10 from: alice to: bob`,
                ],
            },
        })
    })
    test('test edit thread item', () => {
        // events
        const events = new ConversationBuilder()
            .sendMessage({ id: 'MSG_0', from: 'alice', body: 'hi bob!' })
            .sendMessage({ id: 'THREAD_0', threadId: 'MSG_0', from: 'bob', body: 'hi alice!' })
            .editMessage({ edits: 'THREAD_0', newBody: 'hi alice! (edited)' })
            .getEvents()
        // results
        execute(timelinesView, 'alice', events, {
            timeline: ['MSG_0 alice: hi bob!', 'THREAD_0 bob: hi alice! (edited)'],
            threads: {
                MSG_0: ['THREAD_0 bob: hi alice! (edited)'],
            },
            threadStats: {
                MSG_0: {
                    replyEventIds: new Set(['THREAD_0']),
                    userIds: new Set(['bob']),
                    latestTs: events[1].createdAtEpochMs,
                    parentId: events[0].eventId,
                    parentEvent: events[0],
                    parentMessageContent: events[0].content as ChannelMessageEvent,
                    isParticipating: true,
                },
            },
        })
    })
    test('test redact thread item', () => {
        // events
        const events = new ConversationBuilder()
            .sendMessage({ id: 'MSG_0', from: 'alice', body: 'hi bob!' })
            .sendMessage({ id: 'THREAD_0', threadId: 'MSG_0', from: 'bob', body: 'hi alice!' })
            .redactMessage({ redacts: 'THREAD_0' })
            .getEvents()
        // results
        execute(timelinesView, 'alice', events, {
            timeline: [
                'MSG_0 alice: hi bob!',
                'THREAD_0 ~Redacted~',
                'event2 Redacts THREAD_0 adminRedaction: false',
            ],
            threads: {
                MSG_0: ['THREAD_0 ~Redacted~'],
            },
            threadStats: {
                MSG_0: {
                    replyEventIds: new Set([]),
                    userIds: new Set([]),
                    latestTs: events[1].createdAtEpochMs,
                    parentId: events[0].eventId,
                    parentEvent: events[0],
                    parentMessageContent: events[0].content as ChannelMessageEvent,
                    isParticipating: false,
                },
            },
        })
    })
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
        execute(timelinesView, 'alice', events, {
            timeline: [
                'event0 alice: hi bob!',
                'MSG_1 bob: hi alice! (edited)',
                'MSG_2 ~Redacted~',
                'event4 alice: banannas? lol',
                'event5 Redacts MSG_2 adminRedaction: false',
            ],
        })
    })
    test('test send and redact', () => {
        // events (use a custom id for the fist message so we can edit it)
        const events = new ConversationBuilder()
            .sendMessage({ id: 'MSG_0', from: 'alice', body: 'hi bob' })
            .sendMessage({ id: 'MSG_1', from: 'alice', body: 'hi bob!' })
            .redactMessage({ redacts: 'MSG_0' })
            .getEvents()
        // results
        execute(timelinesView, 'alice', events, {
            timeline: [
                'MSG_0 ~Redacted~',
                'MSG_1 alice: hi bob!',
                'event2 Redacts MSG_0 adminRedaction: false',
            ],
        })
    })
    test('test send and redact with different sender, redaction should be ignored', () => {
        // events (use a custom id for the fist message so we can edit it)
        const events = new ConversationBuilder()
            .sendMessage({ id: 'MSG_0', from: 'alice', body: 'hi bob' })
            .sendMessage({ id: 'MSG_1', from: 'alice', body: 'hi bob!' })
            .redactMessage({ redacts: 'MSG_0', senderId: 'bob' })
            .getEvents()
        // results
        execute(timelinesView, 'alice', events, {
            timeline: [
                'MSG_0 alice: hi bob',
                'MSG_1 alice: hi bob!',
                'event2 Redacts MSG_0 adminRedaction: false', // the redaction action show up, but the message is not redacted
            ],
        })
    })
    test('test send and admin redact', () => {
        // events (use a custom id for the fist message so we can edit it)
        const events = new ConversationBuilder()
            .sendMessage({ id: 'MSG_0', from: 'alice', body: 'hi bob' })
            .sendMessage({ id: 'MSG_1', from: 'alice', body: 'hi bob!' })
            .redactMessage({ redacts: 'MSG_0', senderId: 'bob', isAdmin: true })
            .getEvents()
        // results
        execute(timelinesView, 'alice', events, {
            timeline: [
                'MSG_0 ~Redacted~',
                'MSG_1 alice: hi bob!',
                'event2 Redacts MSG_0 adminRedaction: true',
            ],
        })
    })
})
