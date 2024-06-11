/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
/**
 * @group core
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { TownsTestApp } from './helpers/TownsTestApp'
import { useMyProfile } from '../../src/hooks/use-my-profile'
import { RegisterWallet } from './helpers/TestComponents'
import { AuthStatus } from '../../src/hooks/login'
import { TownsTestWeb3Provider } from './helpers/TownsTestWeb3Provider'
import { TestConstants } from './helpers/TestConstants'

describe('userProfileOnboardingHooks', () => {
    /// make sure that we load a user profile on launch
    test('user sees own non-null profile on first launch', async () => {
        // create provider
        const aliceProvider = new TownsTestWeb3Provider()

        // create a veiw for alice
        const TestUserProfileOnLaunch = () => {
            const myProfile = useMyProfile()
            return (
                <>
                    <RegisterWallet signer={aliceProvider.wallet} />
                    <div data-testid="myProfileName">{myProfile?.displayName ?? 'unknown'}</div>
                </>
            )
        }
        // render it
        render(
            <TownsTestApp provider={aliceProvider}>
                <TestUserProfileOnLaunch />
            </TownsTestApp>,
        )
        // get our test elements
        await waitFor(
            () => expect(screen.getByTestId('clientRunning')).toHaveTextContent('true'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
        const myProfileName = screen.getByTestId('myProfileName')
        const authStatus = screen.getByTestId('authStatus')
        await waitFor(() => expect(authStatus).toHaveTextContent(AuthStatus.Credentialed))

        // verify alice userid is rendering
        await waitFor(() => expect(myProfileName).toHaveTextContent(aliceProvider.wallet.address))
    }) // end test
}) // end describe
