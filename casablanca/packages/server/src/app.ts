import { ZionServiceInterface, ZionServicePrototype } from '@zion/core'
import debug from 'debug'
import { Wallet } from 'ethers'
import express from 'express'
import { JSONRPCServer } from 'json-rpc-2.0'
import { AddressInfo } from 'net'
import { DumbActionGuard } from './dumbActionGuard'
import { ZionServer } from './server'
import { initStorage } from './storage/storage'
import * as http from 'http'

const log_rpc = debug('zion:rpc')
const log_http = debug('zion:http')

export const makeJSONRPCServer = (zionServer: ZionServiceInterface): JSONRPCServer => {
    const server = new JSONRPCServer({
        errorListener: (message: string, data: unknown) => {
            log_http('JSONRPCServer errorListener', message, data)
        },
    })
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
    app.use(express.urlencoded({ extended: true }))
    app.use(express.json({ strict: true }))

    app.post('/json-rpc', async (request, response) => {
        const jsonRPCRequest = request.body
        log_http('Received JSON-RPC request:', jsonRPCRequest)
        const jsonRPCResponse = await server.receive(jsonRPCRequest)
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

export const startZionApp = (port: number, storageType: string) => {
    const wallet = Wallet.createRandom() // TODO: use config
    const store = initStorage(storageType)
    const zionServer = new ZionServer(
        { wallet, creatorAddress: wallet.address },
        store,
        new DumbActionGuard(),
    )
    const express = makeExpressApp(makeJSONRPCServer(zionServer))
    const httpServer = http.createServer(express)
    httpServer.listen(port)
    const addr = httpServer.address() as AddressInfo
    const host = addr.address === '::' ? 'localhost' : addr.address
    const url = `http://${host}:${addr.port}/json-rpc`
    log_http('httpServer ', httpServer.address())
    return {
        wallet,
        express,
        httpServer,
        zionServer,
        url,
        stop: async (): Promise<void> => {
            const p = new Promise<void>((resolve) => {
                httpServer.close(() => {
                    log_http('httpServer closed')
                    resolve()
                })
            })
            await p
            log_http('httpServer close callback done')
            await store.close()
            log_http('storage close done')
        },
    }
}

export type ZionApp = ReturnType<typeof startZionApp>
