import React from 'react'
import { WalletStatus, useCasablancaCredentials } from 'use-towns-client'
import { Outlet } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { Login } from './Login'

export function MainLayout(): JSX.Element {
    const { isAuthenticated: isAuthenticatedCasablanca } = useCasablancaCredentials()
    const { status } = useAccount()
    const isAuthed = isAuthenticatedCasablanca && status !== WalletStatus.Disconnected
    return <div>{isAuthed ? <Outlet /> : <Login />}</div>
}
