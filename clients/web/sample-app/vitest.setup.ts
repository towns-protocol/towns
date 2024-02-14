import React from 'react'
import 'vitest-canvas-mock'
import { vi } from 'vitest'
import { ResizeObserver } from '@juggle/resize-observer' // dependency of react-hook/resize-observer
import { ConnectedWallet } from '@privy-io/react-auth'
import { Chain } from 'wagmi'

beforeAll(() => {
    globalThis.ResizeObserver = ResizeObserver
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

// mock privy hooks b/c we don't use PrivyProvider in tests b/c it makes a lot of requests that we have to mock
vi.mock('@privy-io/react-auth', async () => {
    const actual = await vi.importActual<typeof import('@privy-io/react-auth')>(
        '@privy-io/react-auth',
    )
    return {
        ...actual,
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
        EmbeddedSignerContextProvider: ({ children }: { children: React.ReactNode }) => {
            return children
        },
        useGetEmbeddedSigner: () => () => {
            //empty object for fake signer
            return {}
        },
    }
})
