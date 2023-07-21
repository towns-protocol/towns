import { createTestMocks, mockPreparedStatements } from './mock-utils'

import { AddSubscriptionRequestParams } from '../src/request-interfaces'
import { createFakeWebPushSubscription } from './fake-data'
import { handleRequest } from '../src'

describe('subscription-handlers', () => {
  test('/api/add-subscription', async () => {
    // Arrange
    const userId = `0xAlice${Date.now()}`
    const subscriptionObject = createFakeWebPushSubscription()
    const params: AddSubscriptionRequestParams = {
      userId,
      subscriptionObject,
    }
    // create the request
    const { request, env, DB, ctx } = createTestMocks({
      route: '/api/add-subscription',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    // replace with my own mocks to spy on
    const { insertIntoPushSubscription: mockStatement } =
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

  test('/api/remove-subscription', async () => {
    // Arrange
    const userId = `0xAlice${Date.now()}`
    const subscriptionObject = createFakeWebPushSubscription()
    const params: AddSubscriptionRequestParams = {
      userId,
      subscriptionObject,
    }
    // create the request to remove the subscription
    const { request, env, DB, ctx } = createTestMocks({
      route: '/api/remove-subscription',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    // replace with mocks to spy on
    const { deleteFromPushSubscription: mockStatement } =
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
})
