import { Interceptor, Transport } from '@connectrpc/connect'
import { ConnectTransportOptions } from '@connectrpc/connect-web'
import { type RetryParams } from './rpcInterceptors'

export interface RpcOptions {
    retryParams?: RetryParams
    interceptors?: Interceptor[]
    createConnectTransport?: (options: ConnectTransportOptions) => Transport
}
