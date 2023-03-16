import {
    createConnectTransport,
    createGrpcWebTransport,
    createPromiseClient,
} from '@bufbuild/connect-web'
import { StreamService } from './protocol_connectweb'
import { InfoRequest, InfoResponse } from './protocol_pb'

describe('protocol', () => {
    test.each([createConnectTransport, createGrpcWebTransport])('info', async (transportFunc) => {
        const transport = transportFunc({
            baseUrl: 'http://localhost:5157',
            useBinaryFormat: true,
        })
        expect(transport).toBeDefined()

        const client = createPromiseClient(StreamService, transport)
        expect(client).toBeDefined()

        const abortController = new AbortController()
        const response: InfoResponse = await client.info(new InfoRequest({}), {
            timeoutMs: 10000,
            signal: abortController.signal,
        })
        expect(response).toBeDefined()
        expect(response.graffiti).toEqual('TBD Project Name node welcomes you!')
    })
})
