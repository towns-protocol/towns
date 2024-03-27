/**
 * @group main
 */

import { makeTestClient } from './util.test'
import { Client } from './client'
import { dlog } from '@river-build/dlog'

const log = dlog('csb:test:streamMembershipHardening')

// these tests verify that if adding the derived membership event fails
// we can recover by attempting to re-join, re-invite, or re-leave the channel
describe('streamMembershipHardening', () => {
    let bobsClient: Client
    let alicesClient: Client

    beforeEach(async () => {
        bobsClient = await makeTestClient()
        await bobsClient.initializeUser()
        bobsClient.startSync()

        alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()
        log('clients initialized')
    })

    afterEach(async () => {
        await bobsClient.stop()
        await alicesClient.stop()
    })

    test('broken space membership', async () => {})
    test('broken channel membership', async () => {})
    test('broken dm membership', async () => {})
    test('broken gdm membership', async () => {})
})
