/**
 * @group main
 */

import { MembershipOp } from '@towns-protocol/proto'
import { makeTestClient, waitFor } from '../testUtils'
import { genShortId } from '../../id'
import { getFallbackContent } from '../../views/models/timelineEvent'
import { StreamStateView } from '../../streamStateView'
import { dlog } from '@towns-protocol/dlog'
import { RiverTimelineEvent } from '../../views/models/timelineTypes'

const log = dlog('test:syncedStream')

function logTimeline(name: string, stream: StreamStateView) {
    log('xoxoxo ' + name, stream.miniblockInfo!.min, stream.miniblockInfo!.max)
    log(
        stream.timeline
            .map((e) => ({
                eventId: e.eventId,
                kind: getFallbackContent('', e.content),
                eventNumber: e.confirmedEventNum ?? e.eventNum,
            }))
            .sort((a, b) => Number(a.eventNumber - b.eventNumber)),
    )
}

describe('syncedStream', () => {
    test('clientRefreshesStreamOnBadSyncCookie', async () => {
        const bobDeviceId = genShortId()
        const bob = await makeTestClient({ deviceId: bobDeviceId })
        await bob.initializeUser()
        bob.startSync()

        const alice = await makeTestClient()
        await alice.initializeUser()
        alice.startSync()

        const { streamId } = await bob.createDMChannel(alice.userId)

        const aliceStream = await alice.waitForStream(streamId)
        // Bob waits for stream and goes offline
        const bobStreamCached = await bob.waitForStream(streamId)
        await bobStreamCached.waitForMembership(MembershipOp.SO_JOIN)
        await bob.stopSync()

        // Force the creation of N snapshots, which will make the sync cookie invalid
        for (let i = 0; i < 10; i++) {
            await alice.sendMessage(streamId, `'hello ${i}`)
            await alice.debugForceMakeMiniblock(streamId, { forceSnapshot: true })
        }

        logTimeline('alice', aliceStream.view)

        // later, Bob returns
        const bob2 = await makeTestClient({ context: bob.signerContext, deviceId: bobDeviceId })
        await bob2.initializeUser()
        bob2.startSync()

        // the stream is now loaded from cache
        const bobStreamFresh = await bob2.waitForStream(streamId)

        logTimeline('bobFresh', bobStreamFresh.view)
        logTimeline('bobCached', bobStreamCached.view)
        const fresh = bobStreamFresh.view.timeline.map((e) => e.eventId)
        const cached = bobStreamCached.view.timeline.map((e) => e.eventId)
        expect(fresh.length).toBeGreaterThan(0)
        expect(cached.length).toBeGreaterThan(0)
        expect(fresh).toStrictEqual(cached)

        expect(aliceStream.view.timeline.length).toBeGreaterThan(
            bobStreamFresh.view.timeline.length,
        )

        // wait for new stream to trigger bad_sync_cookie and get a fresh view sent back
        await waitFor(
            () => bobStreamFresh.view.miniblockInfo!.max > bobStreamCached.view.miniblockInfo!.max,
        )

        // Backfill the entire stream
        while (!bobStreamFresh.view.miniblockInfo!.terminusReached) {
            logTimeline('backfilling bobfresh', bobStreamFresh.view)
            await bob2.scrollback(streamId)
        }
        logTimeline('backfilled bobfresh', bobStreamFresh.view)

        // Once Bob's stream is fully backfilled, the sync cookie should match Alice's
        await waitFor(
            () => aliceStream.view.miniblockInfo!.max === bobStreamFresh.view.miniblockInfo!.max,
        )

        // check that the events are the same
        await waitFor(() => {
            // Filter Alice's events and adjust event numbers to account for filtered events
            let shift = 0n
            const aliceEvents = aliceStream.view.timeline
                /*.map((e) => {
                    if (e.content?.kind === RiverTimelineEvent.StreamMembership) {
                        // Skip this event but increment shift to account for the gap
                        shift += 1n
                        return null
                    } else {
                        // Use original event number minus the accumulated shift
                        return {
                            eventId: e.eventId,
                            kind: getFallbackContent('', e.content),
                            eventNumber: (e.confirmedEventNum ?? e.eventNum) - shift,
                        }
                    }
                })
                .filter((e): e is NonNullable<typeof e> => e !== null)*/
                .map((e) => ({
                  eventId: e.eventId,
                  kind: getFallbackContent('', e.content),
                  content: e.content,
                  eventNumber: e.confirmedEventNum ?? e.eventNum,
                }))
                .filter((e) => e.content?.kind !== RiverTimelineEvent.StreamMembership)
                .sort((a, b) => Number(a.eventNumber - b.eventNumber))

            const bobEvents = bobStreamFresh.view.timeline
                .map((e) => ({
                    eventId: e.eventId,
                    kind: getFallbackContent('', e.content),
                    content: e.content,
                    eventNumber: e.confirmedEventNum ?? e.eventNum,
                }))
                .sort((a, b) => Number(a.eventNumber - b.eventNumber))

            expect(bobEvents).toStrictEqual(aliceEvents)
        })

        const bobEventCount = bobStreamFresh.view.timeline.length
        // Alice sends another 5 messages
        for (let i = 0; i < 5; i++) {
            await alice.sendMessage(streamId, `'hello again ${i}`)
        }

        // Wait for Bob to sync the new messages to verify that sync still works
        await waitFor(() => bobStreamFresh.view.timeline.length === bobEventCount + 5)

        await bob2.stopSync()
        await alice.stopSync()
    })
})
