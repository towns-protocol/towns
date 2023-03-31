import 'vitest-canvas-mock'
import { server } from './mocks/server'
import '@testing-library/jest-dom/extend-expect' // dont delete this line its needed for extending vitest expect matchers
import { vi } from 'vitest'
import { act } from 'react-test-renderer'

vi.mock('./src/components/Transitions/MotionBox')

const storeResetFns = new Set<() => void>()

// resetting zustand stores between tests
vi.mock('zustand', async () => {
    const actual = await vi.importActual<typeof import('zustand')>('zustand')
    return {
        create: (createStatee) => {
            const { create } = actual
            const store = create(createStatee)
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
