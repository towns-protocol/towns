import 'vitest-canvas-mock'
import { server } from './mocks/server'
import '@testing-library/jest-dom/extend-expect' // dont delete this line its needed for extending vitest expect matchers

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
