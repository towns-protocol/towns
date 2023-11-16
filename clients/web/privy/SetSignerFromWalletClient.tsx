import { useEffect, useRef } from 'react'
import { useWeb3Context, walletClientToSigner } from 'use-zion-client'
import { getConfig } from '@wagmi/core'
import { PrivyConnector, useSwitchNetwork } from '@privy-io/wagmi-connector'
import { usePrivy } from '@privy-io/react-auth'
import { useEmbeddedWallet } from './useEmbeddedWallet'

// in the case that the app loads and privy for some reason is late to set the Web3Context signer (or doesn't set it at all)
// this component wathches for the privy wallet to be connected and then sets the signer
export function SetSignerFromWalletClient({ chainId }: { chainId: number }) {
    const privyConnector = getPrivyConnector()
    const embeddedWallet = useEmbeddedWallet()
    const { setSigner } = useWeb3Context()
    const { authenticated } = usePrivy()

    const { switchNetworkAsync } = useSwitchNetwork({
        chainId,
    })
    const initialSet = useRef(false)

    useEffect(() => {
        if (!authenticated || !privyConnector || !embeddedWallet) {
            return
        }

        function onChange() {
            setSignerFromWalletClient({
                chainId,
                setSigner,
                embeddedWallet,
                switchNetworkAsync,
            })
        }
        // just in case app loads with non privy wallet connected,
        // and privy for some reason doesn't fire the change event to switch to the embedded wallet
        if (!initialSet.current) {
            initialSet.current = true
            setSignerFromWalletClient({
                chainId,
                setSigner,
                embeddedWallet,
                switchNetworkAsync,
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
    }, [privyConnector, embeddedWallet, chainId, setSigner, switchNetworkAsync, authenticated])
    return null
}

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
    switchNetworkAsync,
}: {
    chainId: number
    setSigner: ReturnType<typeof useWeb3Context>['setSigner']
    embeddedWallet: ReturnType<typeof useEmbeddedWallet>
    switchNetworkAsync: ReturnType<typeof useSwitchNetwork>['switchNetworkAsync']
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

    if (activeWallet?.walletClientType !== 'privy') {
        console.warn('setSignerFromWalletClient: active wallet is not privy wallet')
        return
    }

    const providerChainId = await privyConnector.getChainId()

    // privy (actually wagmi) will pick up any non-privy wallet that is connected to the site
    // and will default to the network of the first connected wallet - which could be a race between embedded wallet and others
    // privy's underlying logic for setActiveWallet is to switch the new active wallet to the network of the previously active wallet
    // so let's ensure that we are on the correct network and can make txns regardless of any other wallet connections
    if (providerChainId !== chainId) {
        try {
            console.log(
                `setSignerFromWalletClient: wrong network detected: ${providerChainId}, attempting to switch to ${chainId}`,
            )
            await switchNetworkAsync?.()
            console.log(`setSignerFromWalletClient: successfully switched networks to ${chainId}`)
        } catch (error) {
            console.error('setSignerFromWalletClient: error switching network', error)
            return
        }
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
