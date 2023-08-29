/**
 * @group casablanca
 */

import { useTimelineStore } from '../../src/store/use-timeline-store'
import { TimelineEvent } from '../../src/types/timeline-types'
import { ConversationBuilder } from './helpers/ConversationBuilder'

export {}

function describeEvent(event: TimelineEvent) {
    return `${event.eventId} ${event.fallbackContent}`
}

function execute(events: TimelineEvent[], expected: string[]) {
    const channelId = 'channel1'
    // get the timeline store interface
    const { setState } = useTimelineStore.getState()
    // append the events one by one
    setState.processEvents(events, 'alice', channelId)
    // get the timeline store interface
    const { timelines: timelinesAppended } = useTimelineStore.getState()
    // assert the timeline events are in the correct order
    expect(timelinesAppended[channelId].map((e) => describeEvent(e))).toEqual(expected)
    // clear the timeline
    setState.reset([channelId])
    // test prepend
    setState.prependEvents(events, 'alice', channelId)
    // todo enable prepended tests // https://linear.app/hnt-labs/issue/HNT-2219/handle-replacements-and-redactions-in-a-paginated-world
    //// get the timeline store interface
    // const { timelines: timelinesPrepended } = useTimelineStore.getState()
    //// assert the timeline events are in the correct order
    // expect(timelinesPrepended[channelId].map((e) => describeEvent(e))).toEqual(expected)
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
            execute(events, ['event0 alice: hi bob!'])
        }),
        test('test send and edit', () => {
            // events (use a custom id for the fist message so we can edit it)
            const events = new ConversationBuilder()
                .sendMessage({ id: 'MSG_0', from: 'alice', body: 'hi bob!' })
                .editMessage({ edits: 'MSG_0', newBody: 'hi bob! (edited)' })
                .getEvents()
            // results
            execute(events, ['MSG_0 alice: hi bob! (edited)'])
        }),
        test('test send and multiple edits', () => {
            // events (use a custom id for the fist message so we can edit it)
            const events = new ConversationBuilder()
                .sendMessage({ id: 'MSG_0', from: 'alice', body: 'hi bob!' })
                .editMessage({ edits: 'MSG_0', newBody: 'hi bob! (edited)' })
                .editMessage({ edits: 'MSG_0', newBody: 'hi bob! (edited2)' })
                .getEvents()
            // results
            execute(events, ['MSG_0 alice: hi bob! (edited2)'])
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
            execute(events, [
                'event0 alice: hi bob!',
                'MSG_1 bob: hi alice! (edited)',
                'event4 alice: banannas? lol',
                'event5 Redacts MSG_2',
            ])
        })
})
