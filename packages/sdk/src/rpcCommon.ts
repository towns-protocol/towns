import { Interceptor, Transport } from '@connectrpc/connect'
import { type ConnectTransportOptions as ConnectTransportOptionsWeb } from '@connectrpc/connect-web'
import { type RetryParams } from './rpcInterceptors'
import { isNodeEnv, isBrowser, isTestEnv } from '@towns-protocol/dlog'

export interface RpcOptions {
    retryParams?: RetryParams
    interceptors?: Interceptor[]
}

export async function createHttp2ConnectTransport(
    options: ConnectTransportOptionsWeb,
): Promise<Transport> {
    try {
        if (isNodeEnv && !isTestEnv()) {
            // use node version of connect to force httpVersion: '2'
            const { createConnectTransport } = await import('@connectrpc/connect-node')
            return createConnectTransport({ ...options, httpVersion: '2' })
        } else {
            const { createConnectTransport } = await import('@connectrpc/connect-web')
            return createConnectTransport(options)
        }
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(
            'You need to install @connectrpc/connect-node or @connectrpc/connect-web to use the SDK',
        )
        throw e
    }
}
