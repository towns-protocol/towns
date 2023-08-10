import 'vitest-canvas-mock'
import { server } from './mocks/server'
import '@testing-library/jest-dom/extend-expect' // dont delete this line its needed for extending vitest expect matchers
import { vi } from 'vitest'
import { act } from 'react-test-renderer'
import { ResizeObserver } from '@juggle/resize-observer' // dependency of react-hook/resize-observer

vi.mock('./src/components/Transitions/MotionBox')
vi.mock('./src/ui/components/ZLayer/ZLayer')

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
    globalThis.ResizeObserver = ResizeObserver
    // for @coinbase/wallet-sdk via rainbowkit from lib, throws errors when no network connection
    globalThis.WebSocket = class extends WebSocket {
        onclose: ((this: WebSocket, ev: CloseEvent) => any) | null
    }

    server.listen()
})

beforeEach(() => {
    window.HTMLElement.prototype.scrollBy = () => {}
    window.HTMLElement.prototype.scrollTo = () => {}
    window.HTMLElement.prototype.scrollIntoView = () => {}

    server.resetHandlers()
    act(() => storeResetFns.forEach((resetFn) => resetFn()))
})

afterAll(() => {
    server.close()
})
