/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ZionTestApp } from './helpers/ZionTestApp'
import { useMyProfile } from '../../src/hooks/use-my-profile'
import { RegisterWallet } from './helpers/TestComponents'
import { LoginStatus } from '../../src/hooks/login'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('userProfileOnboardingHooks', () => {
    jest.setTimeout(30000)
    /// make sure that we load a user profile on launch
    test('user sees own non-null profile on first launch', async () => {
        // create provider
        const aliceProvider = new ZionTestWeb3Provider()
        // create a veiw for alice
        const TestUserProfileOnLaunch = () => {
            const myProfile = useMyProfile()
            return (
                <>
                    <RegisterWallet />
                    <div data-testid="myProfileName">{myProfile?.displayName ?? 'unknown'}</div>
                </>
            )
        }
        // render it
        render(
            <ZionTestApp provider={aliceProvider}>
                <TestUserProfileOnLaunch />
            </ZionTestApp>,
        )
        // get our test elements
        const myProfileName = screen.getByTestId('myProfileName')
        const loginStatus = screen.getByTestId('loginStatus')
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn))
        // get alices chain id
        const network = await aliceProvider.getNetwork()
        const chainId = network.chainId
        // verify alice userid is rendering
        await waitFor(() =>
            expect(myProfileName).toHaveTextContent(
                `eip155=3a${chainId}=3a${aliceProvider.wallet.address.toLowerCase()}`, // hmmm....
            ),
        )
    }) // end test
}) // end describe
