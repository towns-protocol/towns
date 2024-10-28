import React from 'react'
import { PrivyWalletReady, PrivyWalletReadyProps } from '@towns/privy'
import { TSigner } from 'use-towns-client'
import { usePrivy } from '@privy-io/react-auth'
import { Button } from '@mui/material'
import { useEnvironment } from 'hooks/use-environment'

export function WalletReady(props: Omit<PrivyWalletReadyProps, 'chainId'>) {
    const { baseChain } = useEnvironment()
    const {
        WaitForPrivy: WaitForPrivyOverride,
        WaitForWallets: WaitForWalletsOverride,
        LoginButton: LoginButtonOverride,
        children,
    } = props
    return (
        <PrivyWalletReady
            chainId={baseChain.id}
            WaitForPrivy={WaitForPrivyOverride ?? <Fallback />}
            WaitForWallets={WaitForWalletsOverride ?? <Fallback />}
            LoginButton={LoginButtonOverride ?? <LoginButton />}
        >
            {children}
        </PrivyWalletReady>
    )
}

function Fallback() {
    return <>Loading...</>
}

function LoginButton() {
    const { login: privyLogin } = usePrivy()
    return <Button onClick={privyLogin}>Reauthenticate</Button>
}

export type GetSigner = () => Promise<TSigner | undefined>
