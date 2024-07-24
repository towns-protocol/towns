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
import { notificationServiceLogger, createSubLogger } from '../../logger'
import { createLogger } from '../logger'
import { AnyMessage } from '@bufbuild/protobuf'
import { genShortId, isIConnectError, streamIdAsString } from '@river-build/sdk'

const histogramIntervalMs = 5000

const logger = createLogger('rpcClient')
const histogramLogger = createSubLogger(logger, 'histogram')
const callsLogger = createSubLogger(logger, 'calls')
callsLogger.level = 'silent'
const protoLogger = createSubLogger(logger, 'proto')
protoLogger.level = 'silent'

const sortObjectKey = (obj: Record<string, unknown>) => {
    const sorted: Record<string, unknown> = {}
    Object.keys(obj)
        .sort()
        .forEach((key) => {
            sorted[key] = obj[key]
        })
    return sorted
}

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

const loggingInterceptor: () => Interceptor = () => {
    // Histogram data structure
    const callHistogram: Record<string, { interval: number; total: number; error?: number }> = {}

    // Function to update histogram
    const updateHistogram = (methodName: string, suffix?: string, error?: boolean) => {
        const name = suffix ? `${methodName} ${suffix}` : methodName
        let e = callHistogram[name]
        if (!e) {
            e = { interval: 0, total: 0 }
            callHistogram[name] = e
        }
        e.interval++
        e.total++
        if (error) {
            e.error = (e.error ?? 0) + 1
        }
    }

    // Periodic logging
    setInterval(() => {
        if (Object.keys(callHistogram).length !== 0) {
            let interval = 0
            let total = 0
            let error = 0
            for (const key in callHistogram) {
                const e = callHistogram[key]
                interval += e.interval
                total += e.total
                error += e.error ?? 0
            }
            if (interval > 0) {
                histogramLogger.info(
                    'RPC stats',
                    'interval=',
                    interval,
                    'total=',
                    total,
                    'error=',
                    error,
                    'intervalMs=',
                    histogramIntervalMs,
                    '\n',
                    sortObjectKey(callHistogram),
                )
                for (const key in callHistogram) {
                    callHistogram[key].interval = 0
                }
            }
        }
    }, histogramIntervalMs)

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
                if (streamId !== undefined) {
                    callsLogger.info(req.method.name, streamId, id)
                } else {
                    callsLogger.info(req.method.name, id)
                }
                protoLogger.info(req.method.name, 'REQUEST', id, req.message)
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
                    protoLogger.info(res.method.name, 'RESPONSE', id, res.message)
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
                    logger.error(req.method.name, 'ERROR', id, e)
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
                                args.push(s)
                            }
                        }
                        callsLogger.info(name, 'num=', args.length, id, args)
                    } else {
                        callsLogger.info(name, id)
                    }
                    updateHistogram(name)

                    protoLogger.info(name, 'STREAMING REQUEST', id, m)
                    yield m
                } catch (err) {
                    logger.error(name, 'ERROR YIELDING REQUEST', id, err)
                    updateHistogram(name, undefined, true)
                    throw err
                }
            }
        } catch (err) {
            logger.error(name, 'ERROR STREAMING REQUEST', id, err)
            updateHistogram(name, undefined, true)
            throw err
        }
        protoLogger.info(name, 'STREAMING REQUEST DONE', id)
    }

    async function* logEachResponse(name: string, id: string, stream: AsyncIterable<AnyMessage>) {
        try {
            for await (const m of stream) {
                try {
                    const streamId: string | undefined = m.stream?.nextSyncCookie?.streamId
                    if (streamId !== undefined) {
                        callsLogger.info(name, 'RECV', streamId, id)
                    } else {
                        callsLogger.info(name, 'RECV', id)
                    }
                    updateHistogram(`${name} RECV`, streamId)
                    protoLogger.info(name, 'STREAMING RESPONSE', id, m)
                    yield m
                } catch (err) {
                    logger.error(name, 'ERROR YIELDING RESPONSE', id, err)
                    updateHistogram(`${name} RECV`, undefined, true)
                }
            }
        } catch (err) {
            if (err == 'BLIP') {
                callsLogger.info(name, 'BLIP', id)
                updateHistogram(`${name} BLIP`)
            } else if (err == 'SHUTDOWN') {
                callsLogger.info(name, 'SHUTDOWN', id)
                updateHistogram(`${name} SHUTDOWN`)
            } else {
                const stack = err instanceof Error && 'stack' in err ? err.stack ?? '' : ''
                logger.error(name, 'ERROR STREAMING RESPONSE', id, err, stack)
                updateHistogram(`${name} RECV`, undefined, true)
            }
            throw err
        }
        protoLogger.info(name, 'STREAMING RESPONSE DONE', id)
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
