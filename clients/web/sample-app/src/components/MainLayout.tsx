import React from 'react'
import {
    WalletStatus,
    useCasablancaCredentials,
    useMatrixCredentials,
    useWeb3Context,
} from 'use-zion-client'
import { Outlet } from 'react-router-dom'
import { Login } from './Login'

export function MainLayout(): JSX.Element {
    const { isAuthenticated: isAuthenticatedMatrix } = useMatrixCredentials()
    const { isAuthenticated: isAuthenticatedCasablanca } = useCasablancaCredentials()
    const { walletStatus } = useWeb3Context()
    const isAuthed =
        (isAuthenticatedCasablanca || isAuthenticatedMatrix) &&
        walletStatus !== WalletStatus.Disconnected
    return <div>{isAuthed ? <Outlet /> : <Login />}</div>
}
