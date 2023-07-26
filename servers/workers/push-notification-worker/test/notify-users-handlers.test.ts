import {
  AddSubscriptionRequestParams,
  NotifyRequestParams,
} from '../src/request-interfaces'
import {
  createRequest,
  createTestMocks,
  mockPreparedStatements,
} from './mock-utils'

import { NotificationType } from '../src/types'
import { WebPushSubscription } from '../src/web-push/web-push-types'
import { createFakeWebPushSubscription } from './fake-data'
import { handleRequest } from '../src'

describe('notify-users-handlers', () => {
  test('/api/notify-users', async () => {
    // Arrange
    const fetchMock = getMiniflareFetchMock()
    fetchMock.disableNetConnect()
    const townId = `Town${Date.now()}`
    const sender = `0xAlice${Date.now()}`
    const recipient = `0xBob${Date.now()}`
    const subscriptionObject = createFakeWebPushSubscription()
    const addParams: AddSubscriptionRequestParams = {
      userId: sender,
      subscriptionObject,
    }
    // create the request
    const {
      request: addRequest,
      env,
      DB,
      ctx,
    } = createTestMocks({
      route: '/api/add-subscription',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addParams),
    })
    mockPreparedStatements(DB)
    // add the subscription
    await handleRequest(addRequest, env, ctx)

    // Act
    // create the request to notify the user
    const payload = {
      notificationType: NotificationType.NewMessage,
      content: {
        topic: `!channelId${Date.now()}`,
        options: {
          body: `ID: ${Math.floor(Math.random() * 100)}`,
        },
      },
    }
    const notifyParams: NotifyRequestParams = {
      sender,
      users: [recipient],
      payload,
      townId,
      channelId: payload.content.topic,
    }
    // create the notification request
    const notifyRequest = createRequest(env, {
      route: '/api/notify-users',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifyParams),
    })
    // mock the response from the web push server
    const fakeSubscription =
      createFakeWebPushSubscription() as WebPushSubscription
    const fakeServerUrl = new URL(fakeSubscription.endpoint)
    const endpoint = fetchMock.get(fakeServerUrl.origin)
    endpoint
      .intercept({ method: 'POST', path: fakeServerUrl.pathname })
      .reply(201, 'OK')

    // send the notification request
    const response = await handleRequest(notifyRequest, env, ctx)

    // Assert
    expect(response.status).toBe(200)
    const notificationsSentCount = await response.text()
    console.log('notificationsSentCount', notificationsSentCount)
    expect(notificationsSentCount).toBe('1')
  })
})
