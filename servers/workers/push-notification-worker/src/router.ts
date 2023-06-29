import {
  addPushSubscription,
  notifyUsers,
  removePushSubscription,
} from './subscription-handlers'
import {
  getDefaultRouteDev,
  getServiceWorkerJsDev,
} from './subscription-handlers.dev'
import {
  isAddSubscriptionRequestParams,
  isNotifyRequestParams,
  isRemoveSubscriptionRequestParams,
} from './request-interfaces'

import { Env } from '.'
import { Router } from 'itty-router'
import { isAuthedRequest } from '../../common'

// now let's create a router (note the lack of "new")
const router = Router()

router.post('/api/add-subscription', async (request: Request, env: Env) => {
  // check auth before doing work
  if (!isAuthedRequest(request, env)) {
    return create401Response('add-subscription')
  }

  // get the content of the request as json
  const content = await getContentAsJson(request)
  if (!content || !isAddSubscriptionRequestParams(content)) {
    console.error(
      'add-subscription',
      'Bad request with invalid params',
      content,
    )
    return new Response('Bad request', { status: 400 })
  }

  // handle a proper request
  return addPushSubscription(content, env)
})

router.post('/api/remove-subscription', async (request: Request, env: Env) => {
  // check auth before doing work
  if (!isAuthedRequest(request, env)) {
    return create401Response('remove-subscription')
  }

  // get the content of the request as json
  const content = await getContentAsJson(request)
  if (!content || !isRemoveSubscriptionRequestParams(content)) {
    console.error(
      'remove-subscription',
      'Bad request with invalid params',
      content,
    )
    return new Response('Bad request', { status: 400 })
  }

  // handle a proper request
  return removePushSubscription(content, env)
})

router.post('/api/notify-users', async (request: Request, env: Env) => {
  // check auth before doing work
  if (!isAuthedRequest(request, env)) {
    return create401Response('notify-users')
  }

  // get the content of the request as json
  const content = await getContentAsJson(request)
  if (!content || !isNotifyRequestParams(content)) {
    console.error('notify-users', 'Bad request with invalid params', content)
    return new Response('Bad request', { status: 400 })
  }

  // handle a proper request
  console.log('tak:', 'notifyUsers', 'before calling notifyUsers')
  return notifyUsers(content, env)
})

function create401Response(msg: string) {
  console.error(msg, 'Unauthorized')
  return new Response('Unauthorized', {
    status: 401,
  })
}

async function getContentAsJson(request: Request): Promise<object | null> {
  let content = {}
  try {
    content = await request.json()
    return content
  } catch (e) {
    console.error('Bad request with non-json content', e)
  }
  return null
}

/**  dev routes start here */
router.get('/service-worker.js', async (request: Request, env: Env) =>
  getServiceWorkerJsDev(env),
)

// show dev route for anything else
router.all('*', async (request: Request, env: Env) =>
  getDefaultRouteDev(request, env),
)
/** dest routes ends here */

export default router
