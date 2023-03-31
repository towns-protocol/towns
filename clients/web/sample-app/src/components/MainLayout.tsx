import React from 'react'
import { WalletStatus, useMatrixCredentials, useWeb3Context } from 'use-zion-client'
import { Outlet } from 'react-router-dom'
import { Login } from './Login'

export function MainLayout(): JSX.Element {
    const { isAuthenticated } = useMatrixCredentials()
    const { walletStatus } = useWeb3Context()
    const isAuthed = isAuthenticated && walletStatus !== WalletStatus.Disconnected
    return <div>{isAuthed ? <Outlet /> : <Login />}</div>
}
