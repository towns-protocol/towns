import { MockProxy, mock } from 'jest-mock-extended'

import { Env } from '../src'
import { createFakePushSubscription } from './fake_data'

export interface TestMocks {
  request: Request
  env: Env
  DB: MockProxy<D1Database>
  ctx: ExecutionContext
}

interface CreateRequestProps {
  route: string
  method?: string
  headers?: HeadersInit
  includeBearerToken?: boolean
  body?: BodyInit
}

export function createTestMocks({
  route,
  method = 'GET',
  headers = {},
  includeBearerToken = true,
  body,
}: CreateRequestProps): TestMocks {
  const env = getMiniflareBindings() as Env
  const ctx = mock<ExecutionContext>()
  const DB = createMockD1Database()
  env.DB = DB
  const request = createRequest(env, { route, method, headers, body })
  return {
    request,
    env,
    DB,
    ctx,
  }
}

export function createRequest(
  env: Env,
  {
    route,
    method = 'GET',
    headers = {},
    includeBearerToken = true,
    body,
  }: CreateRequestProps,
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
  const fakeSubscription = JSON.stringify(createFakePushSubscription())
  const result = {
    SpaceId: '!space-id_1:towns.com',
    ChannelId: null,
    PushType: 'web-push',
    UserId: '0x1111',
    PushSubscription: fakeSubscription,
  }
  const rawResult = [
    ['!space-id_1:towns.com', '', 'web-push', '0x1111', fakeSubscription],
  ]
  mockStatement.all.mockResolvedValue({
    results: [result],
    success: true,
    meta: {},
  })
  mockStatement.bind.mockImplementation((args: any[]) => {
    return mockStatement
  })
  mockStatement.first.mockResolvedValue(result)
  mockStatement.raw.mockResolvedValue(rawResult)
  mockStatement.run.mockResolvedValue({
    success: true,
    meta: {},
  })
  return mockStatement
}
