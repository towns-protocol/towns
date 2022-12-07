/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import React, { useCallback } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { LoginStatus } from '../../src/hooks/login'
import { TestConstants } from './helpers/TestConstants'
import { WalletStatus } from '../../src/types/web3-types'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { useMatrixStore } from '../../src/store/use-matrix-store'
import { useWeb3Context } from '../../src/components/Web3ContextProvider'
import { useZionClient } from '../../src/hooks/use-zion-client'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('walletStatusHooks', () => {
    jest.setTimeout(TestConstants.DefaultJestTimeout)
    test('new user registers a new wallet and is logged in', async () => {
        // create a provider for bob
        const bobProvider = new ZionTestWeb3Provider()
        // create a veiw for the wallet
        const TestWalletStatus = () => {
            const { walletStatus, chain } = useWeb3Context()
            const { loginStatus, loginError } = useMatrixStore()
            const { registerWallet } = useZionClient()
            const onRegisterWallet = useCallback(() => {
                void registerWallet('...register?')
            }, [registerWallet])
            return (
                <>
                    <div data-testid="walletStatus">{walletStatus}</div>
                    <div data-testid="chainId">{chain?.id.toString() ?? 'undefined'}</div>
                    <div data-testid="loginStatus">{loginStatus}</div>
                    <div data-testid="loginError">{loginError?.message ?? ''}</div>
                    <button onClick={onRegisterWallet}>Register</button>
                </>
            )
        }
        // render it
        render(
            <ZionTestApp provider={bobProvider}>
                <TestWalletStatus />
            </ZionTestApp>,
        )
        // get our test elements
        const walletStatus = screen.getByTestId('walletStatus')
        const loginStatus = screen.getByTestId('loginStatus')
        const loginError = screen.getByTestId('loginError')
        const registerButton = screen.getByRole('button', { name: 'Register' })
        // wait for our wallet to get unlocked
        await waitFor(() => expect(walletStatus.textContent).toBe(WalletStatus.Connected))
        // verify that we are logged out without error
        await waitFor(() => expect(loginStatus.textContent).toBe(LoginStatus.LoggedOut))
        await waitFor(() => expect(loginError.textContent).toBe(''))
        // click the register button
        fireEvent.click(registerButton)
        // expect our status to change to logged in
        await waitFor(() => expect(loginStatus.textContent).toBe(LoginStatus.LoggedIn))
    })
})
