import { createConnectTransport, createGrpcWebTransport } from '@bufbuild/connect-web'
import { InfoRequest, InfoResponse } from './gen/protocol_pb'
import { makeStreamRpcClient } from './makeStreamRpcClient'

describe('protocol', () => {
    test.each([createConnectTransport, createGrpcWebTransport])('info', async (transportFunc) => {
        const client = makeStreamRpcClient('http://localhost:5157')
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
