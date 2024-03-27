import { rest } from 'msw'
import { unfurl } from './unfurl'
import {
    getContractMetadataAcrossNetworksMock,
    getContractMetadataMock,
    tokenCollections,
} from './token-collections'
import { env } from '../src/utils'

export const browserHandlers = [
    rest.get('/mock-endpoint', (req, res, ctx) => {
        const data = { name: 'beavis' }
        return res(ctx.status(200), ctx.json(data))
    }),
]

export const testHandlers = [
    ...browserHandlers,
    // TOKEN WORKER ///////////////
    rest.options(
        `${env.VITE_TOKEN_SERVER_URL || ''}/api/*
    `,
        (_, res, ctx) => res(ctx.status(200), ctx.json({})),
    ),

    rest.get(`${env.VITE_TOKEN_SERVER_URL || ''}/api/getCollectionsForOwner/*`, (req, res, ctx) => {
        const data = tokenCollections()
        return res(ctx.status(200), ctx.json(data))
    }),

    rest.get(`${env.VITE_TOKEN_SERVER_URL || ''}/api/getCollectionMetadata/*`, (req, res, ctx) => {
        const address = req.url.searchParams.get('contractAddress')
        if (!address) {
            throw new Error('no address provided')
        }
        const data = getContractMetadataMock[address]
        return res(ctx.status(200), ctx.json(data))
    }),

    rest.get(
        `${env.VITE_TOKEN_SERVER_URL || ''}/api/getCollectionMetadataAcrossNetworks/*`,
        (req, res, ctx) => {
            const address = req.url.searchParams.get('contractAddress')
            if (!address) {
                throw new Error('no address provided')
            }
            const data = getContractMetadataAcrossNetworksMock[address]
            return res(ctx.status(200), ctx.json([data]))
        },
    ),
    // END TOKEN WORKER ///////////////

    // GATEWAY WORKER ///////////////

    rest.get(`${env.VITE_GATEWAY_URL || ''}/space/*/identity`, (req, res, ctx) => {
        if (req.url.toString().includes('no-topic')) {
            return res(ctx.status(404))
        }

        const data = { motto: 'my motto', bio: 'my special space' }
        return res(ctx.status(200), ctx.json(data))
    }),

    rest.post(`${env.VITE_GATEWAY_URL || ''}/space/*/identity`, (req, res, ctx) => {
        const data = 'imageor whatever'
        return res(ctx.status(200), ctx.json(data))
    }),
    // END GATEWAY WORKER ///////////////

    // if dev doesn't have this env var set and starts the app there's a bunch of weird errors in browser
    // even though this mock is only called in tests so defaulting to empty string
    rest.get(env.VITE_UNFURL_SERVER_URL || '', (req, res, ctx) => {
        const urls = req.url.searchParams.getAll('url')
        const data = unfurl(urls)
        return res(ctx.status(200), ctx.json(data))
    }),

    // @coinbase/wallet-sdk via rainbowkit, not necessary, just reducing noise in logs
    rest.get('https://www.walletlink.org/rpc', (_req, res, ctx) => {
        return res(ctx.status(200), ctx.json('empty'))
    }),
    rest.post('https://rpc.ankr.com/eth_sepolia', (_req, res, ctx) => {
        return res(ctx.status(200), ctx.json('empty'))
    }),
    rest.post('http://localhost:8545/', (_req, res, ctx) => {
        return res(ctx.status(200), ctx.json('empty'))
    }),
    rest.post('http://127.0.0.1:8545/', (_req, res, ctx) => {
        return res(ctx.status(200), ctx.json('empty'))
    }),
]
