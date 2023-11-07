import React from 'react'
import { useWeb3Context, walletClientToSigner } from 'use-zion-client'
import { IWeb3Context } from 'use-zion-client/dist/components/Web3ContextProvider'
import { getConfig } from '@wagmi/core'
import { PrivyConnector } from '@privy-io/wagmi-connector'
import { useRetryUntilResolved } from 'hooks/useRetryUntilResolved'
import { Box, Icon } from '@ui'
import { useEmbeddedWallet } from 'hooks/useEmbeddedWallet'

export async function setSignerFromWalletClient({
    chainId,
    setSigner,
    embeddedWallet,
}: {
    chainId: number
    setSigner: IWeb3Context['setSigner']
    embeddedWallet: ReturnType<typeof useEmbeddedWallet>
}) {
    const config = getConfig()
    const privyConnector = config.connectors.find((c) => c.id === 'privy') as
        | PrivyConnector
        | undefined

    if (!privyConnector) {
        return false
    }

    // if you load the app w/ another connected wallet, i.e. MM, then that's the activeWallet before you are logged in to Privy
    let activeWallet = privyConnector.getActiveWallet()

    // privy should be switching over to the embedded wallet as soon as it's ready, but just in case it doesn't
    if (embeddedWallet && activeWallet?.address !== embeddedWallet.address) {
        await privyConnector.setActiveWallet(embeddedWallet)
        activeWallet = privyConnector.getActiveWallet() // refetch the active wallet, probably not necessary just make sure it worked
    }

    // once privy is signed in, the activeWallet will be the privy wallet
    if (!activeWallet || activeWallet.walletClientType !== 'privy') {
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
    const embeddedWallet = useEmbeddedWallet()

    useRetryUntilResolved(
        () =>
            setSignerFromWalletClient({
                chainId,
                setSigner,
                embeddedWallet,
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
