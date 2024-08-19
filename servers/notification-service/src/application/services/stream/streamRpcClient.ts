import {
    Code,
    Interceptor,
    PromiseClient,
    StreamRequest,
    StreamResponse,
    UnaryRequest,
    UnaryResponse,
    createPromiseClient,
} from '@connectrpc/connect'
import { ConnectTransportOptions, createConnectTransport } from '@connectrpc/connect-node'
import { Err, StreamService } from '@river-build/proto'
import { env } from '../../utils/environment'
import { notificationServiceLogger } from '../../logger'
import { AnyMessage } from '@bufbuild/protobuf'
import { genShortId, isIConnectError, streamIdAsString } from '@river-build/sdk'

const logger = notificationServiceLogger.child({ label: 'rpcClient' })

export type StreamRpcClient = PromiseClient<typeof StreamService> & { url?: string }

export function makeStreamRpcClient(): StreamRpcClient {
    const url = env.RIVER_NODE_URL!
    notificationServiceLogger.info(`makeStreamRpcClient: Connecting to url=${url}`)
    const options: ConnectTransportOptions = {
        httpVersion: '2',
        baseUrl: url,
        interceptors: [loggingInterceptor()],
    }
    if (!env.RIVER_DEBUG_TRANSPORT) {
        options.useBinaryFormat = true
    } else {
        notificationServiceLogger.info(
            'makeStreamRpcClient: running in debug mode, using JSON format',
        )
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

export const callHistogram: Record<string, { total: number; error?: number }> = {}

const loggingInterceptor: () => Interceptor = () => {
    // Histogram data structure

    // Function to update histogram
    const updateHistogram = (methodName: string, streamId?: string, error?: boolean) => {
        const name = streamId ? `${methodName} ${streamId}` : methodName
        let e = callHistogram[name]
        if (!e) {
            e = { total: 0 }
            callHistogram[name] = e
        }
        e.total++
        if (error) {
            e.error = (e.error ?? 0) + 1
        }
    }

    return (next) =>
        async (
            req: UnaryRequest<AnyMessage, AnyMessage> | StreamRequest<AnyMessage, AnyMessage>,
        ) => {
            let localReq = req
            const id = genShortId()
            localReq.header.set('x-river-request-id', id)

            let streamId: string | undefined
            if (req.stream) {
                // to intercept streaming request messages, we wrap
                // the AsynchronousIterable with a generator function
                localReq = {
                    ...req,
                    message: logEachRequest(req.method.name, id, req.message),
                }
            } else {
                const streamIdBytes = req.message['streamId'] as Uint8Array
                streamId = streamIdBytes ? streamIdAsString(streamIdBytes) : undefined
                logger.info('Unary request', {
                    name: req.method.name,
                    type: 'REQUEST',
                    streamId,
                    id,
                })
            }
            updateHistogram(req.method.name, streamId)

            try {
                const res:
                    | UnaryResponse<AnyMessage, AnyMessage>
                    | StreamResponse<AnyMessage, AnyMessage> = await next(localReq)

                if (res.stream) {
                    // to intercept streaming response messages, we wrap
                    // the AsynchronousIterable with a generator function
                    return {
                        ...res,
                        message: logEachResponse(res.method.name, id, res.message),
                    }
                } else {
                    logger.info('Unary response', {
                        name: res.method.name,
                        type: 'RESPONSE',
                        id,
                        message: res.message,
                        status: res.header.get('status'),
                    })
                }
                return res
            } catch (e) {
                // ignore NotFound errors for GetStream
                if (
                    !(
                        req.method.name === 'GetStream' &&
                        isIConnectError(e) &&
                        e.code === (Code.NotFound as number)
                    )
                ) {
                    logger.error('RPC Error', {
                        name: req.method.name,
                        type: 'ERROR',
                        id,
                        error: e,
                    })
                    updateHistogram(req.method.name, streamId, true)
                }
                throw e
            }
        }
    async function* logEachRequest(name: string, id: string, stream: AsyncIterable<AnyMessage>) {
        try {
            for await (const m of stream) {
                try {
                    const syncPos = m['syncPos']
                    if (syncPos !== undefined) {
                        const args = []
                        for (const p of syncPos) {
                            const s = p['streamId']
                            if (s !== undefined) {
                                args.push(streamIdAsString(s))
                            }
                        }
                        logger.info('Streaming request', {
                            name,
                            length: args.length,
                            id,
                            args,
                            type: 'STREAMING REQUEST',
                        })
                    } else {
                        logger.info('Streaming request', {
                            name,
                            id,
                            type: 'STREAMING REQUEST',
                        })
                    }
                    updateHistogram(name)

                    yield m
                } catch (err) {
                    logger.error('Streaming request error', {
                        name,
                        type: 'STREAMING REQUEST',
                        id,
                        error: err,
                    })
                    updateHistogram(name, undefined, true)
                    throw err
                }
            }
        } catch (err) {
            logger.error('Streaming Request Error', {
                name,
                type: 'STREAMING REQUEST',
                id,
                error: err,
            })
            updateHistogram(name, undefined, true)
            throw err
        }
        logger.info('Streaming request closed', { name, type: 'STREAMING REQUEST', id })
    }

    async function* logEachResponse(name: string, id: string, stream: AsyncIterable<AnyMessage>) {
        try {
            for await (const m of stream) {
                try {
                    const streamId: Uint8Array | undefined = m.stream?.nextSyncCookie?.streamId
                    if (streamId !== undefined) {
                        logger.info('Streaming response', {
                            name,
                            type: 'STREAMING RESPONSE',
                            streamId: streamIdAsString(streamId),
                            id,
                        })
                    } else {
                        logger.info('Streaming response', {
                            name,
                            type: 'STREAMING RESPONSE',
                            id,
                        })
                    }
                    updateHistogram(
                        `${name} RECV`,
                        streamId ? streamIdAsString(streamId) : 'undefined',
                    )
                    yield m
                } catch (err) {
                    logger.error('Streaming Response Error', {
                        name,
                        type: 'STREAMING RESPONSE',
                        id,
                        error: err,
                    })
                    updateHistogram(`${name} RECV`, undefined, true)
                }
            }
        } catch (err) {
            if (err == 'BLIP') {
                logger.info('Streaming Response blip', { name, type: 'BLIP', id })
                updateHistogram(`${name} BLIP`)
            } else if (err == 'SHUTDOWN') {
                logger.info('Streaming Response Shutdown', {
                    name,
                    type: 'STREAMING RESPONSE',
                    id,
                })
                updateHistogram(`${name} SHUTDOWN`)
            } else {
                const stack = err instanceof Error && 'stack' in err ? err.stack ?? '' : ''
                logger.error('Streaming Response Error', {
                    name,
                    type: 'STREAMING RESPONSE',
                    id,
                    error: err,
                    stack,
                })
                updateHistogram(`${name} RECV`, undefined, true)
            }
            throw err
        }
        logger.info('Streaming Response Done', { name, type: 'STREAMING RESPONSE', id })
    }
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
