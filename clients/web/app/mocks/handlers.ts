import { rest } from 'msw'

export const handlers = [
    rest.get('/mock-endpoint', (req, res, ctx) => {
        const data = { name: 'beavis' }

        return res(ctx.status(200), ctx.json(data))
    }),
]
