import {
  AddSubscriptionRequestParams,
  NotifyRequestParams,
} from '../src/request-interfaces'
import { createRequest, createTestMocks, mockDbStatements } from './mock-utils'

import {
  NotificationContentDm,
  NotificationContentMessage,
  NotificationPayload,
  NotificationKind,
} from '../src/types'
import { WebPushSubscription } from '../src/web-push/web-push-types'
import { createFakeWebPushSubscription } from './fake-data'
import { handleRequest } from '../src'
import { jest } from '@jest/globals'

describe('notify-users-handlers', () => {
  test('/api/notify-users', async () => {
    // Arrange
    const fetchMock = getMiniflareFetchMock()
    fetchMock.disableNetConnect()
    const spaceId = `Town${Date.now()}`
    const channelId = `!channelId${Date.now()}`
    const sender = `0xAlice${Date.now()}`
    const recipient = `0xBob${Date.now()}`
    const subscriptionObject = createFakeWebPushSubscription()
    const addParams: AddSubscriptionRequestParams = {
      userId: sender,
      subscriptionObject,
    }
    // create the request to add the push subscription
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
    mockDbStatements(DB, {
      spaceId,
      channelId,
    })
    // add the subscription
    await handleRequest(addRequest, env, ctx)

    // Act
    // create the request to notify the user
    const content: NotificationContentMessage = {
      kind: NotificationKind.NewMessage,
      spaceId,
      channelId,
      senderId: sender,
      event: {},
    }
    const payload: NotificationPayload = {
      content,
    }
    const notifyParams: NotifyRequestParams = {
      sender,
      users: [recipient],
      payload,
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
    // by default, no users receive notifications unless they are mentioned, or replied to.
    expect(notificationsSentCount).toBe('0')
  })

  test('/api/notify-users DM', async () => {
    // Arrange
    const fetchMock = getMiniflareFetchMock()
    fetchMock.disableNetConnect()
    const spaceId = `Town${Date.now()}`
    const channelId = `!channelId${Date.now()}`
    const sender = `0xAlice${Date.now()}`
    const recipient = `0xBob${Date.now()}`
    const subscriptionObject = createFakeWebPushSubscription()
    const addParams: AddSubscriptionRequestParams = {
      userId: sender,
      subscriptionObject,
    }
    // create the request to add the push subscription
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
    mockDbStatements(DB, {
      spaceId,
      channelId,
    })
    // add the subscription
    await handleRequest(addRequest, env, ctx)

    // Act
    // create the request to notify the user
    const content: NotificationContentDm = {
      kind: NotificationKind.DirectMessage,
      channelId,
      senderId: sender,
      recipients: [],
      event: {},
    }
    const payload: NotificationPayload = {
      content,
    }
    const notifyParams: NotifyRequestParams = {
      sender,
      users: [recipient],
      payload,
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
    // DM user should receive notification.
    expect(notificationsSentCount).toBe('1')
  })

  test('/api/notify-users notification is muted', async () => {
    // Arrange
    const fetchMock = getMiniflareFetchMock()
    fetchMock.disableNetConnect()
    const spaceId = `Town${Date.now()}`
    const channelId = `!channelId${Date.now()}`
    const sender = `0xAlice${Date.now()}`
    const recipient = `0xBob${Date.now()}`
    const subscriptionObject = createFakeWebPushSubscription()
    const addParams: AddSubscriptionRequestParams = {
      userId: sender,
      subscriptionObject,
    }
    // create the request to add the push subscription
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
    // mock the query results for the user settings
    // notification is muted. No users to notify.
    const { selectMutedUsers: mockStatement } = mockDbStatements(DB, {
      spaceId,
      channelId,
      replyToUsers: [recipient],
      mutedUsers: [recipient],
    })
    // add the subscription
    await handleRequest(addRequest, env, ctx)
    const bindSpy = jest.spyOn(mockStatement, 'bind')

    // Act
    // create the request to notify the user
    const content: NotificationContentMessage = {
      kind: NotificationKind.NewMessage,
      spaceId,
      channelId,
      senderId: sender,
      event: {},
    }
    const payload: NotificationPayload = {
      content,
    }
    const notifyParams: NotifyRequestParams = {
      sender,
      users: [recipient],
      payload,
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
    // verify that arguments are binded to the sql statement in the expected order.
    expect(bindSpy).toBeCalledWith(spaceId, channelId)
    expect(response.status).toBe(200)
    const notificationsSentCount = await response.text()
    console.log('notificationsSentCount', notificationsSentCount)
    // no users to notify
    expect(notificationsSentCount).toBe('0')
  })

  test('/api/notify-users for replyTo', async () => {
    // Arrange
    const fetchMock = getMiniflareFetchMock()
    fetchMock.disableNetConnect()
    const spaceId = `Town${Date.now()}`
    const channelId = `!channelId${Date.now()}`
    const sender = `0xAlice${Date.now()}`
    const replyToUser = `0xBob${Date.now()}`
    const subscriptionObject = createFakeWebPushSubscription()
    const addParams: AddSubscriptionRequestParams = {
      userId: sender,
      subscriptionObject,
    }
    // create the request to add the push subscription
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
    const { selectFromNotificationTag: mockStatement } = mockDbStatements(DB, {
      spaceId,
      channelId,
      replyToUsers: [replyToUser],
    })
    // add the subscription
    await handleRequest(addRequest, env, ctx)
    const bindSpy = jest.spyOn(mockStatement, 'bind')

    // Act
    // create the request to notify the user
    const content: NotificationContentMessage = {
      kind: NotificationKind.NewMessage,
      spaceId,
      channelId,
      senderId: sender,
      event: {},
    }
    const payload: NotificationPayload = {
      content,
    }
    const notifyParams: NotifyRequestParams = {
      sender,
      users: [replyToUser],
      payload,
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
    // verify that arguments are binded to the sql statement in the expected order.
    expect(bindSpy).toBeCalledWith(channelId)
    expect(response.status).toBe(200)
    const notificationsSentCount = await response.text()
    console.log('notificationsSentCount', notificationsSentCount)
    // user notified
    expect(notificationsSentCount).toBe('1')
  })

  test('/api/notify-users for mention', async () => {
    // Arrange
    const fetchMock = getMiniflareFetchMock()
    fetchMock.disableNetConnect()
    const spaceId = `Town${Date.now()}`
    const channelId = `!channelId${Date.now()}`
    const sender = `0xAlice${Date.now()}`
    const mentionUser = `0xBob${Date.now()}`
    const subscriptionObject = createFakeWebPushSubscription()
    const addParams: AddSubscriptionRequestParams = {
      userId: sender,
      subscriptionObject,
    }
    // create the request to add the push subscription
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
    const { selectFromNotificationTag: mockStatement } = mockDbStatements(DB, {
      spaceId,
      channelId,
      mentionUsers: [mentionUser],
    })
    // add the subscription
    await handleRequest(addRequest, env, ctx)
    const bindSpy = jest.spyOn(mockStatement, 'bind')

    // Act
    // create the request to notify the user
    const content: NotificationContentMessage = {
      kind: NotificationKind.NewMessage,
      spaceId,
      channelId,
      senderId: sender,
      event: {},
    }
    const payload: NotificationPayload = {
      content,
    }
    const notifyParams: NotifyRequestParams = {
      sender,
      users: [mentionUser],
      payload,
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
    // verify that arguments are binded to the sql statement in the expected order.
    expect(bindSpy).toBeCalledWith(channelId)
    expect(response.status).toBe(200)
    const notificationsSentCount = await response.text()
    console.log('notificationsSentCount', notificationsSentCount)
    // user notified
    expect(notificationsSentCount).toBe('1')
  })
})
