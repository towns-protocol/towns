import { Interceptor, PromiseClient, Transport, createPromiseClient } from '@bufbuild/connect'

import { createConnectTransport } from '@bufbuild/connect-web'
import { StreamService } from '@river/proto'
import { dlog } from './dlog'

const logProtos = dlog('csb:rpc:protos')

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

    try {
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
    } catch (e) {
        logProtos(req.method.name, 'ERROR', e)
        throw e
    }
}

async function* logEachRequest(name: string, stream: AsyncIterable<any>) {
    for await (const m of stream) {
        logProtos(name, 'STREAMING REQUEST', m)
        yield m
    }
    logProtos(name, 'STEAMING DONE')
}

async function* logEachResponse(name: string, stream: AsyncIterable<any>) {
    for await (const m of stream) {
        logProtos(name, 'STEAMING RESPONSE', m)
        yield m
    }
    logProtos(name, 'STEAMING DONE')
}

export function makeStreamRpcClient(dest: Transport | string): PromiseClient<typeof StreamService> {
    let transport: Transport
    if (typeof dest === 'string') {
        transport = createConnectTransport({
            baseUrl: dest,
            useBinaryFormat: true,
            interceptors: [logger],
        })
    } else {
        transport = dest
    }

    return createPromiseClient(StreamService, transport)
}

export type StreamRpcClientType = ReturnType<typeof makeStreamRpcClient>
