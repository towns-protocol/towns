import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Lib from 'use-zion-client'
import { afterEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { BrowserRouter } from 'react-router-dom'
import { ethers } from 'ethers'
import { ZLayerProvider } from '@ui'

type TestAppProps = {
    children: JSX.Element
    zionContextProviderProps?: React.ComponentProps<typeof Lib.ZionContextProvider>
    Router?: typeof MemoryRouter | typeof BrowserRouter
    initialEntries?: string[]
}

export const getWalletAddress = () => ethers.Wallet.createRandom().address

export const TestApp = (props: TestAppProps) => {
    // new query client for each test for isolation
    const Router = props.Router || MemoryRouter
    const queryClient = new QueryClient({
        logger: {
            log: console.log,
            warn: console.warn,
            // don't log network errors in tests
            error: () => null,
        },
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    })
    return (
        <ZLayerProvider>
            <QueryClientProvider client={queryClient}>
                <Lib.ZionContextProvider
                    primaryProtocol={Lib.SpaceProtocol.Matrix}
                    matrixServerUrl=""
                    casablancaServerUrl=""
                    chainId={0}
                    {...props.zionContextProviderProps}
                >
                    <Router initialEntries={props.initialEntries}>{props.children}</Router>
                </Lib.ZionContextProvider>
            </QueryClientProvider>
        </ZLayerProvider>
    )
}

// mock any element properties not implemented by jsdom
export function mockNodePropsOnRef<T>(htmlNodeProps: T): void {
    const mockRef = {
        get current() {
            return htmlNodeProps
        },
        // we need a setter here because it gets called when you
        // pass a ref to <component ref={ref} />
        set current(_value) {
            void 0
        },
    }

    const spy = vi.spyOn(React, 'useRef').mockReturnValue(mockRef)

    afterEach(() => {
        spy.mockReset()
    })
}

export function mockUseMatrixCredentials(
    args: {
        loginStatus?: Lib.LoginStatus
        loginError?: Error
        loggedInWalletAddress?: string
        isAuthenticated?: boolean
    } = {},
) {
    return {
        isAuthenticated: true,
        loginStatus: Lib.LoginStatus.LoggedIn,
        loginError: undefined,
        loggedInWalletAddress: '0x1234',
        ...args,
    }
}

export function mockUseWeb3Context() {
    return {
        sign: async () => undefined,
        activeWalletAddress: '0x1234',
        accounts: ['0x1234'],
        chains: [],
        isConnected: true,
        walletStatus: 'connected',
    }
}
