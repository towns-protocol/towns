/**
 * @group main
 */

import { makeTestClient, makeUniqueSpaceStreamId, waitFor } from './util.test'
import { Client } from './client'
import { dlog } from '@river-build/dlog'
import { makeUniqueChannelStreamId } from './id'
import { MembershipOp } from '@river-build/proto'

const log = dlog('csb:test')

describe('spaceTests', () => {
    let bobsClient: Client
    let alicesClient: Client

    beforeEach(async () => {
        bobsClient = await makeTestClient()
        await bobsClient.initializeUser()
        bobsClient.startSync()

        alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()
    })

    afterEach(async () => {
        await bobsClient.stop()
        await alicesClient.stop()
    })

    test('bobKicksAlice', async () => {
        log('bobKicksAlice')

        const spaceId = makeUniqueSpaceStreamId()
        await expect(bobsClient.createSpace(spaceId)).toResolve()

        const channelId = makeUniqueChannelStreamId(spaceId)
        await expect(bobsClient.createChannel(spaceId, 'name', 'topic', channelId)).toResolve()

        await expect(alicesClient.joinStream(spaceId)).toResolve()
        await expect(alicesClient.joinStream(channelId)).toResolve()

        const userStreamView = alicesClient.stream(alicesClient.userStreamId!)!.view
        await waitFor(() => {
            expect(userStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
            expect(userStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(true)
        })

        // Bob can kick Alice
        await expect(bobsClient.removeUser(spaceId, alicesClient.userId)).toResolve()

        // Alice is no longer a member of the space or channel
        await waitFor(() => {
            expect(userStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(false)
            expect(userStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(false)
        })
    })
})
