import {
  AddSubscriptionRequestParams,
  RemoveSubscriptionRequestParams,
} from '../src/subscription_types'
import {
  createMockPreparedStatement,
  createRequest,
  createTestMocks,
} from './mock_utils'

import { createFakePushSubscription } from './fake_data'
import { handleRequest } from '../src'

describe('subscription handlers', () => {
  test('api/get-subscriptions', async () => {
    // Arrange
    const { request, env, ctx } = createTestMocks({
      route: 'api/get-subscriptions',
    })
    // Act
    const response = await handleRequest(request, env, ctx)
    // Assert
    // expect the mock result created in createMockD1Database() to be returned
    expect(await response.text()).toContain('!space-id_1:towns.com')
  })

  test('api/add-subscription', async () => {
    // Arrange
    const userId = `0xAlice${Date.now()}`
    const pushSubscription = createFakePushSubscription()
    const params: AddSubscriptionRequestParams = {
      userId,
      pushSubscription,
    }
    // create the request
    const { request, env, DB, ctx } = createTestMocks({
      route: 'api/add-subscription',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      includeBearerToken: true,
      body: JSON.stringify(params),
    })
    // replace with my own mocks to spy on
    const mockStatement = createMockPreparedStatement()
    DB.prepare.mockImplementation((query: string) => mockStatement)
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
    expect(bindSpy).toBeCalledWith(userId, JSON.stringify(pushSubscription))
  })

  test('api/add-subscription', async () => {
    // Arrange
    const userId = `0xAlice${Date.now()}`
    const pushSubscription = createFakePushSubscription()
    const params: AddSubscriptionRequestParams = {
      userId,
      pushSubscription,
    }
    // create the request to remove the subscription
    const { request, env, DB, ctx } = createTestMocks({
      route: 'api/add-subscription',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      includeBearerToken: true,
      body: JSON.stringify(params),
    })
    // replace with mocks to spy on
    const mockStatement = createMockPreparedStatement()
    DB.prepare.mockImplementation((query: string) => mockStatement)
    const prepareSpy = jest.spyOn(DB, 'prepare')
    const bindSpy = jest.spyOn(mockStatement, 'bind')

    // Act
    // call the api to add the subscription
    const response = await handleRequest(request, env, ctx)

    // Assert
    expect(response.status).toBe(204)
    expect(prepareSpy).toBeCalledWith(
      expect.stringContaining('INSERT INTO PushSubscription'),
    )
    // verify that arguments are binded to the sql statement in the expected order.
    expect(bindSpy).toBeCalledWith(userId, JSON.stringify(pushSubscription))
  })

  test('api/remove-subscription', async () => {
    // Arrange
    const userId = `0xAlice${Date.now()}`
    const pushSubscription = createFakePushSubscription()
    const params: AddSubscriptionRequestParams = {
      userId,
      pushSubscription,
    }
    // create the request to remove the subscription
    const { request, env, DB, ctx } = createTestMocks({
      route: 'api/remove-subscription',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    // replace with mocks to spy on
    const mockStatement = createMockPreparedStatement()
    DB.prepare.mockImplementation((query: string) => mockStatement)
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
    expect(bindSpy).toBeCalledWith(userId, JSON.stringify(pushSubscription))
  })
})
