import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// don't put this in the render function w/o a memo or it will erase the cache
const queryClient = new QueryClient()

export function QueryProvider({
    children,
}: {
    children?: JSX.Element | JSX.Element[]
}): JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
