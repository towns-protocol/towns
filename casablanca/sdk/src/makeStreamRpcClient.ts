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

const logCallsHistogram = dlog('csb:rpc:callsHistogram', { defaultEnabled: true })
const logCalls = dlog('csb:rpc:calls')
const logProtos = dlog('csb:rpc:protos')
const logError = dlogError('csb:rpc:error')

const interceptor: (transportId: string) => Interceptor = (transportId: string) => {
    // Histogram data structure
    let callHistogram: Record<string, number> = {}

    // Function to update histogram
    const updateHistogram = (methodName: string) => {
        if (!callHistogram[methodName]) {
            callHistogram[methodName] = 0
        }
        callHistogram[methodName]++
    }

    // Periodic logging
    setInterval(() => {
        if (Object.keys(callHistogram).length !== 0) {
            logCallsHistogram(`callHistogram for transportId: ${transportId}:`, callHistogram)
            callHistogram = {}
        }
    }, 5000) // 10 seconds

    return (next) =>
        async (
            req: UnaryRequest<AnyMessage, AnyMessage> | StreamRequest<AnyMessage, AnyMessage>,
        ) => {
            let localReq = req
            const id = genShortId()
            localReq.header.set('x-river-request-id', id)

            if (req.stream) {
                // to intercept streaming request messages, we wrap
                // the AsynchronousIterable with a generator function
                localReq = {
                    ...req,
                    message: logEachRequest(req.method.name, id, req.message),
                }
            } else {
                const streamId = req.message['streamId']
                if (streamId !== undefined) {
                    updateHistogram(`${req.method.name} ${streamId}`)
                    logCalls(req.method.name, streamId, id)
                } else {
                    updateHistogram(`${req.method.name} undefined`)
                    logCalls(req.method.name, id)
                }
                logProtos(req.method.name, 'REQUEST', id, req.message)
            }

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

                        updateHistogram(`${name} 'num=' ${args.length}`)
                        logCalls(name, 'num=', args.length, id, args)
                    } else {
                        updateHistogram(`${name} 'num=' ${0}`)
                        logCalls(name, id)
                    }

                    logProtos(name, 'STREAMING REQUEST', id, m)
                    yield m
                } catch (err) {
                    logError(name, 'ERROR YIELDING REQUEST', id, err)
                    throw err
                }
            }
        } catch (err) {
            logError(name, 'ERROR STREAMING REQUEST', id, err)
            throw err
        }
        logProtos(name, 'STREAMING REQUEST DONE', id)
    }

    async function* logEachResponse(name: string, id: string, stream: AsyncIterable<any>) {
        try {
            for await (const m of stream) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    const streamId = m.stream?.nextSyncCookie?.streamId
                    if (streamId !== undefined) {
                        updateHistogram(`${name} ' RECV ' ${streamId}`)
                        logCalls(name, 'RECV', streamId, id)
                    } else {
                        updateHistogram(`${name} ' RECV ' undefined`)
                        logCalls(name, 'RECV', id)
                    }
                    logProtos(name, 'STREAMING RESPONSE', id, m)
                    yield m
                } catch (err) {
                    logError(name, 'ERROR YIELDING RESPONSE', id, err)
                }
            }
        } catch (err) {
            if (err !== 'BLIP' && err !== 'SHUTDOWN') {
                const stack = err instanceof Error && 'stack' in err ? err.stack ?? '' : ''
                logError(name, 'ERROR STREAMING RESPONSE', id, err, stack)
            }
            throw err
        }
        logProtos(name, 'STREAMING RESPONSE DONE', id)
    }
}

export function makeStreamRpcClient(dest: Transport | string): PromiseClient<typeof StreamService> {
    const transportId = genShortId()
    logCallsHistogram(`makeStreamRpcClient: ${transportId}`)
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
