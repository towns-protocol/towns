import { PromiseClient, createPromiseClient } from '@connectrpc/connect'
import { ConnectTransportOptions, createConnectTransport } from '@connectrpc/connect-web'
import { Err, StreamService } from '@river-build/proto'
import { env } from '../../utils/environment'
import { logger } from '../../logger'

export type StreamRpcClient = PromiseClient<typeof StreamService> & { url?: string }

export function makeStreamRpcClient(): StreamRpcClient {
    const url = env.RIVER_NODE_URL!
    logger.info(`makeStreamRpcClient: Connecting to url=${url}`)
    const options: ConnectTransportOptions = {
        baseUrl: url,
        // interceptors: [retryInterceptor(retryParams), loggingInterceptor(transportId)],
    }
    if (env.RIVER_DEBUG_TRANSPORT !== 'true') {
        options.useBinaryFormat = true
    } else {
        logger.info('makeStreamRpcClient: running in debug mode, using JSON format')
        options.useBinaryFormat = false
        options.jsonOptions = {
            emitDefaultValues: true,
            useProtoFieldName: true,
        }
    }
    const transport = createConnectTransport(options)

    const client: StreamRpcClient = createPromiseClient(StreamService, transport) as StreamRpcClient
    client.url = url
    return client
}

/// check to see of the error message contains an Rrc Err defineded in the protocol.proto
export function errorContains(err: unknown, error: Err): boolean {
    if (err !== null && typeof err === 'object' && 'message' in err) {
        const expected = `${error.valueOf()}:${Err[error]}`
        if ((err.message as string).includes(expected)) {
            return true
        }
    }
    return false
}
