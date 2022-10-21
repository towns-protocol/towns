import { ZionServiceInterface, ZionServicePrototype } from '@zion/core'
import axios from 'axios'
import debug from 'debug'
import { JSONRPCClient } from 'json-rpc-2.0'

const log = debug('zion:rpc_client')

// JSONRPCClient needs to know how to send a JSON-RPC request.
// Tell it by passing a function to its constructor. The function must take a JSON-RPC request and send it.
const makeJsonRpcClient = (url: string, controller?: AbortController): JSONRPCClient => {
    log('makeJsonRpcClient', url)
    const client = new JSONRPCClient(async (jsonRPCRequest) => {
        // log(
        //   'Sending JSON-RPC request:\n',
        //   inspect(jsonRPCRequest, { depth: null, colors: true, compact: false }),
        // )
        log('Sending JSON-RPC request:')
        log(jsonRPCRequest)

        try {
            const response = await axios.post(url, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify(jsonRPCRequest),
                signal: controller?.signal,
            })
            log('Received JSON-RPC response:', response.status, response.data.constructor.name)
            log(response.data)

            if (response.status === 200) {
                client.receive(response.data)
            } else if (jsonRPCRequest.id !== undefined) {
                throw new Error(response.statusText)
            }
        } catch (e) {
            log('Received JSON-RPC error:', e)
            throw new Error('Received JSON-RPC error:' + url + ' : ' + e)
        }
    })
    return client
}

export type ZionRpcClient = ZionServiceInterface & {
    rpcClient: JSONRPCClient
    abortController: AbortController
}
export const makeZionRpcClient = (url?: string): ZionRpcClient => {
    log('makeZionRpcClient', url)
    const abortController = new AbortController()
    abortController.signal.addEventListener('abort', () => {
        log('abortController aborted')
    })
    const rpcClient = makeJsonRpcClient(url ?? 'http://localhost/json-rpc', abortController) // TODO: remove test url
    const ss: any = {
        rpcClient,
        abortController,
    }
    Object.getOwnPropertyNames(ZionServicePrototype.prototype).forEach((prop: string) => {
        if (prop === 'constructor') {
            return
        }
        const prev = ss[prop]
        ss[prop] = async (...a: any[]) => {
            //log('Calling', prop, ...a)
            return rpcClient.request('zion_' + prop, ...a)
        }
    })
    return ss as ZionRpcClient
}
