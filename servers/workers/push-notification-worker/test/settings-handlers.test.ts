import { createTestMocks, mockPreparedStatements } from './mock-utils'

import { NotificationSettings } from '../src/types'
import {
  DeleteSettingsRequestParams,
  GetSettingsRequestParams,
  SaveSettingsRequestParams,
} from '../src/request-interfaces'
import { handleRequest } from '../src'

describe('settings-handlers', () => {
  test('PUT /api/notification-settings', async () => {
    // Arrange
    const userId = `0xAlice${Date.now()}`
    const settings: NotificationSettings = {
      muteSettings: {
        mutedChannels: {},
        mutedSpaces: {},
      },
    }
    const params: SaveSettingsRequestParams = {
      userId,
      settings,
    }
    // create the request
    const { request, env, DB, ctx } = createTestMocks({
      route: '/api/notification-settings',
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    // replace with my own mocks to spy on
    const { insertIntoNotificationSettings: mockStatement } =
      mockPreparedStatements(DB)
    const prepareSpy = jest.spyOn(DB, 'prepare')
    const bindSpy = jest.spyOn(mockStatement, 'bind')

    // Act
    const response = await handleRequest(request, env, ctx)

    // Assert
    expect(response.status).toBe(204)
    expect(prepareSpy).toBeCalledWith(
      expect.stringContaining('INSERT INTO NotificationSettings'),
    )
    // verify that arguments are binded to the sql statement in the expected order.
    expect(bindSpy).toBeCalledWith(userId, JSON.stringify(params.settings))
  })

  test('DELETE /api/notification-settings', async () => {
    // Arrange
    const userId = `0xAlice${Date.now()}`
    const params: DeleteSettingsRequestParams = {
      userId,
    }
    // create the request
    const { request, env, DB, ctx } = createTestMocks({
      route: '/api/notification-settings',
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    // replace with my own mocks to spy on
    const { deleteFromNotificationSettings: mockStatement } =
      mockPreparedStatements(DB)
    const prepareSpy = jest.spyOn(DB, 'prepare')
    const bindSpy = jest.spyOn(mockStatement, 'bind')

    // Act
    const response = await handleRequest(request, env, ctx)

    // Assert
    expect(response.status).toBe(204)
    expect(prepareSpy).toBeCalledWith(
      expect.stringContaining('DELETE FROM NotificationSettings'),
    )
    // verify that arguments are binded to the sql statement in the expected order.
    expect(bindSpy).toBeCalledWith(userId)
  })

  test('POST /api/notification-settings', async () => {
    // Arrange
    const userId = `0xAlice${Date.now()}`
    const params: GetSettingsRequestParams = {
      userId,
    }
    // create the request
    const { request, env, DB, ctx } = createTestMocks({
      route: '/api/get-notification-settings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    // replace with my own mocks to spy on
    const { selectFromNotificationSettings: mockStatement } =
      mockPreparedStatements(DB)
    const prepareSpy = jest.spyOn(DB, 'prepare')
    const bindSpy = jest.spyOn(mockStatement, 'bind')

    // Act
    const response = await handleRequest(request, env, ctx)

    // Assert
    expect(response.status).toBe(204)
    expect(prepareSpy).toBeCalledWith(
      expect.stringContaining('SELECT') &&
        expect.stringContaining('FROM NotificationSettings'),
    )
    // verify that arguments are binded to the sql statement in the expected order.
    expect(bindSpy).toBeCalledWith(userId)
  })
})
