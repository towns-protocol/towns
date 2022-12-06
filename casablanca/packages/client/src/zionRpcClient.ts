import { ZionServiceInterface, ZionServicePrototype } from '@zion/core'
import debug from 'debug'
import { JSONRPCClient } from 'json-rpc-2.0'
import axios from 'axios'
import EventTarget, { setMaxListeners } from 'events'

const log = debug('zion:rpc_client')

// JSONRPCClient needs to know how to send a JSON-RPC request.
// Tell it by passing a function to its constructor. The function must take a JSON-RPC request and send it.
const makeJsonRpcClient = (url: string, controller?: AbortController): JSONRPCClient => {
    log('makeJsonRpcClient', url)
    const client = new JSONRPCClient(async (jsonRPCRequest) => {
        log('Sending JSON-RPC request:')
        log(jsonRPCRequest)

        const response = await axios.post(url, jsonRPCRequest, {
            signal: controller?.signal,
        })

        log('Received JSON-RPC response:', response.status)
        log(response.data)

        if (response.status === 200) {
            client.receive(response.data)
        } else if (response.status !== 204 || jsonRPCRequest.id !== undefined) {
            throw new Error(response.statusText)
        }
    })
    return client
}

export type ZionRpcClient = ZionServiceInterface & {
    rpcClient: JSONRPCClient
    abortController: AbortController

    close(): Promise<void>
}
export const makeZionRpcClient = (url?: string): ZionRpcClient => {
    log('makeZionRpcClient', url)
    const abortController = new AbortController()
    if (abortController.signal instanceof EventTarget) {
        setMaxListeners(200, abortController.signal)
    }
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

    ss.close = async (): Promise<void> => {
        log('closing client')
        rpcClient.rejectAllPendingRequests('Client closed')
        abortController.abort()
        log('client closed')
    }
    return ss as ZionRpcClient
}
