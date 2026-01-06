import { type Interceptor } from '@towns-protocol/rpc-connector/common'
import { type RetryParams } from './rpcInterceptors'

export interface RpcOptions {
    retryParams?: RetryParams
    interceptors?: Interceptor[]
}

// Header name for client version, must match the Go constant RiverClientVersionHeader
export const RIVER_CLIENT_VERSION_HEADER = 'X-River-Client-Version'
