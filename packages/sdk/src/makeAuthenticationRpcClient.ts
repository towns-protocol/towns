import { Client, createClient, ConnectTransportOptions } from '@towns-protocol/rpc-connector/common'
import { AuthenticationService } from '@towns-protocol/proto'
import { dlog } from '@towns-protocol/utils'
import { getEnvVar, randomUrlSelector } from './utils'
import { DEFAULT_RETRY_PARAMS, loggingInterceptor, retryInterceptor, setHeaderInterceptor } from './rpcInterceptors'
import { RpcOptions } from './rpcCommon'
import { createHttp2ConnectTransport } from '@towns-protocol/rpc-connector'
import packageJson from '../package.json' assert { type: 'json' }

const logInfo = dlog('csb:auto-rpc:info')

let nextRpcClientNum = 0

export type AuthenticationRpcClient = Client<typeof AuthenticationService> & { url: string }

export function makeAuthenticationRpcClient(
    dest: string,
    opts?: RpcOptions,
): AuthenticationRpcClient {
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
            setHeaderInterceptor({ Version: packageJson.version }),
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
    const transport = createHttp2ConnectTransport(options)
    const client = createClient(AuthenticationService, transport) as AuthenticationRpcClient
    client.url = url
    return client
}
