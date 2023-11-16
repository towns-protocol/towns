import {
    UnaryResponse,
    StreamResponse,
    Interceptor,
    PromiseClient,
    Transport,
    createPromiseClient,
    UnaryRequest,
    StreamRequest,
} from '@connectrpc/connect'
import { AnyMessage } from '@bufbuild/protobuf'
import { createConnectTransport } from '@connectrpc/connect-web'
import { StreamService } from '@river/proto'
import { dlog, dlogError } from './dlog'
import { genShortId } from './id'

const logCallsHistogram = dlog('csb:rpc:histogram', { defaultEnabled: true })
const logCalls = dlog('csb:rpc:calls')
const logProtos = dlog('csb:rpc:protos')
const logError = dlogError('csb:rpc:error')

let nextRpcClientNum = 0
const histogramIntervalMs = 5000

const sortObjectKey = (obj: Record<string, any>) => {
    const sorted: Record<string, any> = {}
    Object.keys(obj)
        .sort()
        .forEach((key) => {
            sorted[key] = obj[key]
        })
    return sorted
}

const interceptor: (transportId: string) => Interceptor = (transportId: string) => {
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
            logCallsHistogram(
                'RPC stats for transportId=',
                transportId,
                'intervalMs=',
                histogramIntervalMs,
                sortObjectKey(callHistogram),
            )
            for (const key in callHistogram) {
                callHistogram[key].interval = 0
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
                streamId = req.message['streamId']
                if (streamId !== undefined) {
                    logCalls(req.method.name, streamId, id)
                } else {
                    logCalls(req.method.name, id)
                }
                logProtos(req.method.name, 'REQUEST', id, req.message)
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
                    logProtos(res.method.name, 'RESPONSE', id, res.message)
                }
                return res
            } catch (e) {
                logError(req.method.name, 'ERROR', id, e)
                updateHistogram(req.method.name, streamId, true)
                throw e
            }
        }
    async function* logEachRequest(name: string, id: string, stream: AsyncIterable<any>) {
        try {
            for await (const m of stream) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    const syncPos = m['syncPos']
                    if (syncPos !== undefined) {
                        const args = []
                        for (const p of syncPos) {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            const s = p['streamId']
                            if (s !== undefined) {
                                args.push(s)
                            }
                        }
                        logCalls(name, 'num=', args.length, id, args)
                    } else {
                        logCalls(name, id)
                    }
                    updateHistogram(name)

                    logProtos(name, 'STREAMING REQUEST', id, m)
                    yield m
                } catch (err) {
                    logError(name, 'ERROR YIELDING REQUEST', id, err)
                    updateHistogram(name, undefined, true)
                    throw err
                }
            }
        } catch (err) {
            logError(name, 'ERROR STREAMING REQUEST', id, err)
            updateHistogram(name, undefined, true)
            throw err
        }
        logProtos(name, 'STREAMING REQUEST DONE', id)
    }

    async function* logEachResponse(name: string, id: string, stream: AsyncIterable<any>) {
        try {
            for await (const m of stream) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    const streamId: string | undefined = m.stream?.nextSyncCookie?.streamId
                    if (streamId !== undefined) {
                        logCalls(name, 'RECV', streamId, id)
                    } else {
                        logCalls(name, 'RECV', id)
                    }
                    updateHistogram(`${name} RECV`, streamId)
                    logProtos(name, 'STREAMING RESPONSE', id, m)
                    yield m
                } catch (err) {
                    logError(name, 'ERROR YIELDING RESPONSE', id, err)
                    updateHistogram(`${name} RECV`, undefined, true)
                }
            }
        } catch (err) {
            if (err == 'BLIP') {
                logCalls(name, 'BLIP', id)
                updateHistogram(`${name} BLIP`)
            } else if (err == 'SHUTDOWN') {
                logCalls(name, 'SHUTDOWN', id)
                updateHistogram(`${name} SHUTDOWN`)
            } else {
                const stack = err instanceof Error && 'stack' in err ? err.stack ?? '' : ''
                logError(name, 'ERROR STREAMING RESPONSE', id, err, stack)
                updateHistogram(`${name} RECV`, undefined, true)
            }
            throw err
        }
        logProtos(name, 'STREAMING RESPONSE DONE', id)
    }
}

export function makeStreamRpcClient(dest: Transport | string): PromiseClient<typeof StreamService> {
    const transportId = `${nextRpcClientNum++}`
    logCallsHistogram('makeStreamRpcClient, transportId =', transportId)
    let transport: Transport
    if (typeof dest === 'string') {
        transport = createConnectTransport({
            baseUrl: dest,
            useBinaryFormat: true,
            interceptors: [interceptor(transportId)],
        })
    } else {
        transport = dest
    }

    return createPromiseClient(StreamService, transport)
}

export type StreamRpcClientType = ReturnType<typeof makeStreamRpcClient>
