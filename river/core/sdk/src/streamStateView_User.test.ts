/**
 * @group main
 */

import { MembershipOp } from '@river-build/proto'
import { makeTestClient, makeUniqueSpaceStreamId, waitFor } from './util.test'

describe('streamStateView_User', () => {
    test('userStreamMembershipsJoin', async () => {
        const bob = await makeTestClient()
        const alice = await makeTestClient()
        await bob.initializeUser()
        await alice.initializeUser()
        bob.startSync()
        alice.startSync()
        const spaceId = makeUniqueSpaceStreamId()
        await expect(bob.createSpace(spaceId)).toResolve()
        await expect(bob.waitForStream(spaceId)).toResolve()

        await expect(bob.inviteUser(spaceId, alice.userId)).toResolve()
        const aliceUserStream = await alice.waitForStream(alice.userStreamId!)
        await waitFor(
            () =>
                aliceUserStream.view.userContent.streamMemberships[spaceId].op ===
                MembershipOp.SO_INVITE,
        )
        await expect(alice.joinStream(spaceId)).toResolve()
        await waitFor(
            () =>
                aliceUserStream.view.userContent.streamMemberships[spaceId].op ===
                MembershipOp.SO_JOIN,
        )

        await expect(alice.leaveStream(spaceId)).toResolve()
        await waitFor(
            () =>
                aliceUserStream.view.userContent.streamMemberships[spaceId].op ===
                MembershipOp.SO_LEAVE,
        )

        await bob.stop()
        await alice.stop()
    })
})
