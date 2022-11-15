import { rest } from 'msw'
import { unfurl } from './unfurl'

export const browserHandlers = [
    rest.get('/mock-endpoint', (req, res, ctx) => {
        const data = { name: 'beavis' }
        return res(ctx.status(200), ctx.json(data))
    }),

    rest.get(import.meta.env.VITE_UNFURL_SERVER_URL || '', (req, res, ctx) => {
        const urls = req.url.searchParams.getAll('url')
        const data = unfurl(urls)
        return res(ctx.status(200), ctx.json(data))
    }),
]

export const testHandlers = [...browserHandlers]
