import React, { createContext, useCallback, useContext, useEffect } from 'react'
import { useEmbeddedWallet } from './useEmbeddedWallet'
import { TSigner } from 'use-zion-client'
import { usePrivyWagmi } from '@privy-io/wagmi-connector'

const EmbeddedSignerContext = createContext<(() => Promise<TSigner | undefined>) | undefined>(
    undefined,
)

export function EmbeddedSignerContextProvider({
    children,
    chainId,
}: {
    chainId: number
    children: React.ReactNode | React.ReactNode[]
}) {
    const value = useGetEmbeddedSignerContext(chainId)
    return <EmbeddedSignerContext.Provider value={value}>{children}</EmbeddedSignerContext.Provider>
}

function useGetEmbeddedSignerContext(chainId: number) {
    const embeddedWallet = useEmbeddedWallet()
    const { setActiveWallet, ready } = usePrivyWagmi()

    // make sure the embedded wallet is always active + on the right network
    // more of a sanity check than anything
    useEffect(() => {
        if (!embeddedWallet || !ready) {
            return
        }
        setActiveWallet(embeddedWallet)
    }, [chainId, embeddedWallet, ready, setActiveWallet])

    // always get the embedded signer on the correct chain
    const getSigner = useCallback(async () => {
        if (!embeddedWallet) {
            return
        }
        await embeddedWallet?.switchChain(chainId)
        const provider = await embeddedWallet.getEthersProvider()
        return provider.getSigner()
    }, [chainId, embeddedWallet])

    return getSigner
}

export function useGetEmbeddedSigner() {
    const context = useContext(EmbeddedSignerContext)
    if (!context) {
        throw new Error('useGetEmbeddedSigner must be used in a EmbeddedSignerContextProvider')
    }
    return context
}
