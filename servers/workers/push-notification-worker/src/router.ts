import { IRequest, Router } from 'itty-router'

import { Env } from './worker'
import { getPushSubscriptions } from './subscription_handler'

// now let's create a router (note the lack of "new")
const router = Router()

// GET collection
router.get(
  '/api/push_subscriptions',
  async (request: IRequest, env: Env) =>
    await getPushSubscriptions(request, env),
)

// POST to the collection (we'll use async here)
router.post('/api/todos', async (request: Request, env: Env) => {
  const content = await request.json()

  return new Response('Creating Todo: ' + JSON.stringify(content))
})

// show test route for anything else
router.all('*', () => {
  return new Response(
    `Now: ${new Date()}
    <ul>
    <li><code><a href="/api/push_subscriptions">/api/push_subscriptions/</a></code></li>
    </ul>`,
    { headers: { 'Content-Type': 'text/html' } },
  )
})

export default router
