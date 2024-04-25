import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-towns-client'
import { afterEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { BrowserRouter } from 'react-router-dom'
import { ethers } from 'ethers'
import { ZLayerProvider } from '@ui'
// eslint-disable-next-line no-restricted-imports
import { CombinedAuthContextProvider } from 'privy/useCombinedAuth'
import '@testing-library/jest-dom'
import { getCustomBaseChain, getCustomRiverChain } from 'customChains'

const environmentId = 'gamma'
const web3Deployment = Lib.getWeb3Deployment(environmentId)
const baseChain = getCustomBaseChain(web3Deployment.base.chainId)!
const riverChain = getCustomRiverChain(web3Deployment.river.chainId)!

type TestAppProps = {
    children: JSX.Element
    townsContextProviderProps?: React.ComponentProps<typeof Lib.TownsContextProvider>
    Router?: typeof MemoryRouter | typeof BrowserRouter
    initialEntries?: string[]
}

export const getWalletAddress = () => ethers.Wallet.createRandom().address

export const TestApp = (props: TestAppProps) => {
    // new query client for each test for isolation
    const Router = props.Router || MemoryRouter
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    })
    return (
        <Router initialEntries={props.initialEntries}>
            <ZLayerProvider>
                <Lib.TownsContextProvider
                    environmentId={environmentId}
                    baseChain={baseChain}
                    baseConfig={web3Deployment.base}
                    riverChain={riverChain}
                    riverConfig={web3Deployment.river}
                    {...props.townsContextProviderProps}
                >
                    <CombinedAuthContextProvider>
                        <QueryClientProvider client={queryClient}>
                            {props.children}
                        </QueryClientProvider>
                    </CombinedAuthContextProvider>
                </Lib.TownsContextProvider>
            </ZLayerProvider>
        </Router>
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

export function mockUseConnectivity(): ReturnType<typeof Lib.useConnectivity> {
    return {
        login: () => Promise.resolve(),
        logout: () => Promise.resolve(),
        register: () => Promise.resolve(),
        getIsWalletRegistered: () => Promise.resolve(true),
        loggedInWalletAddress: '0x1234',
        isAuthenticated: true,
        loginStatus: Lib.LoginStatus.LoggedIn,
        loginError: null,
    }
}
