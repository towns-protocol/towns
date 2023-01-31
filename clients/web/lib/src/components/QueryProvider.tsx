import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import React from 'react'

export function QueryProvider({
    children,
}: {
    children?: JSX.Element | JSX.Element[]
}): JSX.Element {
    const queryClient = new QueryClient()
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
