import React, { ComponentPropsWithRef, useCallback } from 'react'
import { Button } from '@mui/material'
import { useNetwork, useSwitchNetwork } from 'wagmi'
import { usePrivy } from '@privy-io/react-auth'
import { useEnvironment } from 'hooks/use-environment'

type Props = ComponentPropsWithRef<typeof Button> & {
    children?: React.ReactNode
}

export function ChainSwitchingButton(props: Props) {
    const { chainName, chainId } = useEnvironment()
    const { chain: walletChain } = useNetwork()
    const { authenticated: privyAuthenticated } = usePrivy()

    const { switchNetwork } = useSwitchNetwork({
        onSuccess: (chain) => {
            console.log('switched to network', chain)
        },
    })

    const onSwitchToAppChain = useCallback(() => {
        switchNetwork?.(chainId)
    }, [chainId, switchNetwork])

    if (!privyAuthenticated && chainId !== walletChain?.id) {
        const { disabled: _disabled, ...rest } = props
        return (
            <Button {...rest} variant="contained" color="error" onClick={onSwitchToAppChain}>
                Switch to {chainName}
            </Button>
        )
    } else {
        return <Button {...props}>{props.children}</Button>
    }
}
