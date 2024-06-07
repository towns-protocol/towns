import {
    UnaryResponse,
    StreamResponse,
    Interceptor,
    PromiseClient,
    Transport,
    createPromiseClient,
    UnaryRequest,
    StreamRequest,
    Code,
} from '@connectrpc/connect'
import { AnyMessage } from '@bufbuild/protobuf'
import { ConnectTransportOptions, createConnectTransport } from '@connectrpc/connect-web'
import { Err, StreamService } from '@river-build/proto'
import { check, dlog, dlogError } from '@river-build/dlog'
import { genShortId, streamIdAsString } from './id'
import { getEnvVar, isBaseUrlIncluded, isIConnectError } from './utils'

const logInfo = dlog('csb:rpc:info')
const logCallsHistogram = dlog('csb:rpc:histogram')
const logCalls = dlog('csb:rpc:calls')
const logProtos = dlog('csb:rpc:protos')
const logError = dlogError('csb:rpc:error')

let nextRpcClientNum = 0
const histogramIntervalMs = 5000

export type RetryParams = {
    maxAttempts: number
    initialRetryDelay: number
    maxRetryDelay: number
    refreshNodeUrl?: () => Promise<string>
}

const sortObjectKey = (obj: Record<string, any>) => {
    const sorted: Record<string, any> = {}
    Object.keys(obj)
        .sort()
        .forEach((key) => {
            sorted[key] = obj[key]
        })
    return sorted
}

const retryInterceptor: (retryParams: RetryParams) => Interceptor = (retryParams: RetryParams) => {
    return (next) =>
        async (
            req: UnaryRequest<AnyMessage, AnyMessage> | StreamRequest<AnyMessage, AnyMessage>,
        ) => {
            let attempt = 0
            // eslint-disable-next-line no-constant-condition
            while (true) {
                attempt++
                try {
                    return await next(req)
                } catch (e) {
                    const retryDelay = getRetryDelay(e, attempt, retryParams)
                    if (retryDelay <= 0) {
                        throw e
                    }
                    if (retryParams.refreshNodeUrl) {
                        // re-materialize view and check if client is still operational according to network
                        const urls = await retryParams.refreshNodeUrl()
                        const isStillNodeUrl = isBaseUrlIncluded(urls.split(','), req.url)
                        if (!isStillNodeUrl) {
                            throw new Error(`Node url ${req.url} no longer operationl in registry`)
                        }
                    }
                    logError(
                        req.method.name,
                        'ERROR RETRYING',
                        attempt,
                        'of',
                        retryParams.maxAttempts,
                        'retryDelay:',
                        retryDelay,
                        'error:',
                        e,
                    )
                    await new Promise((resolve) => setTimeout(resolve, retryDelay))
                }
            }
        }
}

const loggingInterceptor: (transportId: number) => Interceptor = (transportId: number) => {
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
                const streamIdBytes = req.message['streamId'] as Uint8Array
                streamId = streamIdBytes ? streamIdAsString(streamIdBytes) : undefined
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
                        e.code === (Code.NotFound as number)
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

function getRetryDelay(error: unknown, attempts: number, retryParams: RetryParams): number {
    check(attempts >= 1, 'attempts must be >= 1')
    // aellis wondering if we should retry forever if there's no internet connection
    if (attempts > retryParams.maxAttempts) {
        return -1 // no more attempts
    }
    const retryDelay = Math.min(
        retryParams.maxRetryDelay,
        retryParams.initialRetryDelay * Math.pow(2, attempts),
    )
    // we don't get a lot of info off of these errors... retry the ones that we know we need to
    if (error !== null && typeof error === 'object') {
        if ('message' in error) {
            // this happens in the tests when the server is totally down
            if ((error.message as string).toLowerCase().includes('fetch failed')) {
                return retryDelay
            }
            // this happens in the browser when the server is totally down
            if ((error.message as string).toLowerCase().includes('failed to fetch')) {
                return retryDelay
            }
        }

        // we can't use the code for anything above 16 cause the connect lib squashes it and returns 2
        // see protocol.proto for description of error codes
        if (errorContains(error, Err.RESOURCE_EXHAUSTED)) {
            return retryDelay
        } else if (errorContains(error, Err.DEBUG_ERROR)) {
            return retryDelay
        }
    }
    return -1
}

export type StreamRpcClient = PromiseClient<typeof StreamService> & { url?: string }

export function makeStreamRpcClient(
    dest: Transport | string,
    retryParams: RetryParams = { maxAttempts: 3, initialRetryDelay: 2000, maxRetryDelay: 6000 },
    refreshNodeUrl?: () => Promise<string>,
): StreamRpcClient {
    const transportId = nextRpcClientNum++
    logCallsHistogram('makeStreamRpcClient, transportId =', transportId)
    let transport: Transport
    let url: string | undefined
    if (typeof dest === 'string') {
        url = randomUrlSelector(dest)
        logInfo('makeStreamRpcClient: Connecting to url=', url, ' allUrls=', dest)
        const options: ConnectTransportOptions = {
            baseUrl: url,
            interceptors: [
                retryInterceptor({ ...retryParams, refreshNodeUrl }),
                loggingInterceptor(transportId),
            ],
        }
        if (getEnvVar('RIVER_DEBUG_TRANSPORT') !== 'true') {
            options.useBinaryFormat = true
        } else {
            logInfo('makeStreamRpcClient: running in debug mode, using JSON format')
            options.useBinaryFormat = false
            options.jsonOptions = {
                emitDefaultValues: true,
                useProtoFieldName: true,
            }
        }
        transport = createConnectTransport(options)
    } else {
        logInfo('makeStreamRpcClient: Connecting to provided transport')
        transport = dest
    }

    const client: StreamRpcClient = createPromiseClient(StreamService, transport) as StreamRpcClient
    client.url = url
    return client
}

export type StreamRpcClientType = StreamRpcClient
