import React from 'react'
import { queryClient, QueryClientProvider } from '../../../src/query/queryClient'

interface Props {
    children: JSX.Element
}

export function TestQueryClientProvider(props: Props) {
    return <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
}
