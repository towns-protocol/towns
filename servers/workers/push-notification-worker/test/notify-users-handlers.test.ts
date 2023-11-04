import {
  AddSubscriptionRequestParams,
  NotifyRequestParams,
} from '../src/request-interfaces'
import {
  createRequest,
  createTestMocks,
  mockPreparedStatements,
} from './mock-utils'
import { jest } from '@jest/globals'

import { MockProxy } from 'jest-mock-extended'
import { NotificationType } from '../src/types'
import { QueryResultsMutedUsers } from '../src/notify-users-handlers'
import { WebPushSubscription } from '../src/web-push/web-push-types'
import { createFakeWebPushSubscription } from './fake-data'
import { handleRequest } from '../src'

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
    const { selectMutedUsers: mockStatement } = mockPreparedStatements(DB)
    // add the subscription
    await handleRequest(addRequest, env, ctx)
    // mock the query results for the user settings
    mockMutedUsers(mockStatement, [])
    const bindSpy = jest.spyOn(mockStatement, 'bind')

    // Act
    // create the request to notify the user
    const payload = {
      notificationType: NotificationType.NewMessage,
      content: {
        topic: channelId,
        options: {
          body: `ID: ${Math.floor(Math.random() * 100)}`,
        },
      },
    }
    const notifyParams: NotifyRequestParams = {
      sender,
      users: [recipient],
      payload,
      spaceId,
      channelId,
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
    // one user is notified
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
    const { selectMutedUsers: mockStatement } = mockPreparedStatements(DB)
    // add the subscription
    await handleRequest(addRequest, env, ctx)
    // mock the query results for the user settings
    // notification is muted. No users to notify.
    mockMutedUsers(mockStatement, [recipient])
    const bindSpy = jest.spyOn(mockStatement, 'bind')

    // Act
    // create the request to notify the user
    const payload = {
      notificationType: NotificationType.NewMessage,
      content: {
        topic: channelId,
        options: {
          body: `ID: ${Math.floor(Math.random() * 100)}`,
        },
      },
    }
    const notifyParams: NotifyRequestParams = {
      sender,
      users: [recipient],
      payload,
      spaceId,
      channelId,
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
})

function mockMutedUsers(
  mockStatement: MockProxy<D1PreparedStatement>,
  mutedUsers: string[],
): MockProxy<D1PreparedStatement> {
  const results: QueryResultsMutedUsers[] = []
  mockStatement.bind.mockImplementation(() => {
    mutedUsers.forEach((r) => {
      results.push({
        userId: r,
        info: 'muted users',
      })
    })
    return mockStatement
  })
  mockStatement.all.mockResolvedValue({
    results: results as unknown as QueryResultsMutedUsers[][],
    success: true,
    meta: {},
  })
  return mockStatement
}
