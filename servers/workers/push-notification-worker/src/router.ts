import {
  addPushSubscription,
  getPushSubscriptions,
  removePushSubscription,
} from './subscription_handlers'
import {
  isAddSubscriptionRequestParams,
  isRemoveSubscriptionRequestParams,
} from './subscription_types'

import { Env } from '.'
import { Router } from 'itty-router'
import { isAuthedRequest } from '../../common'

// now let's create a router (note the lack of "new")
const router = Router()

router.get('/api/get-subscriptions', (request: Request, env: Env) => {
  return getPushSubscriptions(env.ENVIRONMENT, env.DB)
})

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

router.post('/api/remove-subscription', async (request: Request, env: Env) => {
  if (!isAuthedRequest(request, env)) {
    return new Response('Unauthorized', {
      status: 401,
    })
  }
  const content = await request.json()
  if (isRemoveSubscriptionRequestParams(content)) {
    return removePushSubscription(content, env.DB)
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
