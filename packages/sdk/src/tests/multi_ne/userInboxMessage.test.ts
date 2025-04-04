/**
 * @group main
 */

import { Client } from '../../client'
import { makeDonePromise, makeTestClient, makeUniqueSpaceStreamId } from '../testUtils'
import { dlog } from '@towns-protocol/dlog'
import { GroupEncryptionAlgorithmId, UserDeviceCollection } from '@towns-protocol/encryption'
import { UserInboxPayload_GroupEncryptionSessions } from '@towns-protocol/proto'
import { makeUniqueChannelStreamId, streamIdAsString } from '../../id'

const log = dlog('test:inboxMessage')

describe('inboxMessageTest', () => {
    let bobsClient: Client
    let alicesClient: Client

    beforeEach(async () => {
        bobsClient = await makeTestClient()
        alicesClient = await makeTestClient()
    })

    afterEach(async () => {
        await bobsClient.stop()
        await alicesClient.stop()
    })

    // should iterate over all the algorithms
    test.each(Object.values(GroupEncryptionAlgorithmId))(
        'bobSendsAliceInboxMessage',
        async (algorithm) => {
            log('bobSendsAliceInboxMessage')
            // Bob gets created, creates a space, and creates a channel.
            await expect(bobsClient.initializeUser()).resolves.not.toThrow()
            bobsClient.startSync()
            // Alice gets created.
            await expect(alicesClient.initializeUser()).resolves.not.toThrow()
            const aliceUserStreamId = alicesClient.userStreamId
            log('aliceUserStreamId', aliceUserStreamId)
            alicesClient.startSync()

            const fakeStreamId = makeUniqueChannelStreamId(makeUniqueSpaceStreamId())
            const aliceSelfInbox = makeDonePromise()
            alicesClient.once(
                'newGroupSessions',
                (
                    sessions: UserInboxPayload_GroupEncryptionSessions,
                    senderUserId: string,
                ): void => {
                    log('inboxMessage for Alice', sessions, senderUserId)
                    aliceSelfInbox.runAndDone(() => {
                        expect(senderUserId).toEqual(bobsClient.userId)
                        expect(streamIdAsString(sessions.streamId)).toEqual(fakeStreamId)
                        expect(sessions.sessionIds).toEqual(['300'])
                        expect(
                            sessions.ciphertexts[alicesClient.userDeviceKey().deviceKey],
                        ).toBeDefined()
                    })
                },
            )

            const recipients: UserDeviceCollection = {}
            recipients[alicesClient.userId] = [alicesClient.userDeviceKey()]

            // bob sends a message to Alice's device.
            await expect(
                bobsClient.encryptAndShareGroupSessions(
                    fakeStreamId,
                    [
                        {
                            streamId: fakeStreamId,
                            sessionId: '300',
                            sessionKey: '400',
                            algorithm,
                        },
                    ],
                    recipients,
                    algorithm,
                ),
            ).resolves.not.toThrow()
            await aliceSelfInbox.expectToSucceed()
        },
    )
})
