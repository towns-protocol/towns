import { Interceptor, PromiseClient, Transport, createPromiseClient } from '@bufbuild/connect'

import { createConnectTransport } from '@bufbuild/connect-web'
import { StreamService } from '@river/proto'
import { dlog } from './dlog'

const logProtos = dlog('csb:rpc:protos')
const logError = dlog('csb:rpc:error')
logError.enabled = typeof jest !== 'undefined' ? true : false

const logErrorInterceptor: Interceptor = (next) => async (req) => {
    try {
        let localReq = req
        if (req.stream) {
            // to intercept streaming request messages, we wrap
            // the AsynchronousIterable with a generator function
            localReq = {
                ...req,
                message: logErrorEachRequest(req.method.name, req.message),
            }
        }
        const res = await next(localReq)

        if (res.stream) {
            // to intercept streaming response messages, we wrap
            // the AsynchronousIterable with a generator function
            return {
                ...res,
                message: logErrorEachResponse(res.method.name, res.message),
            }
        }
        return res
    } catch (err) {
        logError(req.method.name, 'ERROR MAKING FETCH', err)
        throw err
    }
}

async function* logErrorEachRequest(name: string, stream: AsyncIterable<any>) {
    try {
        for await (const m of stream) {
            try {
                yield m
            } catch (err) {
                logError(name, 'ERROR YIELDING REQUEST', err)
                throw err
            }
        }
    } catch (err) {
        logError(name, 'ERROR STREAMING REQUEST', err)
        throw err
    }
}

async function* logErrorEachResponse(name: string, stream: AsyncIterable<any>) {
    try {
        for await (const m of stream) {
            try {
                yield m
            } catch (err) {
                logError(name, 'ERROR YIELDING RESPONSE', err)
            }
        }
    } catch (err) {
        const where = new Error().stack?.toString()
        if (err !== 'BLIP' && err !== 'SHUTDOWN') {
            logError(name, 'ERROR STREAMING RESPONSE2', where, err)
        }
        throw err
    }
}

const logger: Interceptor = (next) => async (req) => {
    let localRes = req
    if (logProtos.enabled) {
        if (req.stream) {
            // to intercept streaming request messages, we wrap
            // the AsynchronousIterable with a generator function
            localRes = {
                ...req,
                message: logEachRequest(req.method.name, req.message),
            }
        } else {
            logProtos(req.method.name, 'REQUEST', req.message)
        }
    }

    const res = await next(localRes)

    if (logProtos.enabled) {
        if (res.stream) {
            // to intercept streaming response messages, we wrap
            // the AsynchronousIterable with a generator function
            return {
                ...res,
                message: logEachResponse(res.method.name, res.message),
            }
        } else {
            logProtos(res.method.name, 'RESPONSE', res.message)
        }
    }
    return res
}

async function* logEachRequest(name: string, stream: AsyncIterable<any>) {
    for await (const m of stream) {
        logProtos(name, 'STREAMING REQUEST', m)
        yield m
    }
    logProtos(name, 'STREAMING REQUEST DONE')
}

async function* logEachResponse(name: string, stream: AsyncIterable<any>) {
    for await (const m of stream) {
        logProtos(name, 'STREAMING RESPONSE', m)
        yield m
    }
    logProtos(name, 'STREAMING RESPONSE DONE')
}

export function makeStreamRpcClient(dest: Transport | string): PromiseClient<typeof StreamService> {
    let transport: Transport
    if (typeof dest === 'string') {
        transport = createConnectTransport({
            baseUrl: dest,
            useBinaryFormat: true,
            interceptors: [logErrorInterceptor, logger],
        })
    } else {
        transport = dest
    }

    return createPromiseClient(StreamService, transport)
}

export type StreamRpcClientType = ReturnType<typeof makeStreamRpcClient>
