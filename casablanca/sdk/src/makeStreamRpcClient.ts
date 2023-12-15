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
import { Err, StreamService } from '@river/proto'
import { dlog, dlogError } from './dlog'
import { genShortId } from './id'
import { isIConnectError } from './utils'

const logInfo = dlog('csb:rpc:info', { defaultEnabled: true })
const logCallsHistogram = dlog('csb:rpc:histogram', { defaultEnabled: true })
const logCalls = dlog('csb:rpc:calls')
const logProtos = dlog('csb:rpc:protos')
const logError = dlogError('csb:rpc:error')

let nextRpcClientNum = 0
const histogramIntervalMs = 5000

export const sortObjectKey = (obj: Record<string, any>) => {
    const sorted: Record<string, any> = {}
    Object.keys(obj)
        .sort()
        .forEach((key) => {
            sorted[key] = obj[key]
        })
    return sorted
}

const interceptor: (transportId: number) => Interceptor = (transportId: number) => {
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
                logCallsHistogram(
                    'RPC stats for transportId=',
                    transportId,
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
                // ignore NotFound errors for GetStream
                if (
                    !(
                        req.method.name === 'GetStream' &&
                        isIConnectError(e) &&
                        e.code === Number(Err.NOT_FOUND)
                    )
                ) {
                    logError(req.method.name, 'ERROR', id, e)
                    updateHistogram(req.method.name, streamId, true)
                }
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

/// not great way to pull info out of the error messsage
export function getRpcErrorProperty(err: unknown, prop: string): string | undefined {
    if (err !== null && typeof err === 'object' && 'message' in err) {
        const expected = `${prop} = `
        const parts = (err.message as string).split(expected)
        if (parts.length === 2) {
            return parts[1].split(' ')[0].trim()
        }
    }
    return undefined
}

const randomUrlSelector = (urls: string) => {
    const u = urls.split(',')
    if (u.length === 0) {
        throw new Error('No urls for backend provided')
    } else if (u.length === 1) {
        return u[0]
    } else {
        return u[Math.floor(Math.random() * u.length)]
    }
}

export type StreamRpcClient = PromiseClient<typeof StreamService> & { url?: string }

export function makeStreamRpcClient(dest: Transport | string): StreamRpcClient {
    const transportId = nextRpcClientNum++
    logCallsHistogram('makeStreamRpcClient, transportId =', transportId)
    let transport: Transport
    let url: string | undefined
    if (typeof dest === 'string') {
        url = randomUrlSelector(dest)
        logInfo('makeStreamRpcClient: Connecting to url=', url, ' allUrls=', dest)
        transport = createConnectTransport({
            baseUrl: url,
            useBinaryFormat: true,
            interceptors: [interceptor(transportId)],
        })
    } else {
        logInfo('makeStreamRpcClient: Connecting to provided transport')
        transport = dest
    }

    const client: StreamRpcClient = createPromiseClient(StreamService, transport) as StreamRpcClient
    client.url = url
    return client
}

export type StreamRpcClientType = ReturnType<typeof makeStreamRpcClient>
