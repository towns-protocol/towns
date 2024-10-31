import { PromiseClient, createPromiseClient, type Interceptor } from '@connectrpc/connect'
import { ConnectTransportOptions, createConnectTransport } from '@connectrpc/connect-web'
import { StreamService } from '@river-build/proto'
import { dlog } from '@river-build/dlog'
import { getEnvVar, randomUrlSelector } from './utils'
import {
    getRetryDelayMs,
    loggingInterceptor,
    retryInterceptor,
    type RetryParams,
} from './rpcInterceptors'

const logInfo = dlog('csb:rpc:info')
let nextRpcClientNum = 0

export interface StreamRpcClientOptions {
    retryParams: RetryParams
    defaultTimeoutMs?: number
}

export type StreamRpcClient = PromiseClient<typeof StreamService> & {
    url: string
    opts: StreamRpcClientOptions
}
export type MakeRpcClientType = typeof makeStreamRpcClient

export function makeStreamRpcClient(
    dest: string,
    retryParams: RetryParams = { maxAttempts: 3, initialRetryDelay: 2000, maxRetryDelay: 6000 },
    refreshNodeUrl?: () => Promise<string>,
    interceptors?: Interceptor[],
    defaultTimeoutMs?: number,
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
        defaultTimeoutMs,
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
    client.opts = { retryParams, defaultTimeoutMs }
    return client
}

export function getMaxTimeoutMs(opts: StreamRpcClientOptions): number {
    let maxTimeoutMs = 0
    for (let i = 1; i <= opts.retryParams.maxAttempts; i++) {
        maxTimeoutMs += opts.defaultTimeoutMs ?? 0 + getRetryDelayMs(i, opts.retryParams)
    }
    return maxTimeoutMs
}
