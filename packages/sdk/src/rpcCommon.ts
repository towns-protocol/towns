import { type Interceptor } from '@towns-protocol/rpc-connector/common'
import { type RetryParams } from './rpcInterceptors'

export interface RpcOptions {
    retryParams?: RetryParams
    interceptors?: Interceptor[]
}
