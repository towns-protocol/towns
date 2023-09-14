import { makeStreamRpcClient } from './makeStreamRpcClient'
import { InfoRequest, InfoResponse } from '@river/proto'
import { TEST_URL } from './util.test'

describe('protocol', () => {
    test('info', async () => {
        const client = makeStreamRpcClient(TEST_URL)
        expect(client).toBeDefined()

        const abortController = new AbortController()
        const response: InfoResponse = await client.info(new InfoRequest({}), {
            timeoutMs: 10000,
            signal: abortController.signal,
        })
        expect(response).toBeDefined()
        expect(response.graffiti).toEqual('Towns.com node welcomes you!')
    })
})
