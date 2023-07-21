import {
  addPushSubscription,
  removePushSubscription,
} from './subscription-handlers'
import { create400Response, create401Response } from './http-responses'
import { deleteSettings, saveSettings } from './settings-handlers'
import {
  getDefaultRouteDev,
  getServiceWorkerJsDev,
} from './subscription-handlers.dev'
import {
  isAddSubscriptionRequestParams,
  isDeleteSettingsRequestParams,
  isMentionRequestParams,
  isNotifyRequestParams,
  isRemoveSubscriptionRequestParams,
  isReplyToRequestParams,
  isSaveSettingsRequestParams,
} from './request-interfaces'
import { tagMentionUsers, tagReplyToUser } from './tag-handlers'

import { Env } from '.'
import { Router } from 'itty-router'
import { isAuthedRequest } from '../../common'
import { notifyUsers } from './notify-users-handlers'

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

router.post('/api/tag-mention-users', async (request: Request, env: Env) => {
  // check auth before doing work
  if (!isAuthedRequest(request, env)) {
    return create401Response('/api/tag-mention-users')
  }

  // get the content of the request as json
  const content = await getContentAsJson(request)
  if (!content || !isMentionRequestParams(content)) {
    return create400Response('/api/tag-mention-users', content)
  }

  // handle a proper request
  return tagMentionUsers(env.DB, content)
})

router.post('/api/tag-reply-to-users', async (request: Request, env: Env) => {
  // check auth before doing work
  if (!isAuthedRequest(request, env)) {
    return create401Response('/api/tag-reply-to-users')
  }

  // get the content of the request as json
  const content = await getContentAsJson(request)
  if (!content || !isReplyToRequestParams(content)) {
    return create400Response('/api/tag-reply-to-users', content)
  }

  // handle a proper request
  return tagReplyToUser(env.DB, content)
})

router.put('/api/notification-settings', async (request: Request, env: Env) => {
  // check auth before doing work
  if (!isAuthedRequest(request, env)) {
    return create401Response('/api/notification-settings')
  }

  // get the content of the request as json
  const content = await getContentAsJson(request)
  if (!content || !isSaveSettingsRequestParams(content)) {
    return create400Response('/api/notification-settings', content)
  }

  // handle a proper request
  return saveSettings(env.DB, content)
})

router.delete(
  '/api/notification-settings',
  async (request: Request, env: Env) => {
    // check auth before doing work
    if (!isAuthedRequest(request, env)) {
      return create401Response('/api/notification-settings')
    }

    // get the content of the request as json
    const content = await getContentAsJson(request)
    if (!content || !isDeleteSettingsRequestParams(content)) {
      return create400Response('/api/notification-settings', content)
    }

    // handle a proper request
    return deleteSettings(env.DB, content)
  },
)

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
