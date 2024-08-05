/* eslint-disable @typescript-eslint/no-unsafe-call */
import { PromiseClient, createPromiseClient } from '@connectrpc/connect'
import { ConnectTransportOptions, createConnectTransport } from '@connectrpc/connect-node'
import { StreamService } from '@river-build/proto'
import { loggingInterceptor, retryInterceptor, type RetryParams } from '@river-build/sdk'
import { dlogger } from '@river-build/dlog'

const logger = dlogger('csb:rpc:info')

export type StreamRpcClient = PromiseClient<typeof StreamService> & { url?: string }

let nextRpcClientNum = 0

export function makeStreamRpcClient(
    url: string,
    refreshNodeUrl?: () => Promise<string>,
    retryParams: RetryParams = { maxAttempts: 3, initialRetryDelay: 2000, maxRetryDelay: 6000 },
): StreamRpcClient {
    const transportId = nextRpcClientNum++
    logger.info(`makeStreamRpcClient: Connecting to url=${url}`)
    const options: ConnectTransportOptions = {
        httpVersion: '2',
        baseUrl: url,
        interceptors: [
            loggingInterceptor(transportId),
            retryInterceptor({ ...retryParams, refreshNodeUrl }),
        ],
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
