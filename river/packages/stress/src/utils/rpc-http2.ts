import { PromiseClient, createPromiseClient } from '@connectrpc/connect'
import { ConnectTransportOptions, createConnectTransport } from '@connectrpc/connect-node'
import { StreamService } from '@river-build/proto'
import {
    loggingInterceptor,
    randomUrlSelector,
    retryInterceptor,
    type RetryParams,
} from '@river-build/sdk'

export type StreamRpcClient = PromiseClient<typeof StreamService> & { url?: string }

let nextRpcClientNum = 0

export function makeHttp2StreamRpcClient(
    urls: string,
    retryParams: RetryParams = { maxAttempts: 3, initialRetryDelay: 2000, maxRetryDelay: 6000 },
    refreshNodeUrl?: () => Promise<string>,
): StreamRpcClient {
    const transportId = nextRpcClientNum++
    const url = randomUrlSelector(urls)
    const options: ConnectTransportOptions = {
        httpVersion: '2',
        baseUrl: url,
        interceptors: [
            loggingInterceptor(transportId),
            retryInterceptor({ ...retryParams, refreshNodeUrl }),
        ],
        defaultTimeoutMs: 30000,
    }
    if (!process.env.RIVER_DEBUG_TRANSPORT) {
        options.useBinaryFormat = true
    } else {
        options.useBinaryFormat = false
        options.jsonOptions = {
            emitDefaultValues: true,
            useProtoFieldName: true,
        }
    }
    const transport = createConnectTransport(options)

    const client: StreamRpcClient = createPromiseClient(StreamService, transport) as StreamRpcClient
    client.url = url
    return client
}
