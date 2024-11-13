import { Interceptor, Transport } from '@connectrpc/connect'
import { ConnectTransportOptions } from '@connectrpc/connect-web'
import { type RetryParams } from './rpcInterceptors'

export const DEFAULT_RETRY_PARAMS = { maxAttempts: 3, initialRetryDelay: 2000, maxRetryDelay: 6000 }
export const DEFAULT_TIMEOUT_MS = 10000

export interface RpcOptions {
    retryParams?: RetryParams
    interceptors?: Interceptor[]
    defaultTimeoutMs?: number
    createConnectTransport?: (options: ConnectTransportOptions) => Transport
}
