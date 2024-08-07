/**
 * @group core
 */

import React, { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { useCasablancaWalletSignIn } from '../../src/hooks/use-casablanca-wallet-signin'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TSigner } from '../../src/types/web3-types'
import { registerAndStartClients } from '../integration/helpers/TestUtils'
import { TownsTestApp } from '../integration/helpers/TownsTestApp'

describe('useCasablancaWalletSignIn', () => {
    test('fires onSuccess callback', async () => {
        const { alice } = await registerAndStartClients(['alice'])

        render(
            <TownsTestApp provider={alice.provider}>
                <SignIn signer={alice.provider.wallet} />
            </TownsTestApp>,
        )

        const signInButton = screen.getByTestId('sign-in')

        fireEvent.click(signInButton)
        await waitFor(() => expect(screen.getByTestId('success')).toBeInTheDocument())
    })

    test('fires onErrorCallback callback', async () => {
        const { alice } = await registerAndStartClients(['alice'])
        const signer = new ErrorSigner(ethers.Wallet.createRandom())

        render(
            <TownsTestApp provider={alice.provider}>
                <SignIn signer={signer} />
            </TownsTestApp>,
        )

        const signInButton = screen.getByTestId('sign-in')

        fireEvent.click(signInButton)
        await waitFor(() => expect(screen.getByTestId('error')).toBeInTheDocument())
    })
})

function SignIn({ signer }: { signer: TSigner }) {
    const { loginWithWalletToCasablanca } = useCasablancaWalletSignIn()
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState(false)

    const loginWithCallbacks = useCallback(async () => {
        await loginWithWalletToCasablanca('statement', signer, {
            onSuccess: () => {
                setSuccess(true)
            },
            onError: () => {
                setError(true)
            },
        })
    }, [loginWithWalletToCasablanca, signer])
    return (
        <div>
            <button onClick={() => void loginWithCallbacks()} data-testid="sign-in">
                Sign In
            </button>
            {success && <div data-testid="success">Success</div>}
            {error && <div data-testid="error">Error</div>}
        </div>
    )
}

// this is easier than trying to figure out ESM module mocking of river-build/sdk with jest
class ErrorSigner extends ethers.Signer {
    constructor(private readonly _signer: ethers.Signer) {
        super()
    }

    getAddress(): Promise<string> {
        return this._signer.getAddress()
    }

    signMessage(): Promise<string> {
        throw new Error('Method not implemented.')
    }

    signTransaction(): Promise<string> {
        throw new Error('Method not implemented.')
    }

    connect(provider: ethers.providers.Provider): ethers.Signer {
        return this._signer.connect(provider)
    }
}
