import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Zion from 'use-zion-client'
import { afterEach, vi } from 'vitest'

type TestAppProps = {
    children: JSX.Element
    zionContextProviderProps?: React.ComponentProps<typeof Zion.ZionContextProvider>
}

export const TestApp = (props: TestAppProps) => {
    // new query client for each test for isolation
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
        <QueryClientProvider client={queryClient}>
            <Zion.ZionContextProvider
                disableEncryption
                homeServerUrl=""
                {...props.zionContextProviderProps}
            >
                {props.children}
            </Zion.ZionContextProvider>
        </QueryClientProvider>
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
