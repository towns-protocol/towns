/**
 * @group main
 */

import { Client } from './client'
import { makeDonePromise, makeTestClient } from './util.test'
import { dlog, UserDeviceCollection } from '@river/mecholm'
import { UserToDevicePayload_MegolmSessions } from '@river/proto'

const log = dlog('test:toDeviceMessage')

describe('toDeviceMessageTest', () => {
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

    test('bobSendsAliceToDeviceMessage', async () => {
        log('bobSendsAliceToDeviceMessage')
        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.initializeUser()).toResolve()
        await bobsClient.startSync()
        // Alice gets created.
        await expect(alicesClient.initializeUser()).toResolve()
        const aliceUserStreamId = alicesClient.userStreamId
        log('aliceUserStreamId', aliceUserStreamId)
        await alicesClient.startSync()

        const aliceSelfToDevice = makeDonePromise()
        alicesClient.once(
            'newMegolmSessions',
            (sessions: UserToDevicePayload_MegolmSessions, senderUserId: string): void => {
                log('toDeviceMessage for Alice', sessions, senderUserId)
                aliceSelfToDevice.runAndDone(() => {
                    expect(senderUserId).toEqual(bobsClient.userId)
                    expect(sessions.streamId).toEqual('200')
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
            bobsClient.encryptAndShareMegolmSessions(
                '200',
                [
                    {
                        streamId: '200',
                        sessionId: '300',
                        sessionKey: '400',
                        algorithm: '',
                    },
                ],
                recipients,
            ),
        ).toResolve()
        await aliceSelfToDevice.expectToSucceed()
    })
})
