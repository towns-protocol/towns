import { Client, createClient } from '@connectrpc/connect'
import { ConnectTransportOptions } from '@connectrpc/connect-web'
import { AuthenticationService } from '@towns-protocol/proto'
import { dlog } from '@towns-protocol/dlog'
import { getEnvVar, randomUrlSelector } from './utils'
import { DEFAULT_RETRY_PARAMS, loggingInterceptor, retryInterceptor } from './rpcInterceptors'
import { createHttp2ConnectTransport, RpcOptions } from './rpcCommon'

const logInfo = dlog('csb:auto-rpc:info')

let nextRpcClientNum = 0

export type AuthenticationRpcClient = Client<typeof AuthenticationService> & { url: string }

export async function makeAuthenticationRpcClient(
    dest: string,
    opts?: RpcOptions,
): Promise<AuthenticationRpcClient> {
    const transportId = nextRpcClientNum++
    const retryParams = opts?.retryParams ?? DEFAULT_RETRY_PARAMS
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
            ...(opts?.interceptors ?? []),
            loggingInterceptor(transportId, 'AuthenticationService'),
            retryInterceptor(retryParams),
        ],
        defaultTimeoutMs: undefined, // default timeout is undefined, we add a timeout in the retryInterceptor
    }
    if (getEnvVar('RIVER_DEBUG_TRANSPORT') !== 'true') {
        options.useBinaryFormat = true
    } else {
        logInfo('makeAuthenticationRpcClient: running in debug mode, using JSON format')
        options.useBinaryFormat = false
        options.jsonOptions = {
            alwaysEmitImplicit: true,
            useProtoFieldName: true,
        }
    }
    const transport = await createHttp2ConnectTransport(options)
    const client: AuthenticationRpcClient = createClient(
        AuthenticationService,
        transport,
    ) as AuthenticationRpcClient
    client.url = url
    return client
}
