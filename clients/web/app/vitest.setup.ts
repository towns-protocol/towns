import 'vitest-canvas-mock'
import matchers, { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'
import { vi } from 'vitest'
import { server } from './mocks/server'

// https://github.com/testing-library/jest-dom/issues/439
// allows to use jest-dom to extend jest in tests
// but still get linting errors in dev build that need to
declare global {
    namespace Vi {
        interface JestAssertion<T = any>
            extends jest.Matchers<void, T>,
                TestingLibraryMatchers<T, void> {}
    }
}

expect.extend(matchers)

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
