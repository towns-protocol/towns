import { Interceptor, PromiseClient, Transport, createPromiseClient } from '@bufbuild/connect'

import { createConnectTransport } from '@bufbuild/connect-web'
import debug from 'debug'
import { StreamService } from './gen/protocol_connect'

const logProtos = debug('csb:rpc_client:protos')

const logger: Interceptor = (next) => async (req) => {
    let localRes = req
    if (logProtos.enabled) {
        if (req.stream) {
            // to intercept streaming request messages, we wrap
            // the AsynchronousIterable with a generator function
            localRes = {
                ...req,
                message: logEachRequest(req.message),
            }
        } else {
            logProtos('request:', req.message)
        }
    }

    const res = await next(localRes)
    if (logProtos.enabled) {
        if (res.stream) {
            // to intercept streaming response messages, we wrap
            // the AsynchronousIterable with a generator function
            return {
                ...res,
                message: logEachResponse(res.message),
            }
        } else {
            logProtos('response:', res.message)
        }
    }
    return res
}

async function* logEachRequest(stream: AsyncIterable<any>) {
    for await (const m of stream) {
        logProtos('request received:', m)
        yield m
    }
}

async function* logEachResponse(stream: AsyncIterable<any>) {
    for await (const m of stream) {
        logProtos('response received:', m)
        yield m
    }
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
