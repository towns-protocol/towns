import {
    UnaryResponse,
    StreamResponse,
    Interceptor,
    PromiseClient,
    Transport,
    createPromiseClient,
} from '@bufbuild/connect'
import { AnyMessage } from '@bufbuild/protobuf'
import { createConnectTransport } from '@bufbuild/connect-web'
import { StreamService } from '@river/proto'
import { dlog } from './dlog'
import { genShortId } from './id'

const logProtos = dlog('csb:rpc:protos')
const logError = dlog('csb:rpc:error')
logError.enabled = typeof jest === 'undefined'

const interceptor: Interceptor = (next) => async (req) => {
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
        logProtos(req.method.name, 'REQUEST', id, req.message)
    }

    try {
        const res: UnaryResponse<AnyMessage, AnyMessage> | StreamResponse<AnyMessage, AnyMessage> =
            await next(localReq)

        let version = ''
        for (const [key, value] of res.header.entries()) {
            if (key === 'x-http-version') {
                version = value
                break
            }
        }
        if (version !== 'HTTP/2.0') {
            // TODO: add csb:error logger which is always active and use it here
            logError(req.method.name, 'BAD HTTP VERSION', id, version)
        }

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
        logProtos(req.method.name, 'ERROR', id, e)
        throw e
    }
}

async function* logEachRequest(name: string, id: string, stream: AsyncIterable<any>) {
    try {
        for await (const m of stream) {
            try {
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

export function makeStreamRpcClient(dest: Transport | string): PromiseClient<typeof StreamService> {
    let transport: Transport
    if (typeof dest === 'string') {
        transport = createConnectTransport({
            baseUrl: dest,
            useBinaryFormat: true,
            interceptors: [interceptor],
        })
    } else {
        transport = dest
    }

    return createPromiseClient(StreamService, transport)
}

export type StreamRpcClientType = ReturnType<typeof makeStreamRpcClient>
