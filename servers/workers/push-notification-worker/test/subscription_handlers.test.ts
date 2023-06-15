import { AddSubscriptionRequestParams } from '../src/subscription_types'

import { createFakePushSubscription } from './fake_data'
import { createMockPreparedStatement, createTestMocks } from './mock_utils'
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
      headers: {
        'Content-Type': 'application/json',
      },
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
    // it's a bug to bind arguments to the sql statement in the wrong order. Verify.
    expect(bindSpy).toBeCalledWith(userId, pushSubscription)
  })
})
