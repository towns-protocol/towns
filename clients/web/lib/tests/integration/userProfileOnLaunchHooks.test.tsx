/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ZionTestApp } from './helpers/ZionTestApp'
import { useMyProfile } from '../../src/hooks/use-my-profile'
import { registerAndStartClients } from './helpers/TestUtils'
import { LoginWithWallet } from './helpers/TestComponents'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('userProfileOnLaunchHooks', () => {
    jest.setTimeout(30000)
    test('user sees own info on next app launch', async () => {
        // create clients
        const { alice } = await registerAndStartClients(['alice'])
        // save off the provider
        const aliceProvider = alice.provider
        // set display name and avatar
        await alice.setDisplayName("Alice's your aunt")
        await alice.setAvatarUrl('alice.png')
        // stop alice
        alice.stopClient()
        // create a veiw for alice
        const TestUserProfileOnLaunch = () => {
            const myProfile = useMyProfile()
            return (
                <>
                    <LoginWithWallet />
                    <div data-testid="myProfileName">{myProfile?.displayName ?? 'unknown'}</div>
                    <div data-testid="myProfileAvatar">{myProfile?.avatarUrl ?? 'unknown'}</div>
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
        const myProfileAvatar = screen.getByTestId('myProfileAvatar')
        // verify alice name is rendering
        await waitFor(() => expect(myProfileName).toHaveTextContent("Alice's your aunt"))
        // verify alice avatar is rendering
        await waitFor(() => expect(myProfileAvatar).toHaveTextContent('alice.png'))
    }) // end test
}) // end describe
