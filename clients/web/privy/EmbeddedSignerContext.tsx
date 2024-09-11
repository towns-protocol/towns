import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { useEmbeddedWallet } from './useEmbeddedWallet'
import { TSigner } from 'use-towns-client'
import { ConnectedWallet, usePrivy } from '@privy-io/react-auth'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { retryGetAccessToken } from './fetchAccessToken'

const EmbeddedSignerContext = createContext<
    | {
          getSigner: () => Promise<TSigner | undefined>
          isPrivyReady: boolean
      }
    | undefined
>(undefined)

const store = create<{
    embeddedWallet: ConnectedWallet | undefined
    setEmbeddedWallet: (embeddedWallet: ConnectedWallet | undefined) => void
}>()(
    subscribeWithSelector((set) => ({
        embeddedWallet: undefined,
        setEmbeddedWallet: (embeddedWallet) => set({ embeddedWallet }),
    })),
)

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
            console.log(
                '[EmbeddedSignerContextProvider]: saving embedded wallet ',
                embeddedWallet.address,
            )
            store.getState().setEmbeddedWallet(embeddedWallet)
        }
    }, [embeddedWallet])

    const value = useGetEmbeddedSignerContext(chainId)
    return <EmbeddedSignerContext.Provider value={value}>{children}</EmbeddedSignerContext.Provider>
}

function useGetEmbeddedSignerContext(chainId: number) {
    const { ready: privyReady } = usePrivy()

    const getSigner = useCallback(async () => {
        try {
            const accessToken = await retryGetAccessToken(3)
            if (!accessToken) {
                clearEmbeddedWalletStorage()
                return
            }
        } catch (error) {
            clearEmbeddedWalletStorage()
            return
        }

        return new Promise<TSigner | undefined>((resolve) => {
            const timeoutId = setTimeout(() => {
                cleanup()
                console.log('[useGetEmbeddedSignerContext]: timed out fetching signer')
                resolve(undefined)
                // different users on the same browser, same network, consistently had very different times for the signer to be ready
            }, 5_000)

            const unsubscribe = store.subscribe(
                (s) => s.embeddedWallet,
                async (embeddedWallet) => {
                    try {
                        await embeddedWallet?.switchChain(chainId)
                        const provider = await embeddedWallet?.getEthersProvider()
                        const signer = provider?.getSigner()

                        if (signer) {
                            cleanup()
                            resolve(signer)
                        }
                    } catch (error) {
                        console.error(
                            '[useGetEmbeddedSignerContext]: Error fetching signer:',
                            error,
                        )
                        cleanup()
                        resolve(undefined)
                    }
                },
                {
                    fireImmediately: true,
                },
            )

            const cleanup = () => {
                clearTimeout(timeoutId)
                unsubscribe()
            }
        })
    }, [chainId])

    return useMemo(() => ({ getSigner, isPrivyReady: privyReady }), [getSigner, privyReady])
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
