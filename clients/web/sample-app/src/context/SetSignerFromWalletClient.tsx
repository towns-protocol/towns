import React, { useEffect } from 'react'
import { useWeb3Context, walletClientToSigner } from 'use-zion-client'
import { IWeb3Context } from 'use-zion-client/dist/components/Web3ContextProvider'
import { getConfig } from '@wagmi/core'
import { PrivyConnector } from '@privy-io/wagmi-connector'
import { ConnectedWallet, usePrivy } from '@privy-io/react-auth'
import { useEmbeddedWallet } from 'hooks/useEmbeddedWallet'

async function setSignerFromWalletClient(
    chainId: number,
    setSigner: IWeb3Context['setSigner'],
    embeddedWallet: ConnectedWallet,
) {
    const config = getConfig()
    const privyConnector = config.connectors.find((c) => c.id === 'privy') as
        | PrivyConnector
        | undefined

    if (!privyConnector) {
        throw new Error("couldn't find privy connector")
    }

    // if you load the app w/ another connected wallet, i.e. MM, then that's the activeWallet before you are logged in to Privy
    let activeWallet = privyConnector.getActiveWallet()

    // privy should be switching over to the embedded wallet as soon as it's ready, but just in case it doesn't
    if (embeddedWallet && activeWallet?.address !== embeddedWallet.address) {
        await privyConnector.setActiveWallet(embeddedWallet)
        activeWallet = privyConnector.getActiveWallet()
    }

    // once privy is signed in, the activeWallet will be the privy wallet
    if (!activeWallet || activeWallet.walletClientType !== 'privy') {
        console.log('activeWallet', { activeWallet, embeddedWallet })
        throw new Error('active wallet is not privy')
    }

    // make sure the connector is ready https://github.com/wagmi-dev/references/issues/167#issuecomment-1470698087
    await privyConnector.getProvider()

    const wc = await privyConnector.getWalletClient({ chainId })

    if (!wc) {
        throw new Error("couldn't get wallet client")
    }
    setSigner(walletClientToSigner(wc))
}

// in the case that the app loads and privy for some reason is late to set the Web3Context signer (or doesn't set it at all)
// this component wathches for the privy wallet to be connected and then sets the signer
export function SetSignerFromWalletClient({ chainId }: { chainId: number }) {
    const { setSigner } = useWeb3Context()
    const embeddedWallet = useEmbeddedWallet()
    const { authenticated } = usePrivy()

    useEffect(() => {
        if (!authenticated) {
            return
        }
        if (!embeddedWallet) {
            return
        }
        void setSignerFromWalletClient(chainId, setSigner, embeddedWallet)
    }, [authenticated, chainId, embeddedWallet, setSigner])

    return <></>
}
