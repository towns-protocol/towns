import { rest } from 'msw'
import { unfurl } from './unfurl'
import { tokenCollections } from './token-collections'
import { env } from '../src/utils'

export const browserHandlers = [
    rest.get('/mock-endpoint', (req, res, ctx) => {
        const data = { name: 'beavis' }
        return res(ctx.status(200), ctx.json(data))
    }),
]

export const testHandlers = [
    ...browserHandlers,
    rest.get(
        `${env.VITE_TOKEN_SERVER_URL || ''}/api/getNftsForOwner/*/*`,
        (req, res, ctx) => {
            const data = tokenCollections()
            return res(ctx.status(200), ctx.json(data))
        },
    ),
    // if dev doesn't have this env var set and starts the app there's a bunch of weird errors in browser
    // even though this mock is only called in tests so defaulting to empty string
    rest.get(env.VITE_UNFURL_SERVER_URL || '', (req, res, ctx) => {
        const urls = req.url.searchParams.getAll('url')
        const data = unfurl(urls)
        return res(ctx.status(200), ctx.json(data))
    }),
]
