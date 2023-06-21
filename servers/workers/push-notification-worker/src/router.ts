import {
  addPushSubscription,
  removePushSubscription,
} from './subscription_handlers'
import {
  getDefaultRouteDev,
  getPushSubscriptionsDev,
  getServiceWorkerJsDev,
} from './subscription_handlers.dev'
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
  return getPushSubscriptionsDev(env.ENVIRONMENT, env.DB)
})

router.post('/api/add-subscription', async (request: Request, env: Env) => {
  if (!isAuthedRequest(request, env)) {
    console.error('add-subscription', 'Unauthorized')
    return new Response('Unauthorized', {
      status: 401,
    })
  }
  const content = await request.json()
  if (isAddSubscriptionRequestParams(content)) {
    return addPushSubscription(content, env.DB)
  }
  console.error('add-subscription', 'Bad request', content)
  return new Response('Bad request', { status: 400 })
})

router.post('/api/remove-subscription', async (request: Request, env: Env) => {
  if (!isAuthedRequest(request, env)) {
    console.error('remove-subscription', 'Unauthorized')
    return new Response('Unauthorized', {
      status: 401,
    })
  }
  const content = await request.json()
  if (isRemoveSubscriptionRequestParams(content)) {
    return removePushSubscription(content, env.DB)
  }
  console.error('remove-subscription', 'Bad request', content)
  return new Response('Bad request', { status: 400 })
})

/**  dev routes start here */
router.get('/service-worker.js', async (request: Request, env: Env) =>
  getServiceWorkerJsDev(env.ENVIRONMENT),
)

// show dev route for anything else
router.all('*', async (request: Request, env: Env) =>
  getDefaultRouteDev(request, env),
)
/** dest routes ends here */

export default router
