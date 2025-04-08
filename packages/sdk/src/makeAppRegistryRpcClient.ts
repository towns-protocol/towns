/* eslint-disable import/no-extraneous-dependencies */
import { Client, createClient } from '@connectrpc/connect'
import { ConnectTransportOptions } from '@connectrpc/connect-web'
import { AppRegistryService } from '@towns-protocol/proto'
import { dlog } from '@towns-protocol/dlog'
import { DEFAULT_RETRY_PARAMS, retryInterceptor, setHeaderInterceptor } from './rpcInterceptors'
import { type RpcOptions, createHttp2ConnectTransport } from './rpcCommon'
import { randomUrlSelector, getEnvVar } from './utils'

const logInfo = dlog('csb:rpc:info')

let nextRpcClientNum = 0

export type AppRegistryRpcClient = Client<typeof AppRegistryService> & { url: string }

export function makeAppRegistryRpcClient(
    dest: string,
    // Does it require the session token or the JWT?
    // sessionToken: string,
    jwt?: string,
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
            // ...(sessionToken ? [setHeaderInterceptor({ Authorization: sessionToken })] : []),
            ...(jwt ? [setHeaderInterceptor({ Authorization: `Bearer ${jwt}` })] : []),

            // loggingInterceptor(transportId, 'NotificationService'),
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
