import React from 'react'
import { WalletStatus, useMatrixStore, useWeb3Context } from 'use-zion-client'
import { Outlet } from 'react-router-dom'
import { Login } from './Login'

export function Main(): JSX.Element {
    const { isAuthenticated } = useMatrixStore()
    const { walletStatus } = useWeb3Context()
    const isAuthed = isAuthenticated && walletStatus !== WalletStatus.Disconnected
    return <div>{isAuthed ? <Outlet /> : <Login />}</div>
}
