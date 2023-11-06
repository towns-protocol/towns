import React from 'react'
import { useWeb3Context, walletClientToSigner } from 'use-zion-client'
import { IWeb3Context } from 'use-zion-client/dist/components/Web3ContextProvider'
import { getConfig } from '@wagmi/core'
import { PrivyConnector } from '@privy-io/wagmi-connector'
import { useRetryUntilResolved } from 'hooks/useRetryUntilResolved'
import { Box, Icon } from '@ui'

export async function setSignerFromWalletClient({
    chainId,
    setSigner,
}: {
    chainId: number
    setSigner: IWeb3Context['setSigner']
}) {
    const config = getConfig()
    const privyConnector = config.connectors.find((c) => c.id === 'privy') as
        | PrivyConnector
        | undefined

    if (!privyConnector || !privyConnector.getActiveWallet()) {
        return false
    }

    try {
        // make sure the connector is ready https://github.com/wagmi-dev/references/issues/167#issuecomment-1470698087
        await privyConnector.getProvider()
    } catch (error) {
        return false
    }

    const wc = await privyConnector.getWalletClient({ chainId })

    if (wc) {
        setSigner(walletClientToSigner(wc))
        return true
    }
    return false
}

// in the case that the app loads and privy for some reason is late to set the Web3Context signer (or doesn't set it at all)
// this component wathches for the privy wallet to be connected and then sets the signer
export function SetSignerFromWalletClient({ chainId }: { chainId: number }) {
    const { signer, setSigner } = useWeb3Context()

    useRetryUntilResolved(
        () =>
            setSignerFromWalletClient({
                chainId,
                setSigner,
            }),
        100,
    )

    return (
        <Box
            horizontal
            position="fixed"
            bottom="none"
            left="none"
            right="none"
            width="100"
            style={{
                margin: 'auto',
            }}
            fontSize="xs"
            zIndex="tooltipsAbove"
        >
            Signer
            <Icon
                display="inline-block"
                size="square_xxs"
                type={signer ? 'check' : 'alert'}
                color={signer ? 'cta1' : 'error'}
            />
        </Box>
    )
}
