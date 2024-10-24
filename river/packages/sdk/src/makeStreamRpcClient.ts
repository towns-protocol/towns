import { PromiseClient, createPromiseClient, type Interceptor } from '@connectrpc/connect'
import { ConnectTransportOptions, createConnectTransport } from '@connectrpc/connect-web'
import { StreamService } from '@river-build/proto'
import { dlog } from '@river-build/dlog'
import { getEnvVar, randomUrlSelector } from './utils'
import { loggingInterceptor, retryInterceptor, type RetryParams } from './rpcInterceptors'

const logInfo = dlog('csb:rpc:info')
let nextRpcClientNum = 0

export type StreamRpcClient = PromiseClient<typeof StreamService> & { url?: string }
export type MakeRpcClientType = typeof makeStreamRpcClient

export function makeStreamRpcClient(
    dest: string,
    retryParams: RetryParams = { maxAttempts: 3, initialRetryDelay: 2000, maxRetryDelay: 6000 },
    refreshNodeUrl?: () => Promise<string>,
    interceptors?: Interceptor[],
): StreamRpcClient {
    const transportId = nextRpcClientNum++
    logInfo('makeStreamRpcClient, transportId =', transportId)
    const url = randomUrlSelector(dest)
    logInfo('makeStreamRpcClient: Connecting to url=', url, ' allUrls=', dest)
    const options: ConnectTransportOptions = {
        baseUrl: url,
        interceptors: [
            retryInterceptor({ ...retryParams, refreshNodeUrl }),
            loggingInterceptor(transportId),
            ...(interceptors ?? []),
        ],
        defaultTimeoutMs: 30000, // this is a massive timeout, but we have very long requests that can take > 10 seconds to create a stream for example
    }
    if (getEnvVar('RIVER_DEBUG_TRANSPORT') !== 'true') {
        options.useBinaryFormat = true
    } else {
        logInfo('makeStreamRpcClient: running in debug mode, using JSON format')
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
