import { ethers } from 'ethers'
import { useCallback } from 'react'
import { useCredentialStore } from '../store/use-credential-store'
import { useTownsContext } from '../components/TownsContextProvider'
import { useCasablancaStore } from '../store/use-casablanca-store'
import { LoginStatus } from './login'
import { bin_toHexString } from '@river/dlog'
import { TSigner, Address } from '../types/web3-types'
import { SignerUndefinedError } from '../types/error-types'
import { makeSignerContext } from '@river/sdk'

export function useCasablancaWalletSignIn() {
    const { casablancaServerUrl } = useTownsContext()
    const { setCasablancaCredentials } = useCredentialStore()
    const { setLoginError, setLoginStatus } = useCasablancaStore()

    const getIsWalletRegisteredWithCasablanca = useCallback(async () => {
        // currently we don't need to register? you can just login with your wallet
        return Promise.resolve(true)
    }, [])

    const loginWithWalletToCasablanca = useCallback(
        async (_statement: string, signer: TSigner) => {
            if (!signer) {
                throw new SignerUndefinedError()
            }
            if (!casablancaServerUrl) {
                throw new Error('Casablanca server url not set')
            }
            const delegateWallet = ethers.Wallet.createRandom()
            const wallet = (await signer.getAddress()) as Address
            try {
                const casablancaContext = await makeSignerContext(signer, delegateWallet)
                setCasablancaCredentials(casablancaServerUrl, {
                    privateKey: delegateWallet.privateKey,
                    creatorAddress: ethers.utils.getAddress(
                        bin_toHexString(casablancaContext.creatorAddress),
                    ),
                    delegateSig: casablancaContext.delegateSig
                        ? bin_toHexString(casablancaContext.delegateSig)
                        : undefined,
                    loggedInWalletAddress: wallet,
                })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                console.error('loginWithWalletToCasablanca error', e)
                setLoginError({
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    code: e?.code ?? 0,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
                    message: e?.message ?? `${e}`,
                    error: e as Error,
                })
                setLoginStatus(LoginStatus.LoggedOut)
            }
        },
        [casablancaServerUrl, setCasablancaCredentials, setLoginError, setLoginStatus],
    )

    const registerWalletWithCasablanca = useCallback(
        async (statement: string, signer: TSigner) => {
            // currently we don't need to register? you can just login with your wallet
            return loginWithWalletToCasablanca(statement, signer)
        },
        [loginWithWalletToCasablanca],
    )

    return {
        getIsWalletRegisteredWithCasablanca,
        loginWithWalletToCasablanca,
        registerWalletWithCasablanca,
    }
}
