import { MockProxy, mock } from 'jest-mock-extended'
import { Mute, NotificationType, UserSettings } from '../src/types'
import {
  QueryResultUserSettings,
  QueryResultUserSettingsAny,
  QueryResultUserSettingsChannel,
  QueryResultUserSettingsSpace,
} from '../src/settings-handlers'

import { Env } from '../src'
import { QueryResultNotificationTag } from '../src/tag-handlers'
import {
  QueryResultsDoNotDisturbUser,
  QueryResultsMutedUser,
} from '../src/notify-users-handlers'
import { createFakeWebPushSubscription } from './fake-data'

export interface TestMocks {
  request: Request
  env: Env
  DB: MockProxy<D1Database>
  ctx: ExecutionContext
}

export interface MockOptions {
  route: string
  method?: string
  headers?: HeadersInit
  body?: BodyInit
  includeBearerToken?: boolean
}

export function createTestMocks({
  route,
  method = 'GET',
  headers = {},
  body,
  includeBearerToken = true, // include the bearer token
}: MockOptions): TestMocks {
  const env = createEnv()
  const ctx = mock<ExecutionContext>()
  const DB = mock<D1Database>()
  env.DB = DB
  const request = createRequest(env, {
    route,
    method,
    headers,
    includeBearerToken,
    body,
  })
  return {
    request,
    env,
    DB,
    ctx,
  }
}

function createEnv(): Env {
  const env = getMiniflareBindings() as Env
  // keys generated with the cmd:
  //     npx web-push generate-vapid-keys --json
  env.VAPID_PRIVATE_KEY = '81lZZqxeQu7Lok5HLyWpckVlJ7H7UTi8AGYpVrVEPCM'
  env.VAPID_PUBLIC_KEY =
    'BAWR-i6Bw7Wu4DczXL4R0qOzStqKkyFr-9UC-YpdyhoKE5wNgoFzDLgFVjHOPai4zvY3F3swmLnCAy80tSVnAQo'
  return env
}

export function createRequest(
  env: Env,
  {
    route,
    method = 'GET',
    headers = {},
    includeBearerToken = true,
    body,
  }: MockOptions,
): Request {
  const url = `http://localhost:8787${route}` // some dummy url
  headers = modifyHeaders(headers, env, includeBearerToken)
  return new Request(url, { method, headers, body })
}

function modifyHeaders(
  headers: HeadersInit,
  env: Env,
  includeBearerToken?: boolean,
): HeadersInit {
  if (includeBearerToken) {
    const bearer = btoa(env.AUTH_SECRET)
    headers = { ...headers, Authorization: `Bearer ${bearer}` }
  }
  return headers
}

export interface MockDbOptions {
  spaceId?: string
  channelId?: string
  replyToUsers?: string[]
  mentionUsers?: string[]
  dndReplyToUsers?: string[]
  dndMentionUsers?: string[]
  mutedUsers?: string[]
}

export function mockDbStatements(
  DB: MockProxy<D1Database>,
  {
    spaceId = '',
    channelId = '',
    replyToUsers = [],
    mentionUsers = [],
    dndReplyToUsers = [],
    dndMentionUsers = [],
    mutedUsers = [],
  }: MockDbOptions,
) {
  const mockStatement = mockDummyStatement()
  const insertIntoPushSubscription = mockDummyStatement()
  const deleteFromPushSubscription = mockDummyStatement()
  const selectFromPushSubscription = mockSelectFromPushSubscription()
  const insertIntoNotificationTag = mockDummyStatement()
  const deleteFromNotificationTag = mockDummyStatement()
  const selectFromNotificationTag = mockSelectFromNotificationTag(
    spaceId,
    channelId,
    replyToUsers,
    mentionUsers,
  )
  const insertIntoUserSettings = mockDummyStatement()
  const insertIntoUserSettingsSpace = mockDummyStatement()
  const insertIntoUserSettingsChannel = mockDummyStatement()
  const deleteFromUserSettings = mockDummyStatement()
  const selectFromUserSettings = mockSelectFromUserSettings()
  const selectMutedUsers = mockMutedUsers(mutedUsers)
  const selectDndReplyToUsers = mockSelectDndReplyToUsers(dndReplyToUsers)
  const selectDndMentionUsers = mockSelectDndMentionUsers(dndMentionUsers)

  DB.prepare.mockImplementation((query: string) => {
    if (query.includes('SELECT') && query.includes('FROM PushSubscription')) {
      return selectFromPushSubscription
    } else if (query.includes('INSERT INTO PushSubscription')) {
      return insertIntoPushSubscription
    } else if (query.includes('DELETE FROM PushSubscription')) {
      return deleteFromPushSubscription
    } else if (
      query.includes('SELECT') &&
      query.includes('FROM NotificationTag')
    ) {
      return selectFromNotificationTag
    } else if (query.includes('INSERT INTO NotificationTag')) {
      return insertIntoNotificationTag
    } else if (query.includes('DELETE FROM NotificationTag')) {
      return deleteFromNotificationTag
    } else if (query.includes('INSERT INTO UserSettings ')) {
      // DO NOT DELETE the extra whitespace at the end
      return insertIntoUserSettings
    } else if (query.includes('INSERT INTO UserSettingsSpace')) {
      return insertIntoUserSettingsSpace
    } else if (query.includes('INSERT INTO UserSettingsChannel')) {
      return insertIntoUserSettingsChannel
    } else if (query.includes('DELETE FROM UserSettings')) {
      return deleteFromUserSettings
    } else if (query.includes('muted users')) {
      return selectMutedUsers
    } else if (query.includes('dnd replyTo users')) {
      return selectDndReplyToUsers
    } else if (query.includes('dnd mention users')) {
      return selectDndMentionUsers
    } else if (
      // this needs to be last to allow the other queries to be mocked
      query.includes('SELECT') &&
      query.includes('FROM UserSettings')
    ) {
      return selectFromUserSettings
    }
    return mockStatement
  })

  DB.batch.mockImplementation(
    async (statements: D1PreparedStatement[]): Promise<D1Result<unknown>[]> => {
      const results: D1Result<unknown>[] = []
      for (const statement of statements) {
        if (statement === selectFromNotificationTag) {
          const r = await selectFromNotificationTag.run()
          results.push(r)
        } else if (statement === selectFromUserSettings) {
          const r = await selectFromUserSettings.run()
          results.push(r)
        } else if (statement === selectMutedUsers) {
          const r = await selectMutedUsers.run()
          results.push(r)
        } else {
          const r: D1Result<unknown> = {
            results: [],
            success: true,
            meta: {},
          }
          results.push(r)
        }
      }
      return new Promise((resolve) => resolve(results))
    },
  )

  return {
    insertIntoPushSubscription,
    deleteFromPushSubscription,
    selectFromPushSubscription,
    insertIntoNotificationTag,
    selectFromNotificationTag,
    deleteFromNotificationTag,
    insertIntoUserSettings,
    insertIntoUserSettingsSpace,
    insertIntoUserSettingsChannel,
    deleteFromUserSettings,
    selectFromUserSettings,
    selectMutedUsers,
    selectDndReplyToUsers,
    selectDndMentionUsers,
  }
}

function mockSelectFromPushSubscription(): MockProxy<D1PreparedStatement> {
  const mockStatement = mock<D1PreparedStatement>()
  const fakeSubscription = JSON.stringify(createFakeWebPushSubscription())
  const result: Record<string, unknown> = {
    pushType: 'web-push',
    userId: '0x1111',
    pushSubscription: fakeSubscription,
  }
  const rawResult = [['web-push', '0x1111', fakeSubscription]]
  mockStatement.all.mockResolvedValue({
    results: [result] as unknown as string[][],
    success: true,
    meta: {},
  })
  mockStatement.first.mockResolvedValue(result)
  mockStatement.raw.mockResolvedValue(rawResult)
  mockStatement.run.mockResolvedValue({
    results: [result],
    success: true,
    meta: {},
  })
  mockStatement.bind.mockImplementation(() => {
    return mockStatement
  })
  return mockStatement
}

function mockDummyStatement(): MockProxy<D1PreparedStatement> {
  const mockStatement = mock<D1PreparedStatement>()
  const rawResult = [[]]
  const result = {}
  mockStatement.all.mockResolvedValue({
    results: [result] as unknown[][],
    success: true,
    meta: {},
  })
  mockStatement.bind.mockImplementation(() => {
    return mockStatement
  })
  mockStatement.first.mockResolvedValue(result)
  mockStatement.raw.mockResolvedValue(rawResult)
  mockStatement.run.mockResolvedValue({
    results: [result],
    success: true,
    meta: {},
  })
  return mockStatement
}

function mockSelectFromNotificationTag(
  spaceId: string = '',
  channelId: string = '',
  replyToUsers: string[] = [],
  mentionUsers: string[] = [],
): MockProxy<D1PreparedStatement> {
  const mockStatement = mock<D1PreparedStatement>()
  const results: QueryResultNotificationTag[] = []
  mockStatement.bind.mockImplementation(() => {
    replyToUsers.forEach((userId) => {
      const r = {
        userId,
        spaceId,
        channelId,
        tag: NotificationType.ReplyTo,
      }
      results.push(r)
    })
    mentionUsers.forEach((userId) => {
      const r = {
        userId,
        spaceId,
        channelId,
        tag: NotificationType.Mention,
      }
      results.push(r)
    })
    return mockStatement
  })
  mockStatement.all.mockResolvedValue({
    results: [results] as unknown as QueryResultNotificationTag[][],
    success: true,
    meta: {},
  })
  mockStatement.run.mockResolvedValue({
    results: [results] as unknown as QueryResultNotificationTag[][],
    success: true,
    meta: {},
  })
  return mockStatement
}

function mockSelectDndReplyToUsers(
  dndReplyToUsers: string[],
): MockProxy<D1PreparedStatement> {
  const mockStatement = mock<D1PreparedStatement>()
  const results: QueryResultsDoNotDisturbUser[] = []
  mockStatement.bind.mockImplementation(() => {
    dndReplyToUsers.forEach((userId) => {
      results.push({ userId })
    })
    return mockStatement
  })
  mockStatement.all.mockResolvedValue({
    results: results as unknown as QueryResultsDoNotDisturbUser[][],
    success: true,
    meta: {},
  })
  mockStatement.run.mockResolvedValue({
    results: [results] as unknown as QueryResultsDoNotDisturbUser[][],
    success: true,
    meta: {},
  })
  return mockStatement
}

function mockSelectDndMentionUsers(
  dndMentionUsers: string[],
): MockProxy<D1PreparedStatement> {
  const mockStatement = mock<D1PreparedStatement>()
  const results: QueryResultsDoNotDisturbUser[] = []
  mockStatement.bind.mockImplementation(() => {
    dndMentionUsers.forEach((userId) => {
      results.push({ userId })
    })
    return mockStatement
  })
  mockStatement.all.mockResolvedValue({
    results: results as unknown as QueryResultsDoNotDisturbUser[][],
    success: true,
    meta: {},
  })
  mockStatement.run.mockResolvedValue({
    results: [results] as unknown as QueryResultsDoNotDisturbUser[][],
    success: true,
    meta: {},
  })
  return mockStatement
}

function mockSelectFromUserSettings(): MockProxy<D1PreparedStatement> {
  const mockStatement = mock<D1PreparedStatement>()
  const results: QueryResultUserSettingsAny[] = []
  mockStatement.bind.mockImplementation((userId: string) => {
    const userSettings: QueryResultUserSettings = {
      userId,
      replyTo: 1,
      mention: 1,
      directMessage: 1,
    }
    const spaceSettings: QueryResultUserSettingsSpace = {
      userId,
      spaceId: '',
      spaceMute: Mute.Default,
    }
    const channelSettings: QueryResultUserSettingsChannel = {
      userId,
      spaceId: '',
      channelId: '',
      channelMute: Mute.Default,
    }
    results.push(userSettings, spaceSettings, channelSettings)
    return mockStatement
  })
  mockStatement.run.mockResolvedValue({
    results: [results] as unknown as QueryResultUserSettingsAny[][],
    success: true,
    meta: {},
  })
  return mockStatement
}

function mockMutedUsers(mutedUsers: string[]): MockProxy<D1PreparedStatement> {
  const mockStatement = mockDummyStatement()
  const results: QueryResultsMutedUser[] = []
  mockStatement.bind.mockImplementation(() => {
    mutedUsers.forEach((r) => {
      results.push({
        userId: r,
      })
    })
    return mockStatement
  })
  mockStatement.all.mockResolvedValue({
    results: [results] as unknown as QueryResultsMutedUser[][],
    success: true,
    meta: {},
  })
  mockStatement.run.mockResolvedValue({
    results: [results] as unknown as QueryResultsMutedUser[][],
    success: true,
    meta: {},
  })
  return mockStatement
}
