import 'vitest-canvas-mock'
import { server } from './mocks/server'
import '@testing-library/jest-dom/extend-expect' // dont delete this line its needed for extending vitest expect matchers
import { vi } from 'vitest'
import { act } from 'react-test-renderer'
import { ResizeObserver } from '@juggle/resize-observer' // dependency of react-hook/resize-observer
import { ConnectedWallet, EIP1193Provider, PrivyProvider } from '@privy-io/react-auth'
import { Chain } from 'viem'
import * as zustand from 'zustand'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

server.listen()

vi.mock('./src/components/Transitions/MotionBox')
vi.mock('./src/ui/components/ZLayer/ZLayer')

vi.mock('./src/privy/useAutoLoginToRiverIfEmbeddedWallet', async () => {
    const actual = await vi.importActual<
        typeof import('./src/privy/useAutoLoginToRiverIfEmbeddedWallet')
    >('./src/privy/useAutoLoginToRiverIfEmbeddedWallet')

    return {
        ...actual,
        useAutoLoginToRiverIfEmbeddedWallet: () => {
            return {
                isAutoLoggingInToRiver: false,
            }
        },
    }
})

// mock privy hooks b/c we don't use PrivyProvider in tests b/c it makes a lot of requests that we have to mock
vi.mock('@privy-io/react-auth', async () => {
    return {
        usePrivy: () => ({
            ready: true,
            authenticated: true,
            logout: () => {},
        }),
        useLogin: () => ({
            login: () => {},
        }),
        useWallets: (): { wallets: ConnectedWallet[] } => ({
            wallets: [
                {
                    address: '0xc0ffee254729296a45a3885639AC7E10F9d54979',
                    chainId: 'localhost',
                    walletClientType: 'privy',
                    connectorType: 'privy',
                    linked: true,
                    loginOrLink: () => Promise.resolve(),
                    fund: () => Promise.resolve(),
                    unlink: () => Promise.resolve(),
                    isConnected: () => Promise.resolve(true),
                    switchChain: () => Promise.resolve(),
                    // @ts-ignore
                    getEthereumProvider: () => Promise.resolve(),
                    // @ts-ignore
                    getEthersProvider: () => Promise.resolve(),
                    // @ts-ignore
                    getWeb3jsProvider: () => Promise.resolve(),
                },
            ],
        }),
        addRpcUrlOverrideToChain: (c: Chain) => c,
        PrivyProvider: ({ children }: { children: JSX.Element }) => children,
    }
})

vi.mock('@towns/privy', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@towns/privy')>()
    return {
        ...actual,
        useGetEmbeddedSigner: () => {
            //empty object for fake signer
            return {
                getSigner: () => ({} as EIP1193Provider),
                isPrivyReady: true,
            }
        },
    }
})

beforeAll(() => {
    globalThis.ResizeObserver = ResizeObserver
    // for @coinbase/wallet-sdk via rainbowkit from lib, throws errors when no network connection
    globalThis.WebSocket = class extends WebSocket {
        onclose: ((this: WebSocket, ev: CloseEvent) => any) | null
    }
})

beforeEach(() => {
    window.HTMLElement.prototype.scrollBy = () => {}
    window.HTMLElement.prototype.scrollTo = () => {}
    window.HTMLElement.prototype.scrollIntoView = () => {}

    server.resetHandlers()
})

afterAll(() => {
    server.close()
})

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

// https://zustand.docs.pmnd.rs/guides/testing
//////////////////////
// ZUSTAND STORES ////
//////////////////////
const { create: actualCreate, createStore: actualCreateStore } = await vi.importActual<
    typeof zustand
>('zustand')

// a variable to hold reset functions for all stores declared in the app
export const storeResetFns = new Set<() => void>()

const createUncurried = <T>(stateCreator: zustand.StateCreator<T>) => {
    const store = actualCreate(stateCreator)
    const initialState = store.getInitialState()
    storeResetFns.add(() => {
        store.setState(initialState, true)
    })
    return store
}

// when creating a store, we get its initial state, create a reset function and add it in the set
export const create = (<T>(stateCreator: zustand.StateCreator<T>) => {
    console.log('zustand create mock')

    // to support curried version of create
    return typeof stateCreator === 'function' ? createUncurried(stateCreator) : createUncurried
}) as typeof zustand.create

const createStoreUncurried = <T>(stateCreator: zustand.StateCreator<T>) => {
    const store = actualCreateStore(stateCreator)
    const initialState = store.getInitialState()
    storeResetFns.add(() => {
        store.setState(initialState, true)
    })
    return store
}

// when creating a store, we get its initial state, create a reset function and add it in the set
export const createStore = (<T>(stateCreator: zustand.StateCreator<T>) => {
    console.log('zustand createStore mock')

    // to support curried version of createStore
    return typeof stateCreator === 'function'
        ? createStoreUncurried(stateCreator)
        : createStoreUncurried
}) as typeof zustand.createStore

// reset all stores after each test run
afterEach(() => {
    act(() => {
        storeResetFns.forEach((resetFn) => {
            resetFn()
        })
    })
})

//////////////////////
// END ZUSTAND ///////
//////////////////////
