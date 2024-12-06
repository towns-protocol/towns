import { PromiseClient, createPromiseClient } from '@connectrpc/connect'
import { ConnectTransportOptions } from '@connectrpc/connect-web'
import { NotificationService } from '@river-build/proto'
import { dlog } from '@river-build/dlog'
import { getEnvVar, randomUrlSelector } from './utils'
import { createHttp2ConnectTransport, RpcOptions } from './rpcCommon'
import {
    DEFAULT_RETRY_PARAMS,
    loggingInterceptor,
    retryInterceptor,
    setHeaderInterceptor,
} from './rpcInterceptors'

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
            ...(opts?.interceptors ?? []),
            setHeaderInterceptor({ Authorization: sessionToken }),
            loggingInterceptor(transportId, 'NotificationService'),
            retryInterceptor(retryParams),
        ],
        defaultTimeoutMs: undefined, // default timeout is undefined, we add a timeout in the retryInterceptor
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
    const transport = createHttp2ConnectTransport(options)
    const client: NotificationRpcClient = createPromiseClient(
        NotificationService,
        transport,
    ) as NotificationRpcClient
    client.url = url
    return client
}
