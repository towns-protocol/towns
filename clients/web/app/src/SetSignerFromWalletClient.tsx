import React, { useEffect, useRef } from 'react'
import { useWeb3Context, walletClientToSigner } from 'use-zion-client'
import { IWeb3Context } from 'use-zion-client/dist/components/Web3ContextProvider'
import { getConfig } from '@wagmi/core'
import { PrivyConnector, usePrivyWagmi } from '@privy-io/wagmi-connector'
import { Box, Icon, Text } from '@ui'
import { useEmbeddedWallet } from 'hooks/useEmbeddedWallet'
import { shortAddress } from 'ui/utils/utils'

function getPrivyConnector() {
    const config = getConfig()
    const privyConnector = config.connectors.find((c) => c.id === 'privy') as
        | PrivyConnector
        | undefined
    return privyConnector
}

async function setSignerFromWalletClient({
    chainId,
    setSigner,
    embeddedWallet,
}: {
    chainId: number
    setSigner: IWeb3Context['setSigner']
    embeddedWallet: ReturnType<typeof useEmbeddedWallet>
}) {
    const privyConnector = getPrivyConnector()

    if (!privyConnector) {
        console.warn('setSignerFromWalletClient: privy connector not found')
        return
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
        console.warn('setSignerFromWalletClient: active wallet is not privy wallet')
        return
    }

    try {
        // make sure the connector is ready https://github.com/wagmi-dev/references/issues/167#issuecomment-1470698087
        await privyConnector.getProvider()
    } catch (error) {
        console.error(
            'setSignerFromWalletClient: error getting provider from privy connector',
            error,
        )
        return
    }

    const wc = await privyConnector.getWalletClient({ chainId })
    setSigner(walletClientToSigner(wc))
}

// in the case that the app loads and privy for some reason is late to set the Web3Context signer (or doesn't set it at all)
// this component wathches for the privy wallet to be connected and then sets the signer
export function SetSignerFromWalletClient({ chainId }: { chainId: number }) {
    const { signer } = useWeb3Context()
    const [signerAddress, setSignerAddress] = React.useState<string | undefined>()
    const { wallet: activeWallet } = usePrivyWagmi()

    useEffect(() => {
        if (signer) {
            signer.getAddress().then(setSignerAddress)
        } else {
            setSignerAddress(undefined)
        }
    }, [signer])

    usePrivyConnectorEventListener({
        chainId,
    })

    return (
        <Box
            horizontal
            gap="sm"
            position="fixed"
            top="none"
            left="none"
            fontSize="xs"
            zIndex="tooltipsAbove"
            rounded="sm"
            background="readability"
            pointerEvents="none"
        >
            <Box horizontal>
                <Text size="xs">
                    Signer: {shortAddress(signerAddress ?? '')} <br />
                </Text>
                <Icon
                    display="inline-block"
                    size="square_xxs"
                    type={signer ? 'check' : 'alert'}
                    color={signer ? 'cta1' : 'error'}
                />
            </Box>
            <Text size="xs">Active wallet: {shortAddress(activeWallet?.address ?? '')}</Text>
        </Box>
    )
}

function usePrivyConnectorEventListener({ chainId }: { chainId: number }) {
    const privyConnector = getPrivyConnector()
    const embeddedWallet = useEmbeddedWallet()
    const { setSigner } = useWeb3Context()
    const initialSet = useRef(false)

    useEffect(() => {
        if (!privyConnector) {
            return
        }

        function onChange() {
            setSignerFromWalletClient({
                chainId,
                setSigner,
                embeddedWallet,
            })
        }
        // just in case app loads with non privy wallet connected,
        // and privy for some reason doesn't fire the change event to switch to the embedded wallet
        if (embeddedWallet && !initialSet.current) {
            initialSet.current = true
            setSignerFromWalletClient({
                chainId,
                setSigner,
                embeddedWallet,
            })
        }

        privyConnector.on('change', onChange)
        // Other methods available
        // privyConnector.on('connect', onConnect)
        // privyConnector.on('disconnect', onDisconnect)
        // privyConnector.on('error', onError)
        // privyConnector.on('message', onMessage)
        return () => {
            privyConnector.off('change', onChange)
        }
    }, [privyConnector, embeddedWallet, chainId, setSigner])
}
