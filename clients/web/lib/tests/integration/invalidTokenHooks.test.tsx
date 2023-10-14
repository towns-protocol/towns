/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 */
import React from 'react'
import { LoginWithAuth } from './helpers/TestComponents'
import { render, screen, waitFor } from '@testing-library/react'
import { ZionTestApp } from './helpers/ZionTestApp'
import { registerAndStartClients } from './helpers/TestUtils'
import { LoginStatus } from '../../src/hooks/login'
import { MatrixAuth } from '../../src/client/ZionClientTypes'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { createUserIdFromEthereumAddress } from '../../src/types/user-identifier'
import { TestConstants } from './helpers/TestConstants'

/// Test that the login hook returns the correct status when the token is invalid
/// disabled beause the matrix js sdk doesn't correctly catch errors in DeviceLists.doKeyDownload
/// and a few other places and the tests will fail due to unhandled promise rejections, even though
/// all defined tests pass

// Test fails 100% of the time. https://linear.app/hnt-labs/issue/HNT-474/invalidtokenhookstest-fails-100percent
describe('invalidTokenHooks', () => {
    beforeEach(() => {
        global.localStorage.clear()
        global.sessionStorage.clear()
    })
    test('test logging in with a bad auth resolves to good state', async () => {
        const provider = new ZionTestWeb3Provider()
        const chainId = (await provider.getNetwork()).chainId
        // create a new client and sign in
        const xxx = createUserIdFromEthereumAddress(provider.wallet.address, chainId)
        // make a bad auth
        const badAliceAuth: MatrixAuth = {
            userId: `@${xxx.matrixUserIdLocalpart}:localhost`,
            accessToken: '5678',
            deviceId: '9111',
        }
        // build a view for alice to render
        const TestComponent = () => {
            return (
                <>
                    <LoginWithAuth
                        auth={badAliceAuth}
                        walletAddress={xxx.accountAddress ?? '0x000'}
                    />
                </>
            )
        }

        // render it
        render(
            <ZionTestApp provider={provider}>
                <TestComponent />
            </ZionTestApp>,
        )
        // get our test elements
        const loginStatus = screen.getByTestId('loginStatus')
        // start logged in
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn))
        // and we get kicked to logged out, since the auth is bad
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedOut))
    }) // end test

    /// TODO: logging out doesn't seem to invalidate the token
    test.skip('test logging out from second source resets browser state', async () => {
        // create a new client and sign in
        const { alice } = await registerAndStartClients(['alice'])
        // grab the auth
        const aliceAuth = alice.auth!
        // stop alice
        await alice.stopClients()
        // build a view for alice to render
        const TestComponent = () => {
            return (
                <>
                    <LoginWithAuth auth={aliceAuth} walletAddress={alice.provider.wallet.address} />
                </>
            )
        }

        // render it
        render(
            <ZionTestApp provider={alice.provider} pollTimeoutMs={5000}>
                <TestComponent />
            </ZionTestApp>,
        )
        // get our test elements
        const loginStatus = screen.getByTestId('loginStatus')
        const clientRunning = screen.getByTestId('clientRunning')
        // start logged in (because we forced auth with LoginWithAuth, hopefully theres no race here)
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn))
        // our client should start up!
        await waitFor(() => expect(clientRunning).toHaveTextContent(true.toString()))
        // logout alice
        await alice.logout()
        // and we get kicked to logged out, since the auth is bad
        await waitFor(
            () => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedOut),
            TestConstants.DecaDefaultWaitForTimeout,
        )
    }) // end test
}) // end describe
