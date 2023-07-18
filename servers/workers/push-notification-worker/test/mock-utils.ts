import { MockProxy, mock } from 'jest-mock-extended'

import { Env } from '../src'
import { QueryResultSubscription } from '../src/query-interfaces'
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
  const DB = createMockD1Database()
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
  const url = `http://localhost:8787/${route}` // some dummy url
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

export function createMockD1Database(): MockProxy<D1Database> {
  const mockD1 = mock<D1Database>()
  const mockStatement = createMockPreparedStatement()
  mockD1.prepare.mockImplementation((query: string) => mockStatement)
  return mockD1
}

export function createMockPreparedStatement(): MockProxy<D1PreparedStatement> {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockStatement.bind.mockImplementation((args: any[]) => {
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
