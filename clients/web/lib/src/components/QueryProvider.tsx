import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../query/queryClient'
import React from 'react'

export function QueryProvider({
    children,
}: {
    children?: JSX.Element | JSX.Element[]
}): JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
