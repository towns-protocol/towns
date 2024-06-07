/**
 * @group main
 */

import { MembershipOp } from '@river-build/proto'
import { makeTestClient, waitFor } from './util.test'
import { genShortId } from './id'

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

        // later, Bob returns
        const bob2 = await makeTestClient({ context: bob.signerContext, deviceId: bobDeviceId })
        await bob2.initializeUser()
        bob2.startSync()

        // the stream is now loaded from cache
        const bobStreamFresh = await bob2.waitForStream(streamId)

        expect(bobStreamFresh.view.timeline.map((e) => e.remoteEvent)).toEqual(
            bobStreamCached.view.timeline.map((e) => e.remoteEvent),
        )
        expect(aliceStream.view.timeline.length).toBeGreaterThan(
            bobStreamFresh.view.timeline.length,
        )

        // wait for new stream to trigger bad_sync_cookie and get a fresh view sent back
        await waitFor(
            () => bobStreamFresh.view.miniblockInfo!.max > bobStreamCached.view.miniblockInfo!.max,
        )

        // Backfill the entire stream
        while (!bobStreamFresh.view.miniblockInfo!.terminusReached) {
            await bob2.scrollback(streamId)
        }

        // Once Bob's stream is fully backfilled, the sync cookie should match Alice's
        await waitFor(
            () => aliceStream.view.miniblockInfo!.max === bobStreamFresh.view.miniblockInfo!.max,
        )

        // check that the events are the same
        const aliceEvents = aliceStream.view.timeline.map((e) => e.hashStr)
        const bobEvents = bobStreamFresh.view.timeline.map((e) => e.hashStr)
        await waitFor(() => aliceEvents.sort() === bobEvents.sort())

        const bobEventCount = bobEvents.length
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
