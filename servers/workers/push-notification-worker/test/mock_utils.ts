import { MockProxy, mock } from 'jest-mock-extended'

import { Env } from '../src'

export interface TestMocks {
  request: Request
  env: Env
  DB: MockProxy<D1Database>
  ctx: ExecutionContext
}

interface CreateMocksProps {
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
  includeBearerToken,
  body,
}: CreateMocksProps): TestMocks {
  const url = `http://localhost:8787/${route}` // some dummy url
  const env = getMiniflareBindings() as Env
  const ctx = mock<ExecutionContext>()
  const DB = createMockD1Database()
  env.DB = DB
  headers = modifyHeaders(headers, env, includeBearerToken)
  const request = new Request(url, { method, headers, body })
  return {
    request,
    env,
    DB,
    ctx,
  }
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

function createMockD1Database(): MockProxy<D1Database> {
  const mockD1 = mock<D1Database>()
  mockD1.prepare.mockImplementation((query: string) =>
    createMockPreparedStatement(query),
  )
  return mockD1
}

function createMockPreparedStatement(
  query: string,
): MockProxy<D1PreparedStatement> {
  const mockStatement = mock<D1PreparedStatement>()
  const r = {
    SpaceId: '!space-id_1:towns.com',
    ChannelId: null,
    PushType: 'web-push',
    UserId: '0x1111',
  }
  mockStatement.all.mockResolvedValue({
    results: [r],
    success: true,
    meta: {},
  })
  mockStatement.bind.mockImplementation((args: any[]) => {
    return mockStatement
  })
  mockStatement.run.mockResolvedValue({
    success: true,
    meta: {},
  })
  return mockStatement
}
