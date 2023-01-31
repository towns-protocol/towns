import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import React from 'react'

interface Props {
    children: JSX.Element
}

export function TestQueryClientProvider(props: Props) {
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
    return <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
}
