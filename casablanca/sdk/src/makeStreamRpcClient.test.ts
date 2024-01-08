/**
 * @group main
 */

import { Err, InfoRequest, InfoResponse } from '@river/proto'
import { makeTestRpcClient } from './util.test'
import { errorContains } from './makeStreamRpcClient'

describe('protocol', () => {
    test('info', async () => {
        const client = makeTestRpcClient()
        expect(client).toBeDefined()

        const response: InfoResponse = await client.info(new InfoRequest({}), {
            timeoutMs: 10000,
        })
        expect(response).toBeDefined()
        expect(response.graffiti).toEqual('Towns.com node welcomes you!')
    })

    test('info-error', async () => {
        const client = makeTestRpcClient()
        expect(client).toBeDefined()

        try {
            await client.info(new InfoRequest({ debug: 'error' }))
            expect(true).toBe(false)
        } catch (err) {
            expect(errorContains(err, Err.DEBUG_ERROR)).toBe(true)
        }
    })
})
