import {
  addPushSubscription,
  getPushSubscriptions,
} from './subscription_handlers'

import { Env } from '.'
import { Router } from 'itty-router'
import { isAddSubscriptionRequestParams } from './subscription_types'
import { isAuthedRequest } from '../../common'

// now let's create a router (note the lack of "new")
const router = Router()

// GET collection
router.get('/api/get-subscriptions', (request: Request, env: Env) => {
  return getPushSubscriptions(env.ENVIRONMENT, env.DB)
})

// POST to the collection (we'll use async here)
router.post('/api/add-subscription', async (request: Request, env: Env) => {
  if (!isAuthedRequest(request, env)) {
    return new Response('Unauthorized', {
      status: 401,
    })
  }

  const content = await request.json()
  if (isAddSubscriptionRequestParams(content)) {
    return addPushSubscription(content, env.DB)
  }
  return new Response('Invalid request', { status: 400 })
})

// show test route for anything else
router.all('*', async (request: Request) => {
  const html = `
<!DOCTYPE html>
<html>
<body>
  <p>Now: ${new Date()}</p>
  <ul>
    <li><code><a href="/api/get-subscriptions">/api/get-subscriptions/</a></code></li>
  </ul>
</body>
</html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html' } })
})

export default router
