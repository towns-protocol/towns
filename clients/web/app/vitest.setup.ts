import 'vitest-canvas-mock'
import { server } from './mocks/server'
import '@testing-library/jest-dom/extend-expect' // dont delete this line its needed for extending vitest expect matchers
import { vi } from 'vitest'
import { act } from 'react-test-renderer'
import zustandCreate from 'zustand'

const storeResetFns = new Set<() => void>()

// resetting zustand stores between tests
// issues mocking zustand with this example https://docs.pmnd.rs/zustand/guides/testing
// wasn't picking up any files in __mocks__ folder
vi.mock('zustand', async () => {
    const actual = (await vi.importActual('zustand')) as {
        default: typeof zustandCreate
    }
    return {
        default: (createStatee) => {
            const store = actual.default(createStatee)
            const initialState = store.getState()
            storeResetFns.add(() => store.setState(initialState, true))
            return store
        },
    }
})

beforeAll(() => {
    server.listen()
})

beforeEach(() => {
    server.resetHandlers()
    act(() => storeResetFns.forEach((resetFn) => resetFn()))
})

afterAll(() => {
    server.close()
})
