import { AddSubscriptionRequestParams } from '../src/subscription_types'

import { createFakePushSubscription } from './fake_data'
import { createTestMocks } from './mock_utils'
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
    const params: AddSubscriptionRequestParams = {
      spaceId: `!space-id_${Date.now()}:towns.com`,
      userId: `0xAlice${Date.now()}`,
      pushSubscription: createFakePushSubscription(),
    }
    const { request, env, DB, ctx } = createTestMocks({
      route: 'api/add-subscription',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      includeBearerToken: true,
      body: JSON.stringify(params),
    })
    const prepareSpy = jest.spyOn(DB, 'prepare')
    // Act
    const response = await handleRequest(request, env, ctx)
    // Assert
    expect(response.status).toBe(204)
    expect(prepareSpy).toBeCalledWith(
      expect.stringContaining('INSERT INTO PushSubscription'),
    )
  })
})
