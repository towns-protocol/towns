import {
  MentionRequestParams,
  ReplyToRequestParams,
} from '../src/request-interfaces'
import { createTestMocks, mockDbStatements } from './mock-utils'

import { NotificationKind } from '../src/types'
import { handleRequest } from '../src'
import { jest } from '@jest/globals'

describe('tag-handlers', () => {
  test('/api/tag-mention-users', async () => {
    // Arrange
    const mentionedUsers = [`0xAlice${Date.now()}`, `0xBob${Date.now()}`]
    const spaceId = `Town${Date.now()}`
    const channelId = `Channel${Date.now()}`
    const params: MentionRequestParams = {
      spaceId,
      channelId,
      userIds: mentionedUsers,
    }
    // create the request
    const { request, env, DB, ctx } = createTestMocks({
      route: '/api/tag-mention-users',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    // replace with my own mocks to spy on
    const { insertIntoNotificationTag: mockStatement } = mockDbStatements(
      DB,
      {},
    )
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
        spaceId,
        channelId,
        userId,
        NotificationKind.Mention,
      )
    }
  })

  test('/api/tag-reply-to-users', async () => {
    // Arrange
    const replyToUsers = [`0xAlice${Date.now()}`, `0xBob${Date.now()}`]
    const spaceId = `Town${Date.now()}`
    const channelId = `Channel${Date.now()}`
    const params: ReplyToRequestParams = {
      spaceId,
      channelId,
      userIds: replyToUsers,
    }
    // create the request
    const { request, env, DB, ctx } = createTestMocks({
      route: '/api/tag-reply-to-users',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    // replace with my own mocks to spy on
    const { insertIntoNotificationTag: mockStatement } = mockDbStatements(
      DB,
      {},
    )
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
        spaceId,
        channelId,
        userId,
        NotificationKind.ReplyTo,
      )
    }
  })
})
