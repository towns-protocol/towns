import type { AnyMessage, Message } from '@bufbuild/protobuf'
import {
    type Interceptor,
    type UnaryRequest,
    type StreamRequest,
    type UnaryResponse,
    type StreamResponse,
    Code,
} from '@connectrpc/connect'
import { Err } from '@river-build/proto'
import { genShortId, streamIdAsString } from './id'
import { isBaseUrlIncluded, isIConnectError } from './utils'
import { dlog, dlogError, check } from '@river-build/dlog'

export const DEFAULT_RETRY_PARAMS: RetryParams = {
    maxAttempts: 3,
    initialRetryDelay: 2000,
    maxRetryDelay: 6000,
    defaultTimeoutMs: 30000, // 30 seconds for long running requests
}

export type RetryParams = {
    maxAttempts: number
    initialRetryDelay: number
    maxRetryDelay: number
    defaultTimeoutMs: number
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

const logCallsHistogram = dlog('csb:rpc:histogram')
const logCalls = dlog('csb:rpc:calls')
const logProtos = dlog('csb:rpc:protos')
const logError = dlogError('csb:rpc:error')
const histogramIntervalMs = 5000

export const retryInterceptor: (retryParams: RetryParams) => Interceptor = (
    retryParams: RetryParams,
) => {
    return (next) =>
        async (
            req: UnaryRequest<AnyMessage, AnyMessage> | StreamRequest<AnyMessage, AnyMessage>,
        ) => {
            if (req.stream) {
                return await next(req)
            }
            const requestStart = Date.now()
            let attempt = 0
            const id = req.header.get('x-river-request-id')
            if (!id) {
                throw new Error(
                    'No request id, expected header x-river-request-id which is set by loggingInterceptor',
                )
            }
            const orignalAbortSignal = req.signal
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const loopStart = Date.now()
                const abortController = new AbortController()
                const signal = abortController.signal
                const originalAbortHandler = () => {
                    const elapsed = Date.now() - requestStart
                    logError(
                        'Orignial request aborted in retryInterceptor',
                        'rpc:',
                        req.method.name,
                        id,
                        'elapsed=',
                        elapsed,
                    )
                    abortController.abort()
                }
                // listen to the original abort signal and abort the request if it's aborted
                orignalAbortSignal?.addEventListener('abort', originalAbortHandler)
                // set a timeout on the request
                const requestTimeoutId = setTimeout(() => {
                    const elapsed = Date.now() - loopStart
                    logError(
                        'Request timed out in retryInterceptor',
                        'rpc:',
                        req.method.name,
                        id,
                        'elapsed=',
                        elapsed,
                    )
                    abortController.abort({
                        message: 'The operation was aborted.',
                        name: 'AbortError',
                    })
                }, retryParams.defaultTimeoutMs)

                attempt++
                try {
                    // Clone the request before each attempt
                    const clonedReq = cloneUnaryRequest(req, signal)
                    return await next(clonedReq)
                } catch (e) {
                    const elapsed = Date.now() - loopStart
                    const retryDelay = getRetryDelay(e, signal.aborted, attempt, retryParams)
                    // if the request was aborted, or we've run out of retries, throw the error
                    if (orignalAbortSignal.aborted || retryDelay <= 0) {
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
                        'ERROR RETRYING',
                        'rpc:',
                        req.method.name,
                        id,
                        'attempt=',
                        attempt,
                        'of',
                        retryParams.maxAttempts,
                        'elapsed:',
                        elapsed,
                        'retryDelay:',
                        retryDelay,
                        'error:',
                        e,
                    )
                    await new Promise((resolve) => setTimeout(resolve, retryDelay))
                } finally {
                    clearTimeout(requestTimeoutId)
                    orignalAbortSignal?.removeEventListener('abort', originalAbortHandler)
                }
            }
        }
}

export const expiryInterceptor = (opts: { onTokenExpired?: () => void }): Interceptor => {
    return (next) => async (req) => {
        try {
            const res = await next(req)
            return res
        } catch (e) {
            if (e instanceof Error && e.message.includes('event delegate has expired')) {
                opts.onTokenExpired?.()
            }
            throw e
        }
    }
}

export const setHeaderInterceptor: (headers: Record<string, string>) => Interceptor = (
    headers: Record<string, string>,
) => {
    return (next) => (req) => {
        for (const [key, value] of Object.entries(headers)) {
            req.header.set(key, value)
        }
        return next(req)
    }
}

export const loggingInterceptor: (transportId: number, serviceName?: string) => Interceptor = (
    transportId: number,
    serviceName?: string,
) => {
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
                    'RPC stats for service=',
                    serviceName ?? 'default',
                    ' transportId=',
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
                    logError('ERROR calling rpc:', req.method.name, id, e)
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

export function getRetryDelayMs(attempts: number, retryParams: RetryParams): number {
    return Math.min(
        retryParams.maxRetryDelay,
        retryParams.initialRetryDelay * Math.pow(2, attempts),
    )
}

function getRetryDelay(
    error: unknown,
    didTimeout: boolean,
    attempts: number,
    retryParams: RetryParams,
): number {
    check(attempts >= 1, 'attempts must be >= 1')
    // aellis wondering if we should retry forever if there's no internet connection
    if (attempts > retryParams.maxAttempts) {
        return -1 // no more attempts
    }
    const retryDelay = getRetryDelayMs(attempts, retryParams)

    if (didTimeout) {
        return retryDelay
    }

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
        } else if (errorContains(error, Err.DB_OPERATION_FAILURE)) {
            return retryDelay
        } else if (errorContains(error, Err.DEADLINE_EXCEEDED)) {
            return retryDelay
        }
    }

    if (isIConnectError(error)) {
        if (
            error.code === (Code.DeadlineExceeded as number) ||
            error.code === (Code.Unavailable as number) ||
            error.code === (Code.ResourceExhausted as number)
        ) {
            // handle deadline_exceeded errors
            return retryDelay
        }
    }

    return -1
}

// Function to clone a UnaryRequest
function cloneUnaryRequest<I extends Message<I>, O extends Message<O>>(
    req: UnaryRequest<I, O>,
    signal: AbortSignal,
): UnaryRequest<I, O> {
    // Clone the message
    const clonedMessage = req.message.clone()

    // Clone headers
    const clonedHeader = new Headers(req.header)

    // Clone init
    const clonedInit = { ...req.init }

    // Clone contextValues
    const clonedContextValues = { ...req.contextValues }

    // Return a new UnaryRequest with cloned properties
    return {
        ...req,
        message: clonedMessage,
        header: clonedHeader,
        init: clonedInit,
        contextValues: clonedContextValues,
        signal: signal,
    }
}
