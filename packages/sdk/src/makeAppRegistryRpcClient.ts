import { Client, createClient } from '@connectrpc/connect'
import { type ConnectTransportOptions } from '@connectrpc/connect-web'
import { AppRegistryService } from '@towns-protocol/proto'
import { dlog } from '@towns-protocol/utils'
import { getEnvVar, randomUrlSelector } from './utils'
import {
    DEFAULT_RETRY_PARAMS,
    loggingInterceptor,
    retryInterceptor,
    setHeaderInterceptor,
} from './rpcInterceptors'
import type { RpcOptions } from './rpcCommon'
import { createHttp2ConnectTransport } from '@towns-protocol/rpc-connector'

const logInfo = dlog('csb:rpc:info')

let nextRpcClientNum = 0

export type AppRegistryRpcClient = Client<typeof AppRegistryService> & { url: string }

export function makeAppRegistryRpcClient(
    dest: string,
    sessionToken: string,
    opts?: RpcOptions,
): AppRegistryRpcClient {
    const transportId = nextRpcClientNum++
    const retryParams = opts?.retryParams ?? DEFAULT_RETRY_PARAMS
    const url = randomUrlSelector(dest)
    logInfo(
        'makeAppRegistryRpcClient: Connecting to url=',
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
            loggingInterceptor(transportId, 'AppRegistryService'),
            retryInterceptor(retryParams),
        ],
        defaultTimeoutMs: undefined, // default timeout is undefined, we add a timeout in the retryInterceptor
    }
    if (getEnvVar('RIVER_DEBUG_TRANSPORT') !== 'true') {
        options.useBinaryFormat = true
    } else {
        logInfo('makeAppRegistryRpcClient: running in debug mode, using JSON format')
        options.useBinaryFormat = false
        options.jsonOptions = {
            alwaysEmitImplicit: true,
            useProtoFieldName: true,
        }
    }
    const transport = createHttp2ConnectTransport(options)
    const client: AppRegistryRpcClient = createClient(
        AppRegistryService,
        transport,
    ) as AppRegistryRpcClient
    client.url = url
    return client
}
