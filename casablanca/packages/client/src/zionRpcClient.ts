import { ZionServiceInterface, ZionServicePrototype } from '@zion/core'
import debug from 'debug'
import { JSONRPCClient } from 'json-rpc-2.0'

const log = debug('zion:rpc_client')

// JSONRPCClient needs to know how to send a JSON-RPC request.
// Tell it by passing a function to its constructor. The function must take a JSON-RPC request and send it.
const makeJsonRpcClient = (url: string, controller?: AbortController): JSONRPCClient => {
    log('makeJsonRpcClient', url)
    const client = new JSONRPCClient(async (jsonRPCRequest) => {
        if (!jsonRPCRequest) {
            log('JSON-RPC request is empty')

            throw new Error('JSON-RPC request is empty')
        }
        const body = JSON.stringify(jsonRPCRequest)

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body,
                signal: controller?.signal,
            })

            if (response.status === 200) {
                const data = await response.json()
                log('Received JSON-RPC response:', response.status, data)
                client.receive(data)
            } else if (jsonRPCRequest.id !== undefined) {
                throw new Error(response.statusText)
            }
        } catch (e) {
            log('Received JSON-RPC fetch error:', e)
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
