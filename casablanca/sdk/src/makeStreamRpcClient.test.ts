import { makeStreamRpcClient } from './makeStreamRpcClient'
import { InfoRequest, InfoResponse } from '@river/proto'

describe('protocol', () => {
    test('info', async () => {
        const client = makeStreamRpcClient('https://localhost:5158')
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
