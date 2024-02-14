import 'vitest-canvas-mock'
import { server } from './mocks/server'
import '@testing-library/jest-dom/extend-expect' // dont delete this line its needed for extending vitest expect matchers
import { vi } from 'vitest'
import { act } from 'react-test-renderer'
import { ResizeObserver } from '@juggle/resize-observer' // dependency of react-hook/resize-observer
import { ConnectedWallet, EIP1193Provider } from '@privy-io/react-auth'
import { Chain } from 'wagmi'

server.listen()

vi.mock('./src/components/Transitions/MotionBox')
vi.mock('./src/ui/components/ZLayer/ZLayer')

vi.mock('./src/hooks/useAutoLoginToRiverIfEmbeddedWallet', async () => {
    const actual = await vi.importActual<
        typeof import('./src/hooks/useAutoLoginToRiverIfEmbeddedWallet')
    >('./src/hooks/useAutoLoginToRiverIfEmbeddedWallet')

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
    }
})

vi.mock('@towns/privy', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@towns/privy')>()
    return {
        ...actual,
        useGetEmbeddedSigner: () => () => {
            //empty object for fake signer
            return {}
        },
    }
})

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
