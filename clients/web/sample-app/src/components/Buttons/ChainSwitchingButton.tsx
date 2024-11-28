import React, { ComponentPropsWithRef, useCallback } from 'react'
import { Button } from '@mui/material'
import { useAccount, useSwitchChain } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'
import { useEnvironment } from 'hooks/use-environment'

type Props = ComponentPropsWithRef<typeof Button> & {
    children?: React.ReactNode
}

export function ChainSwitchingButton(props: Props) {
    const { baseChain } = useEnvironment()
    const { chain: walletChain } = useAccount()
    const { authenticated: privyAuthenticated } = usePrivy()

    const { switchChain } = useSwitchChain({
        mutation: {
            onSuccess: (chain) => {
                console.log('switched to network', chain)
            },
        },
    })

    const onSwitchToAppChain = useCallback(() => {
        switchChain?.({ chainId: baseChain.id })
    }, [baseChain.id, switchChain])

    if (!privyAuthenticated && baseChain.id !== walletChain?.id) {
        const { disabled: _disabled, ...rest } = props
        return (
            <Button {...rest} variant="contained" color="error" onClick={onSwitchToAppChain}>
                Switch to {baseChain.name}
            </Button>
        )
    } else {
        return <Button {...props}>{props.children}</Button>
    }
}
