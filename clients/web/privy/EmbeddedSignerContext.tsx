import React, { createContext, useCallback, useContext, useEffect } from 'react'
import { useEmbeddedWallet } from './useEmbeddedWallet'
import { TSigner } from 'use-towns-client'
import { ConnectedWallet, usePrivy } from '@privy-io/react-auth'
import { create } from 'zustand'

const EmbeddedSignerContext = createContext<(() => Promise<TSigner | undefined>) | undefined>(
    undefined,
)

const store = create<{
    embeddedWallet: ConnectedWallet | undefined
    setEmbeddedWallet: (embeddedWallet: ConnectedWallet | undefined) => void
}>((set) => ({
    embeddedWallet: undefined,
    setEmbeddedWallet: (embeddedWallet) => set({ embeddedWallet }),
}))

export function EmbeddedSignerContextProvider({
    children,
    chainId,
}: {
    chainId: number
    children: React.ReactNode | React.ReactNode[]
}) {
    const embeddedWallet = useEmbeddedWallet()
    // experimenting with saving the embedded wallet in the store b/c it seems like the embedded wallet from useWallets can be flaky??
    // and want to get the embedded wallet at time the app requests the signer, which can't do with privy hook
    //
    // don't want to deal with clearing the embeddedWallet in the store in this effect, maybe there's an instance where the wallet comes back undefined (network conditions, privy conditions, etc.)
    // instead we'll just clear it on logout - see clearEmbeddedWalletStorage
    //
    // useGetEmbeddedSignerContext below checks for privy authentication, so we'll still reject txs if the user isn't authenticated even if the embedded wallet is set
    useEffect(() => {
        if (embeddedWallet && !store.getState().embeddedWallet) {
            store.getState().setEmbeddedWallet(embeddedWallet)
        }
    }, [embeddedWallet])

    const value = useGetEmbeddedSignerContext(chainId)
    return <EmbeddedSignerContext.Provider value={value}>{children}</EmbeddedSignerContext.Provider>
}

function useGetEmbeddedSignerContext(chainId: number) {
    const { ready: privyReady, authenticated } = usePrivy()

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
        // get value at time of call
        const storedEmbeddedWallet = store.getState().embeddedWallet
        if (!storedEmbeddedWallet) {
            console.warn('[useGetEmbeddedSignerContext] no embedded wallet')
            return
        }
        await storedEmbeddedWallet?.switchChain(chainId)
        const provider = await storedEmbeddedWallet.getEthersProvider()
        return provider.getSigner()
    }, [authenticated, chainId, privyReady])

    return getSigner
}

export function useGetEmbeddedSigner() {
    const context = useContext(EmbeddedSignerContext)
    if (!context) {
        throw new Error('useGetEmbeddedSigner must be used in a EmbeddedSignerContextProvider')
    }
    return context
}

export function clearEmbeddedWalletStorage() {
    return store.getState().setEmbeddedWallet(undefined)
}
