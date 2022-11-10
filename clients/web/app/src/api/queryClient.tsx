import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
export const queryClient = new QueryClient()

export const QueryProvider = ({ children }: { children?: JSX.Element | JSX.Element[] }) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
