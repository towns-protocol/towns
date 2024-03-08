import React, { createContext, useCallback, useContext, useEffect } from 'react'
import { useEmbeddedWallet } from './useEmbeddedWallet'
import { TSigner } from 'use-towns-client'
import { usePrivyWagmi } from '@privy-io/wagmi-connector'
import { usePrivy } from '@privy-io/react-auth'

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
    const { ready: privyReady, authenticated } = usePrivy()
    const { setActiveWallet, ready: wagmiReady } = usePrivyWagmi()

    // make sure the embedded wallet is always active + on the right network
    // more of a sanity check than anything
    useEffect(() => {
        if (!embeddedWallet || !wagmiReady) {
            return
        }
        setActiveWallet(embeddedWallet)
    }, [chainId, embeddedWallet, wagmiReady, setActiveWallet])

    // always get the embedded signer on the correct chain
    const getSigner = useCallback(async () => {
        if (!privyReady) {
            console.warn('[useGetEmbeddedSignerContext] Privy not ready')
            return
        }
        if (!authenticated) {
            console.warn('[useGetEmbeddedSignerContext] not authenticated')
            return
        }
        if (!embeddedWallet) {
            console.warn('[useGetEmbeddedSignerContext] no embedded wallet')
            return
        }
        await embeddedWallet?.switchChain(chainId)
        const provider = await embeddedWallet.getEthersProvider()
        return provider.getSigner()
    }, [authenticated, chainId, embeddedWallet, privyReady])

    return getSigner
}

export function useGetEmbeddedSigner() {
    const context = useContext(EmbeddedSignerContext)
    if (!context) {
        throw new Error('useGetEmbeddedSigner must be used in a EmbeddedSignerContextProvider')
    }
    return context
}
