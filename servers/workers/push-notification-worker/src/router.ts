import {
  addPushSubscription,
  mentionUsers,
  notifyUsers,
  removePushSubscription,
} from './subscription-handlers'
import {
  getDefaultRouteDev,
  getServiceWorkerJsDev,
} from './subscription-handlers.dev'
import {
  isAddSubscriptionRequestParams,
  isMentionRequestParams,
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
    return create401Response('/api/add-subscription')
  }

  // get the content of the request as json
  const content = await getContentAsJson(request)
  if (!content || !isAddSubscriptionRequestParams(content)) {
    return create401Response('/api/add-subscription')
  }

  // handle a proper request
  return addPushSubscription(content, env)
})

router.post('/api/remove-subscription', async (request: Request, env: Env) => {
  // check auth before doing work
  if (!isAuthedRequest(request, env)) {
    return create401Response('/api/remove-subscription')
  }

  // get the content of the request as json
  const content = await getContentAsJson(request)
  if (!content || !isRemoveSubscriptionRequestParams(content)) {
    return create401Response('/api/remove-subscription')
  }

  // handle a proper request
  return removePushSubscription(content, env)
})

router.post('/api/notify-users', async (request: Request, env: Env) => {
  // check auth before doing work
  if (!isAuthedRequest(request, env)) {
    return create401Response('/api/notify-users')
  }

  // get the content of the request as json
  const content = await getContentAsJson(request)
  if (!content || !isNotifyRequestParams(content)) {
    return create400Response('/api/notify-users', content)
  }

  // handle a proper request
  return notifyUsers(content, env)
})

router.post('/api/mention-users', async (request: Request, env: Env) => {
  // check auth before doing work
  if (!isAuthedRequest(request, env)) {
    return create401Response('/api/mention-users')
  }

  // get the content of the request as json
  const content = await getContentAsJson(request)
  if (!content || !isMentionRequestParams(content)) {
    return create400Response('/api/mention-users', content)
  }

  // handle a proper request
  return mentionUsers(content, env)
})

function create400Response(path: string, content: object | null) {
  console.error(path, 'Bad request', content)
  return new Response('Bad request', {
    status: 400,
  })
}

function create401Response(path: string) {
  console.error(path, 'Unauthorized')
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
