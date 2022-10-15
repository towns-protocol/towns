import { ZionServiceInterface, ZionServicePrototype } from '@zion/core'
import bodyParser from 'body-parser'
import debug from 'debug'
import { Wallet } from 'ethers'
import express from 'express'
import { JSONRPCServer } from 'json-rpc-2.0'
import { AddressInfo } from 'net'
import { DumbActionGuard } from './dumbActionGuard'
import { RedisEventStore } from './redisEventStore'
import { ZionServer } from './server'

const log_rpc = debug('zion:rpc')
const log_http = debug('zion:http')

export const makeJSONRPCServer = (zionServer: ZionServiceInterface): JSONRPCServer => {
    const server = new JSONRPCServer({ errorListener: () => {} })
    // Iterate through all methods on the service and add them to the JSONRPCServer with zion_ prefix
    Object.getOwnPropertyNames(ZionServicePrototype.prototype).forEach((method: string) => {
        if (method === 'constructor') {
            return
        }
        server.addMethod('zion_' + method, async (params) => {
            log_rpc('Calling', method, 'params', params)
            try {
                const ret = await Reflect.apply((zionServer as any)[method], zionServer, [params])
                log_rpc('Returning', method, ret)
                return ret
            } catch (e: any) {
                log_rpc('Returning error', method, e?.message ?? e)
                throw e
            }
        })
    })
    return server
}

export const makeExpressApp = (server: JSONRPCServer) => {
    const app = express()
    app.use(bodyParser.json())

    app.post('/json-rpc', async (request, response) => {
        const jsonRPCRequest = request.body.body
        log_http('Received JSON-RPC request:', jsonRPCRequest)
        const jsonRPCResponse = await server.receiveJSON(jsonRPCRequest)
        log_http('Sending JSON-RPC response:', jsonRPCResponse)
        if (jsonRPCResponse) {
            response.json(jsonRPCResponse)
        } else {
            // If response is absent, it was a JSON-RPC notification method.
            // Respond with no content status (204).
            response.sendStatus(204)
        }
    })
    return app
}

export const startZionApp = (port: number) => {
    const wallet = Wallet.createRandom() // TODO: use config
    const store = new RedisEventStore()
    const zionServer = new ZionServer(wallet, store, new DumbActionGuard())
    const express = makeExpressApp(makeJSONRPCServer(zionServer))
    const appServer = express.listen(port)
    const addr = appServer.address() as AddressInfo
    const url = `http://[${addr.address}]:${addr.port}/json-rpc`
    return {
        wallet,
        express,
        appServer,
        zionServer,
        url,
        stop: async (): Promise<void> => {
            appServer.close()
            await store.close()
        },
    }
}

export type ZionApp = ReturnType<typeof startZionApp>
