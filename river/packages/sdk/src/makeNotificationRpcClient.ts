import { PromiseClient, createPromiseClient } from '@connectrpc/connect'
import { ConnectTransportOptions, createConnectTransport } from '@connectrpc/connect-web'
import { NotificationService } from '@river-build/proto'
import { dlog } from '@river-build/dlog'
import { getEnvVar, randomUrlSelector } from './utils'
import { DEFAULT_RETRY_PARAMS, DEFAULT_TIMEOUT_MS, RpcOptions } from './rpcOptions'
import { loggingInterceptor, retryInterceptor, setHeaderInterceptor } from './rpcInterceptors'

const logInfo = dlog('csb:rpc:info')

let nextRpcClientNum = 0

export type NotificationRpcClient = PromiseClient<typeof NotificationService> & { url: string }

export function makeNotificationRpcClient(
    dest: string,
    sessionToken: string,
    opts?: RpcOptions,
): NotificationRpcClient {
    const transportId = nextRpcClientNum++
    const retryParams = opts?.retryParams ?? DEFAULT_RETRY_PARAMS
    const defaultTimeoutMs = opts?.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS
    const url = randomUrlSelector(dest)
    logInfo(
        'makeNotificationRpcClient: Connecting to url=',
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
            loggingInterceptor(transportId, 'NotificationService'),
            setHeaderInterceptor({ Authorization: sessionToken }),
            ...(opts?.interceptors ?? []),
        ],
        defaultTimeoutMs: defaultTimeoutMs,
    }
    if (getEnvVar('RIVER_DEBUG_TRANSPORT') !== 'true') {
        options.useBinaryFormat = true
    } else {
        logInfo('makeNotificationRpcClient: running in debug mode, using JSON format')
        options.useBinaryFormat = false
        options.jsonOptions = {
            emitDefaultValues: true,
            useProtoFieldName: true,
        }
    }
    const transport = opts?.createConnectTransport?.(options) ?? createConnectTransport(options)
    const client: NotificationRpcClient = createPromiseClient(
        NotificationService,
        transport,
    ) as NotificationRpcClient
    client.url = url
    return client
}
