import {
  DeleteSettingsRequestParams,
  GetSettingsRequestParams,
  SaveSettingsRequestParams,
} from '../src/request-interfaces'
import {
  Mute,
  UserSettings,
  UserSettingsChannel,
  UserSettingsSpace,
} from '../src/types'
import { createTestMocks, mockDbStatements } from './mock-utils'

import { handleRequest } from '../src'
import { jest } from '@jest/globals'

describe('settings-handlers', () => {
  test('PUT /api/notification-settings -> saveSettings', async () => {
    // Arrange
    const userId = `0xAlice${Date.now()}`
    const spaceId = `0xSpace${Date.now()}`
    const channelId = `channel${Date.now()}`
    const spaceSettings: UserSettingsSpace = {
      spaceId,
      spaceMute: Mute.Default,
    }
    const channelSettings: UserSettingsChannel = {
      spaceId,
      channelId,
      channelMute: Mute.Default,
    }
    const userSettings: UserSettings = {
      userId,
      directMessage: true,
      mention: true,
      replyTo: true,
      spaceSettings: [spaceSettings],
      channelSettings: [channelSettings],
    }
    const params: SaveSettingsRequestParams = {
      userSettings,
    }
    // create the request
    const { request, env, DB, ctx } = createTestMocks({
      route: '/api/notification-settings',
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    // replace with my own mocks to spy on
    const {
      insertIntoUserSettings,
      insertIntoUserSettingsSpace,
      insertIntoUserSettingsChannel,
    } = mockDbStatements(DB, {
      spaceId,
      channelId,
    })
    const prepareSpy = jest.spyOn(DB, 'prepare')
    const bindInsertSettingsSpy = jest.spyOn(insertIntoUserSettings, 'bind')
    const bindInsertSpaceSpy = jest.spyOn(insertIntoUserSettingsSpace, 'bind')
    const bindInsertChannelSpy = jest.spyOn(
      insertIntoUserSettingsChannel,
      'bind',
    )

    // Act
    const response = await handleRequest(request, env, ctx)

    // Assert
    expect(response.status).toBe(204)
    expect(prepareSpy).toBeCalledWith(
      expect.stringContaining('INSERT INTO UserSettings '),
    )
    expect(prepareSpy).toBeCalledWith(
      expect.stringContaining('INSERT INTO UserSettingsSpace'),
    )
    expect(prepareSpy).toBeCalledWith(
      expect.stringContaining('INSERT INTO UserSettingsChannel'),
    )
    // verify that arguments are binded to the sql statement in the expected order.
    expect(bindInsertSettingsSpy).toBeCalledWith(
      userId,
      userSettings.directMessage ? 1 : 0,
      userSettings.mention ? 1 : 0,
      userSettings.replyTo ? 1 : 0,
    )
    expect(bindInsertSpaceSpy).toBeCalledWith(
      spaceSettings.spaceId,
      userId,
      spaceSettings.spaceMute,
    )
    expect(bindInsertChannelSpy).toBeCalledWith(
      channelSettings.spaceId,
      channelSettings.channelId,
      userId,
      channelSettings.channelMute,
    )
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
    const { deleteFromUserSettings: mockStatement } = mockDbStatements(DB, {})
    const prepareSpy = jest.spyOn(DB, 'prepare')
    const bindSpy = jest.spyOn(mockStatement, 'bind')

    // Act
    const response = await handleRequest(request, env, ctx)

    // Assert
    expect(response.status).toBe(204)
    expect(prepareSpy).toBeCalledWith(
      expect.stringContaining('DELETE FROM UserSettings'),
    )
    // verify that arguments are binded to the sql statement in the expected order.
    expect(bindSpy).toBeCalledWith(userId)
  })

  test('POST /api/notification-settings -> getSettings', async () => {
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
    const { selectFromUserSettings: mockStatement } = mockDbStatements(DB, {})
    const prepareSpy = jest.spyOn(DB, 'prepare')
    const bindSpy = jest.spyOn(mockStatement, 'bind')

    // Act
    const response = await handleRequest(request, env, ctx)

    // Assert
    expect(response.status).toBe(200)
    expect(prepareSpy).toBeCalledWith(
      expect.stringContaining('SELECT') &&
        expect.stringContaining('FROM UserSettings'),
    )
    // verify that arguments are binded to the sql statement in the expected order.
    expect(bindSpy).toBeCalledWith(userId)
  })
})
