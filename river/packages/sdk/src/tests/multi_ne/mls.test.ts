/**
 * @group main
 */

import { makeTestClient } from '../testUtils'
import { Client } from '../../client'
import { PlainMessage } from '@bufbuild/protobuf'
import { MemberPayload_Mls } from '@river-build/proto'
import { randomBytes } from 'crypto'

describe('mlsTests', () => {
    let clients: Client[] = []
    const makeInitAndStartClient = async () => {
        const client = await makeTestClient()
        await client.initializeUser()
        client.startSync()
        clients.push(client)
        return client
    }

    beforeEach(async () => {})

    afterEach(async () => {
        for (const client of clients) {
            await client.stop()
        }
        clients = []
    })

    test('invalidMlsGroupThrowsError', async () => {
        const bobsClient = await makeInitAndStartClient()
        const alicesClient = await makeInitAndStartClient()
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        const stream = await bobsClient.waitForStream(streamId)

        expect(stream.view.getMembers().membership.joinedUsers).toEqual(
            new Set([bobsClient.userId, alicesClient.userId]),
        )

        const deviceKey = new Uint8Array(randomBytes(32))
        const mlsPayload: PlainMessage<MemberPayload_Mls> = {
            content: {
                case: 'initializeGroup',
                value: {
                    deviceKey: deviceKey,
                    externalGroupSnapshot: new Uint8Array([]),
                    groupInfoMessage: new Uint8Array([]),
                },
            },
        }
        await expect(bobsClient._debugSendMls(streamId, mlsPayload)).rejects.to.toThrow(
            'INVALID_GROUP_INFO',
        )
    })
})
