import React from 'react'
import { PrivyProviderProps, PrivyProvider as _PrivyProvider } from '@privy-io/react-auth'

type Props = {
    children: JSX.Element
} & Omit<PrivyProviderProps, 'children'>

export function PrivyProvider({ children, ...providerProps }: Props) {
    return <_PrivyProvider {...providerProps}>{children}</_PrivyProvider>
}
