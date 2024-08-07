import { ethers, Wallet } from 'ethers'
import { useCallback, useEffect, useRef } from 'react'
import { credentialsFromSignerContext, useCredentialStore } from '../store/use-credential-store'
import { useTownsContext } from '../components/TownsContextProvider'
import { useCasablancaStore } from '../store/use-casablanca-store'
import { AuthStatus } from './login'
import { TSigner, Address } from '../types/web3-types'
import { SignerUndefinedError } from '../types/error-types'
import { makeSignerContext, SignerContext } from '@river-build/sdk'

export type CasablancaSignInCallbacks = {
    onSuccess?: (args: {
        wallet: Address
        delegateWallet: Wallet
        casablancaContext: SignerContext
    }) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError?: (error: any) => void
}

export function useCasablancaWalletSignIn() {
    const { environmentId } = useTownsContext()
    const { setCasablancaCredentials } = useCredentialStore()
    const { setAuthError, setAuthStatus } = useCasablancaStore()
    const isMounted = useRef<boolean>(true)

    useEffect(() => {
        isMounted.current = true
        return () => {
            isMounted.current = false
        }
    }, [])

    const getIsWalletRegisteredWithCasablanca = useCallback(async () => {
        // currently we don't need to register? you can just login with your wallet
        return Promise.resolve(true)
    }, [])

    const loginWithWalletToCasablanca = useCallback(
        async (
            _statement: string,
            signer: TSigner,
            { onSuccess, onError }: CasablancaSignInCallbacks = {},
        ) => {
            if (!signer) {
                throw new SignerUndefinedError()
            }
            if (!environmentId) {
                throw new Error('environmentId not set')
            }
            const delegateWallet = ethers.Wallet.createRandom()
            const wallet = (await signer.getAddress()) as Address
            try {
                const casablancaContext = await makeSignerContext(signer, delegateWallet)

                if (isMounted.current) {
                    setCasablancaCredentials(
                        environmentId,
                        credentialsFromSignerContext(wallet, delegateWallet, casablancaContext),
                    )
                    onSuccess?.({
                        wallet,
                        delegateWallet: delegateWallet,
                        casablancaContext,
                    })
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                if (isMounted.current) {
                    console.error('loginWithWalletToCasablanca error', e)
                    setAuthError({
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                        code: e?.code ?? 0,
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
                        message: e?.message ?? `${e}`,
                        error: e as Error,
                    })
                    setAuthStatus(AuthStatus.None)
                    onError?.(e)
                }
            }
        },
        [environmentId, setAuthError, setAuthStatus, setCasablancaCredentials],
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
