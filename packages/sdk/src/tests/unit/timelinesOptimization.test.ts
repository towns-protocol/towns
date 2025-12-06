/**
 * @group core
 */

import { TimelinesView } from '../../views/streams/timelines'
import { TimelineEvent } from '../../views/models/timelineTypes'
import { ConversationBuilder } from './helpers/ConversationBuilder'

describe('TimelinesOptimization', () => {
    const timelinesView = new TimelinesView('', undefined)

    beforeEach(() => {
        const { timelines } = timelinesView.value
        const setState = timelinesView.setState
        const roomIds = Object.keys(timelines)
        setState.reset(roomIds)
    })

    describe('eventIndex', () => {
        test('eventIndex is populated after appending events', () => {
            const events = new ConversationBuilder()
                .sendMessage({ id: 'msg1', from: 'alice', body: 'hello' })
                .sendMessage({ id: 'msg2', from: 'bob', body: 'world' })
                .sendMessage({ id: 'msg3', from: 'alice', body: '!' })
                .getEvents()

            timelinesView.setState.appendEvents(events, 'alice', 'channel1')

            const { eventIndex, timelines } = timelinesView.value
            const index = eventIndex['channel1']

            expect(index).toBeDefined()
            expect(index.size).toBe(3)
            expect(index.get('msg1')).toBe(0)
            expect(index.get('msg2')).toBe(1)
            expect(index.get('msg3')).toBe(2)

            // Verify the index matches the actual positions
            expect(timelines['channel1'][0].eventId).toBe('msg1')
            expect(timelines['channel1'][1].eventId).toBe('msg2')
            expect(timelines['channel1'][2].eventId).toBe('msg3')
        })

        test('eventIndex is updated after prepending events', () => {
            // First append some events
            const events1 = new ConversationBuilder()
                .sendMessage({ id: 'msg2', from: 'alice', body: 'second' })
                .sendMessage({ id: 'msg3', from: 'bob', body: 'third' })
                .getEvents()
            timelinesView.setState.appendEvents(events1, 'alice', 'channel1')

            // Then prepend older events
            const events2 = new ConversationBuilder()
                .sendMessage({ id: 'msg1', from: 'alice', body: 'first' })
                .getEvents()
            timelinesView.setState.prependEvents(events2, 'alice', 'channel1')

            const { eventIndex, timelines } = timelinesView.value
            const index = eventIndex['channel1']

            expect(index.size).toBe(3)
            // After prepending, msg1 should be at index 0
            expect(index.get('msg1')).toBe(0)
            expect(index.get('msg2')).toBe(1)
            expect(index.get('msg3')).toBe(2)

            // Verify the timeline order
            expect(timelines['channel1'][0].eventId).toBe('msg1')
            expect(timelines['channel1'][1].eventId).toBe('msg2')
            expect(timelines['channel1'][2].eventId).toBe('msg3')
        })

        test('eventIndex is updated after editing events', () => {
            const events = new ConversationBuilder()
                .sendMessage({ id: 'msg1', from: 'alice', body: 'hello' })
                .editMessage({ edits: 'msg1', newBody: 'hello (edited)' })
                .getEvents()

            timelinesView.setState.appendEvents(events, 'alice', 'channel1')

            const { eventIndex, timelines } = timelinesView.value
            const index = eventIndex['channel1']

            // Should still have one event (edited)
            expect(index.size).toBe(1)
            expect(index.get('msg1')).toBe(0)
            expect(timelines['channel1'][0].fallbackContent).toContain('hello (edited)')
        })
    })

    describe('threadEventIndex', () => {
        test('threadEventIndex is populated for thread replies', () => {
            const events = new ConversationBuilder()
                .sendMessage({ id: 'parent', from: 'alice', body: 'parent message' })
                .sendMessage({ id: 'reply1', threadId: 'parent', from: 'bob', body: 'reply 1' })
                .sendMessage({ id: 'reply2', threadId: 'parent', from: 'alice', body: 'reply 2' })
                .getEvents()

            timelinesView.setState.appendEvents(events, 'alice', 'channel1')

            const { threadEventIndex, threads } = timelinesView.value
            const parentIndex = threadEventIndex['channel1']?.['parent']

            expect(parentIndex).toBeDefined()
            expect(parentIndex.size).toBe(2)

            // Thread replies should be indexed
            const reply1Idx = parentIndex.get('reply1')
            const reply2Idx = parentIndex.get('reply2')
            expect(reply1Idx).toBeDefined()
            expect(reply2Idx).toBeDefined()

            // Verify indices match actual positions in thread
            const threadEvents = threads['channel1']?.['parent'] ?? []
            expect(threadEvents[reply1Idx!].eventId).toBe('reply1')
            expect(threadEvents[reply2Idx!].eventId).toBe('reply2')
        })

        test('thread replies are sorted by eventNum (binary insertion)', () => {
            // Create events with out-of-order eventNums
            const events = new ConversationBuilder()
                .sendMessage({ id: 'parent', from: 'alice', body: 'parent message' })
                .sendMessage({ id: 'reply3', threadId: 'parent', from: 'bob', body: 'reply 3' })
                .sendMessage({ id: 'reply1', threadId: 'parent', from: 'alice', body: 'reply 1' })
                .sendMessage({ id: 'reply2', threadId: 'parent', from: 'bob', body: 'reply 2' })
                .getEvents()

            timelinesView.setState.appendEvents(events, 'alice', 'channel1')

            const { threads, threadEventIndex } = timelinesView.value
            const threadEvents = threads['channel1']?.['parent'] ?? []

            // Verify events are sorted by eventNum
            for (let i = 1; i < threadEvents.length; i++) {
                expect(threadEvents[i].eventNum >= threadEvents[i - 1].eventNum).toBe(true)
            }

            // Verify index is consistent with sorted positions
            const index = threadEventIndex['channel1']?.['parent']
            for (let i = 0; i < threadEvents.length; i++) {
                expect(index.get(threadEvents[i].eventId)).toBe(i)
            }
        })
    })

    describe('O(1) lookup verification', () => {
        test('lookup via eventIndex matches direct find', () => {
            const events = new ConversationBuilder()
                .sendMessage({ id: 'msg1', from: 'alice', body: 'hello' })
                .sendMessage({ id: 'msg2', from: 'bob', body: 'world' })
                .getEvents()

            timelinesView.setState.appendEvents(events, 'alice', 'channel1')

            const { eventIndex, timelines } = timelinesView.value
            const timeline = timelines['channel1']
            const index = eventIndex['channel1']

            // O(1) lookup via index
            const idx = index.get('msg2')
            const eventViaIndex = idx !== undefined ? timeline[idx] : undefined

            // O(n) lookup via find (for comparison)
            const eventViaFind = timeline.find((e) => e.eventId === 'msg2')

            expect(eventViaIndex).toBeDefined()
            expect(eventViaFind).toBeDefined()
            expect(eventViaIndex).toEqual(eventViaFind)
        })
    })

    describe('Phase 3: originalEvents and replacementLog', () => {
        test('originalEvents stores only the first version of edited event', () => {
            // Send original message
            const events1 = new ConversationBuilder()
                .sendMessage({ id: 'msg1', from: 'alice', body: 'original message' })
                .getEvents()
            timelinesView.setState.appendEvents(events1, 'alice', 'channel1')

            // Edit the message first time
            const events2 = new ConversationBuilder()
                .sendMessage({ id: 'msg1', from: 'alice', body: 'original message' })
                .editMessage({ edits: 'msg1', newBody: 'first edit' })
                .getEvents()
            timelinesView.setState.appendEvents(events2, 'alice', 'channel1')

            const { originalEvents: afterFirstEdit } = timelinesView.value
            const originalAfterFirstEdit = afterFirstEdit['channel1']?.['msg1']
            expect(originalAfterFirstEdit).toBeDefined()
            expect(originalAfterFirstEdit?.fallbackContent).toContain('original message')

            // Edit the message second time
            const events3 = new ConversationBuilder()
                .sendMessage({ id: 'msg1', from: 'alice', body: 'first edit' })
                .editMessage({ edits: 'msg1', newBody: 'second edit' })
                .getEvents()
            timelinesView.setState.appendEvents(events3, 'alice', 'channel1')

            const { originalEvents: afterSecondEdit } = timelinesView.value
            const originalAfterSecondEdit = afterSecondEdit['channel1']?.['msg1']

            // Original should still be the FIRST version, not updated to first edit
            expect(originalAfterSecondEdit).toBeDefined()
            expect(originalAfterSecondEdit?.fallbackContent).toContain('original message')
        })

        test('replacementLog tracks all edits including duplicates', () => {
            // Send original message
            const events1 = new ConversationBuilder()
                .sendMessage({ id: 'msg1', from: 'alice', body: 'original' })
                .getEvents()
            timelinesView.setState.appendEvents(events1, 'alice', 'channel1')

            // Edit once
            const events2 = new ConversationBuilder()
                .sendMessage({ id: 'msg1', from: 'alice', body: 'original' })
                .editMessage({ edits: 'msg1', newBody: 'edit 1' })
                .getEvents()
            timelinesView.setState.appendEvents(events2, 'alice', 'channel1')

            const { replacementLog: log1 } = timelinesView.value
            expect(log1['channel1']?.length).toBe(1)

            // Edit again
            const events3 = new ConversationBuilder()
                .sendMessage({ id: 'msg1', from: 'alice', body: 'edit 1' })
                .editMessage({ edits: 'msg1', newBody: 'edit 2' })
                .getEvents()
            timelinesView.setState.appendEvents(events3, 'alice', 'channel1')

            const { replacementLog: log2 } = timelinesView.value
            // Log should have two entries (may be duplicates) for transform iteration
            expect(log2['channel1']?.length).toBe(2)
        })

        test('originalEvents stores one entry per unique eventId', () => {
            // Send and edit multiple messages
            const events = new ConversationBuilder()
                .sendMessage({ id: 'msg1', from: 'alice', body: 'message 1' })
                .sendMessage({ id: 'msg2', from: 'bob', body: 'message 2' })
                .editMessage({ edits: 'msg1', newBody: 'msg1 edited' })
                .editMessage({ edits: 'msg2', newBody: 'msg2 edited' })
                .editMessage({ edits: 'msg1', newBody: 'msg1 edited again' })
                .getEvents()

            timelinesView.setState.appendEvents(events, 'alice', 'channel1')

            const { originalEvents } = timelinesView.value
            const originals = originalEvents['channel1']

            // Should have exactly 2 entries (one per unique eventId), not 3 (one per edit)
            expect(Object.keys(originals ?? {}).length).toBe(2)
            expect(originals?.['msg1']?.fallbackContent).toContain('message 1')
            expect(originals?.['msg2']?.fallbackContent).toContain('message 2')
        })
    })
})
