import React from 'react'
import { WalletStatus, useCasablancaCredentials, useMatrixCredentials } from 'use-zion-client'
import { Outlet } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { Login } from './Login'

export function MainLayout(): JSX.Element {
    const { isAuthenticated: isAuthenticatedMatrix } = useMatrixCredentials()
    const { isAuthenticated: isAuthenticatedCasablanca } = useCasablancaCredentials()
    const { status } = useAccount()
    const isAuthed =
        (isAuthenticatedCasablanca || isAuthenticatedMatrix) && status !== WalletStatus.Disconnected
    return <div>{isAuthed ? <Outlet /> : <Login />}</div>
}
