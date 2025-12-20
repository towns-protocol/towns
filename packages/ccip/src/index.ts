import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { type Env } from './env'
import { getCcipRead } from './handlers/ccip'

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())
app.get('/', async (c) => c.json({ status: 'ok' }))
app.get('/health', async (c) => c.json({ status: 'ok' }))
app.get('/v1/ccip-read/:sender/:data', async (c) => getCcipRead(c.req, c.env))

export default app
