import { Interceptor, Transport } from '@connectrpc/connect'
import {
    createConnectTransport as createConnectTransportWeb,
    ConnectTransportOptions as ConnectTransportOptionsWeb,
} from '@connectrpc/connect-web'
import { type RetryParams } from './rpcInterceptors'
import { isNodeEnv, isTestEnv } from '@river-build/dlog'

export interface RpcOptions {
    retryParams?: RetryParams
    interceptors?: Interceptor[]
}

export function createHttp2ConnectTransport(options: ConnectTransportOptionsWeb): Transport {
    if (isNodeEnv() && !isTestEnv()) {
        // use node version of connect to force httpVersion: '2'
        const {
            createConnectTransport: createConnectTransportNode,
            // eslint-disable-next-line import/no-extraneous-dependencies, @typescript-eslint/no-var-requires
        } = require('@connectrpc/connect-node')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        return createConnectTransportNode({ ...options, httpVersion: '2' }) as Transport
    }
    return createConnectTransportWeb(options)
}
