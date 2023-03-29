import { ethers } from 'ethers'
import { useCallback } from 'react'
import { useCredentialStore } from '../store/use-credential-store'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useZionContext } from '../components/ZionContextProvider'

export function useCasablancaWalletSignIn() {
    const { clientSingleton } = useZionContext()
    const { activeWalletAddress } = useWeb3Context()
    const { setCasablancaCredentials } = useCredentialStore()

    const getIsWalletRegisteredWithCasablanca = useCallback(async () => {
        // currently we don't need to register? you can just login with your wallet
        return Promise.resolve(true)
    }, [])

    const loginWithWalletToCasablanca = useCallback(async () => {
        if (!clientSingleton) {
            throw new Error('Zion client not initialized')
        }
        if (!activeWalletAddress) {
            throw new Error('No active wallet')
        }
        const delegateWallet = ethers.Wallet.createRandom()
        const casablancaContext = await clientSingleton.signCasablancaDelegate(delegateWallet)
        setCasablancaCredentials(clientSingleton.opts.casablancaServerUrl, {
            privateKey: delegateWallet.privateKey,
            creatorAddress: casablancaContext.creatorAddress,
            delegateSig: casablancaContext.delegateSig,
            loggedInWalletAddress: activeWalletAddress,
        })
    }, [activeWalletAddress, clientSingleton, setCasablancaCredentials])

    const registerWalletWithCasablanca = useCallback(async () => {
        // currently we don't need to register? you can just login with your wallet
        return loginWithWalletToCasablanca()
    }, [loginWithWalletToCasablanca])

    return {
        getIsWalletRegisteredWithCasablanca,
        loginWithWalletToCasablanca,
        registerWalletWithCasablanca,
    }
}
