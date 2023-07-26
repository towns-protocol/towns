import { MockProxy, mock } from 'jest-mock-extended'

import { Env } from '../src'
import { NotificationSettings } from '../src/types'
import { QueryResultNotificationSettings } from '../src/settings-handlers'
import { QueryResultNotificationTag } from '../src/tag-handlers'
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

export function mockPreparedStatements(DB: MockProxy<D1Database>) {
  const mockStatement = mockDummyStatement()
  const insertIntoPushSubscription = mockDummyStatement()
  const deleteFromPushSubscription = mockDummyStatement()
  const selectFromPushSubscription = mockSelectFromPushSubscription()
  const insertIntoNotificationTag = mockDummyStatement()
  const deleteFromNotificationTag = mockDummyStatement()
  const selectFromNotificationTag = mockSelectFromNotificationTag()
  const insertIntoNotificationSettings = mockDummyStatement()
  const deleteFromNotificationSettings = mockDummyStatement()
  const selectFromNotificationSettings = mockSelectFromNotificationSettings()

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
    } else if (query.includes('INSERT INTO NotificationSettings')) {
      return insertIntoNotificationSettings
    } else if (query.includes('DELETE FROM NotificationSettings')) {
      return deleteFromNotificationSettings
    } else if (
      query.includes('SELECT') &&
      query.includes('FROM NotificationSettings')
    ) {
      return selectFromNotificationSettings
    }
    return mockStatement
  })

  DB.batch.mockImplementation(
    (statements: D1PreparedStatement[]): Promise<D1Result<unknown>[]> => {
      const results: D1Result<unknown>[] = []
      for (const statement of statements) {
        if (statement === selectFromNotificationTag) {
          selectFromNotificationTag.all().then((r) => {
            results.push(r)
          })
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
    insertIntoNotificationSettings,
    deleteFromNotificationSettings,
    selectFromNotificationSettings,
    mockStatement,
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

function mockSelectFromNotificationTag(): MockProxy<D1PreparedStatement> {
  const mockStatement = mock<D1PreparedStatement>()
  const result: QueryResultNotificationTag[] = []
  mockStatement.bind.mockImplementation(
    (townId: string, channelId: string, userId: string, tag: string) => {
      result.push({
        townId,
        channelId,
        userId,
        tag,
      })
      return mockStatement
    },
  )
  mockStatement.all.mockResolvedValue({
    results: [result] as unknown as QueryResultNotificationTag[][],
    success: true,
    meta: {},
  })
  return mockStatement
}

function mockSelectFromNotificationSettings(): MockProxy<D1PreparedStatement> {
  const mockStatement = mock<D1PreparedStatement>()
  const results: QueryResultNotificationSettings[] = []
  const settings: NotificationSettings = {
    muteSettings: {
      mutedChannels: {},
      mutedSpaces: {},
    },
  }
  mockStatement.bind.mockImplementation((userId: string) => {
    results.push({
      userId,
      settings: JSON.stringify(settings),
    })
    return mockStatement
  })
  mockStatement.run.mockResolvedValue({
    results: [results] as unknown as QueryResultNotificationSettings[][],
    success: true,
    meta: {},
  })
  return mockStatement
}
