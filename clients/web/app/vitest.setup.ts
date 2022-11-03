import 'vitest-canvas-mock'

import { server } from './mocks/server'

beforeAll(() => {
    server.listen()
})

beforeAll(() => {
    server.resetHandlers()
})

afterEach(() => server.resetHandlers())

afterAll(() => {
    server.close()
})
