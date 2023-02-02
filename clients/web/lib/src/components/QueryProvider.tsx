import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const queryClient = new QueryClient()

export function QueryProvider({
    children,
}: {
    children?: JSX.Element | JSX.Element[]
}): JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
