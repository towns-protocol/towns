import { InfoRequest, InfoResponse } from '@river/proto'
import { makeTestRpcClient } from './util.test'

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
})
