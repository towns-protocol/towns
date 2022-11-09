import { rest } from 'msw'
import { unfurl } from './unfurl'

export const handlers = [
    rest.get('/mock-endpoint', (req, res, ctx) => {
        const data = { name: 'beavis' }

        return res(ctx.status(200), ctx.json(data))
    }),
    rest.get('/unfurl', (req, res, ctx) => {
        const urls = req.url.searchParams.getAll('url')
        const data = unfurl(urls)
        return res(ctx.status(200), ctx.json(data))
    }),
]
