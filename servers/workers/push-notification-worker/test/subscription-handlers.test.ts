import {
  AddSubscriptionRequestParams,
  MentionRequestParams,
  NotifyRequestParams,
  ReplyToRequestParams,
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

describe('subscription handlers', () => {
  test('api/add-subscription', async () => {
    // Arrange
    const userId = `0xAlice${Date.now()}`
    const subscriptionObject = createFakeWebPushSubscription()
    const params: AddSubscriptionRequestParams = {
      userId,
      subscriptionObject,
    }
    // create the request
    const { request, env, DB, ctx } = createTestMocks({
      route: 'api/add-subscription',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    // replace with my own mocks to spy on
    const { insertIntoPushSubscriptionStatement: mockStatement } =
      mockPreparedStatements(DB)
    const prepareSpy = jest.spyOn(DB, 'prepare')
    const bindSpy = jest.spyOn(mockStatement, 'bind')

    // Act
    const response = await handleRequest(request, env, ctx)

    // Assert
    expect(response.status).toBe(204)
    expect(prepareSpy).toBeCalledWith(
      expect.stringContaining('INSERT INTO PushSubscription'),
    )
    // verify that arguments are binded to the sql statement in the expected order.
    expect(bindSpy).toBeCalledWith(
      userId,
      JSON.stringify(subscriptionObject),
      'web-push',
    )
  })

  test('api/remove-subscription', async () => {
    // Arrange
    const userId = `0xAlice${Date.now()}`
    const subscriptionObject = createFakeWebPushSubscription()
    const params: AddSubscriptionRequestParams = {
      userId,
      subscriptionObject,
    }
    // create the request to remove the subscription
    const { request, env, DB, ctx } = createTestMocks({
      route: 'api/remove-subscription',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    // replace with mocks to spy on
    const { deleteFromPushSubscriptionStatement: mockStatement } =
      mockPreparedStatements(DB)
    const prepareSpy = jest.spyOn(DB, 'prepare')
    const bindSpy = jest.spyOn(mockStatement, 'bind')

    // Act
    // call the api to remove the subscription
    const response = await handleRequest(request, env, ctx)

    // Assert
    expect(response.status).toBe(204)
    expect(prepareSpy).toBeCalledWith(
      expect.stringContaining('DELETE FROM PushSubscription'),
    )
    // verify that arguments are binded to the sql statement in the expected order.
    expect(bindSpy).toBeCalledWith(userId, JSON.stringify(subscriptionObject))
  })

  test('api/notify-users', async () => {
    // Arrange
    const fetchMock = getMiniflareFetchMock()
    fetchMock.disableNetConnect()
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
      route: 'api/add-subscription',
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
      topic: payload.content.topic,
    }
    // create the notification request
    const notifyRequest = createRequest(env, {
      route: 'api/notify-users',
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

  test('api/tag-mention-users', async () => {
    // Arrange
    const mentionedUsers = [`0xAlice${Date.now()}`, `0xBob${Date.now()}`]
    const channelId = `Channel${Date.now()}`
    const params: MentionRequestParams = {
      channelId,
      userIds: mentionedUsers,
    }
    // create the request
    const { request, env, DB, ctx } = createTestMocks({
      route: 'api/tag-mention-users',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    // replace with my own mocks to spy on
    const { insertIntoNotificationTagStatement: mockStatement } =
      mockPreparedStatements(DB)
    const prepareSpy = jest.spyOn(DB, 'prepare')
    const bindSpy = jest.spyOn(mockStatement, 'bind')

    // Act
    const response = await handleRequest(request, env, ctx)

    // Assert
    expect(response.status).toBe(204)
    expect(prepareSpy).toBeCalledWith(
      expect.stringContaining('INSERT INTO NotificationTag'),
    )
    // verify that arguments are binded to the sql statement in the expected order.
    expect(bindSpy).toBeCalledTimes(2)
    for (const userId of mentionedUsers) {
      expect(bindSpy).toBeCalledWith(
        channelId,
        userId,
        NotificationType.Mention,
      )
    }
  })

  test('api/tag-reply-to-users', async () => {
    // Arrange
    const replyToUsers = [`0xAlice${Date.now()}`, `0xBob${Date.now()}`]
    const channelId = `Channel${Date.now()}`
    const params: ReplyToRequestParams = {
      channelId,
      userIds: replyToUsers,
    }
    // create the request
    const { request, env, DB, ctx } = createTestMocks({
      route: 'api/tag-reply-to-users',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    // replace with my own mocks to spy on
    const { insertIntoNotificationTagStatement: mockStatement } =
      mockPreparedStatements(DB)
    const prepareSpy = jest.spyOn(DB, 'prepare')
    const bindSpy = jest.spyOn(mockStatement, 'bind')

    // Act
    const response = await handleRequest(request, env, ctx)

    // Assert
    expect(response.status).toBe(204)
    expect(prepareSpy).toBeCalledWith(
      expect.stringContaining('INSERT INTO NotificationTag'),
    )
    // verify that arguments are binded to the sql statement in the expected order.
    expect(bindSpy).toBeCalledTimes(2)
    for (const userId of replyToUsers) {
      expect(bindSpy).toBeCalledWith(
        channelId,
        userId,
        NotificationType.ReplyTo,
      )
    }
  })
})
