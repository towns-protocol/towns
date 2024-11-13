import { PromiseClient, createPromiseClient } from '@connectrpc/connect'
import { ConnectTransportOptions, createConnectTransport } from '@connectrpc/connect-web'
import { AuthenticationService } from '@river-build/proto'
import { dlog } from '@river-build/dlog'
import { getEnvVar, randomUrlSelector } from './utils'
import { loggingInterceptor, retryInterceptor } from './rpcInterceptors'
import { RpcOptions, DEFAULT_RETRY_PARAMS, DEFAULT_TIMEOUT_MS } from './rpcOptions'

const logInfo = dlog('csb:auto-rpc:info')

let nextRpcClientNum = 0

export type AuthenticationRpcClient = PromiseClient<typeof AuthenticationService> & { url: string }

export function makeAuthenticationRpcClient(
    dest: string,
    opts?: RpcOptions,
): AuthenticationRpcClient {
    const transportId = nextRpcClientNum++
    const retryParams = opts?.retryParams ?? DEFAULT_RETRY_PARAMS
    const defaultTimeoutMs = opts?.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS
    const url = randomUrlSelector(dest)
    logInfo(
        'makeAuthenticationRpcClient: Connecting to url=',
        url,
        ' allUrls=',
        dest,
        ' transportId =',
        transportId,
    )
    const options: ConnectTransportOptions = {
        baseUrl: url,
        interceptors: [
            retryInterceptor(retryParams),
            loggingInterceptor(transportId, 'AuthenticationService'),
            ...(opts?.interceptors ?? []),
        ],
        defaultTimeoutMs: defaultTimeoutMs,
    }
    if (getEnvVar('RIVER_DEBUG_TRANSPORT') !== 'true') {
        options.useBinaryFormat = true
    } else {
        logInfo('makeAuthenticationRpcClient: running in debug mode, using JSON format')
        options.useBinaryFormat = false
        options.jsonOptions = {
            emitDefaultValues: true,
            useProtoFieldName: true,
        }
    }
    const transport = opts?.createConnectTransport?.(options) ?? createConnectTransport(options)
    const client: AuthenticationRpcClient = createPromiseClient(
        AuthenticationService,
        transport,
    ) as AuthenticationRpcClient
    client.url = url
    return client
}
