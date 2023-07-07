import { queryClient, QueryClientProvider } from '../query/queryClient'
import React from 'react'

export function QueryProvider({
    children,
}: {
    children?: JSX.Element | JSX.Element[]
}): JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
