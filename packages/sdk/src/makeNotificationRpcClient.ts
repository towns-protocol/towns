import { Client, createClient, ConnectTransportOptions } from '@towns-protocol/rpc-connector/common'
import { NotificationService } from '@towns-protocol/proto'
import { dlog } from '@towns-protocol/utils'
import { getEnvVar, randomUrlSelector } from './utils'
import { RpcOptions } from './rpcCommon'
import { createHttp2ConnectTransport } from '@towns-protocol/rpc-connector'
import {
    DEFAULT_RETRY_PARAMS,
    loggingInterceptor,
    retryInterceptor,
    setHeaderInterceptor,
} from './rpcInterceptors'

const logInfo = dlog('csb:rpc:info')

let nextRpcClientNum = 0

export type NotificationRpcClient = Client<typeof NotificationService> & { url: string }

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
            alwaysEmitImplicit: true,
            useProtoFieldName: true,
        }
    }
    const transport = createHttp2ConnectTransport(options)
    const client = createClient(NotificationService, transport) as NotificationRpcClient
    client.url = url
    return client
}
