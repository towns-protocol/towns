/* eslint-disable @typescript-eslint/no-non-null-assertion */
import React from 'react'
import { LoginWithAuth } from './helpers/TestComponents'
import { render, screen, waitFor } from '@testing-library/react'
import { ZionTestApp } from './helpers/ZionTestApp'
import { registerAndStartClients } from './helpers/TestUtils'
import { useWeb3Context } from '../../src/components/Web3ContextProvider'
import { LoginStatus } from '../../src/hooks/login'
import { ZionAuth } from '../../src/client/ZionClientTypes'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { createUserIdFromEthereumAddress } from '../../src/types/user-identifier'
import { ZionTestClient } from './helpers/ZionTestClient'
import { useMatrixStore } from '../../src/store/use-matrix-store'
import { useCredentialStore } from '../../src/store/use-credential-store'

/// Test that the login hook returns the correct status when the token is invalid
/// disabled beause the matrix js sdk doesn't correctly catch errors in DeviceLists.doKeyDownload
/// and a few other places and the tests will fail due to unhandled promise rejections, even though
/// all defined tests pass

// Test fails 100% of the time. https://linear.app/hnt-labs/issue/HNT-474/invalidtokenhookstest-fails-100percent
describe.skip('invalidTokenHooks', () => {
    beforeEach(() => {
        global.localStorage.clear()
        global.sessionStorage.clear()
        useMatrixStore.destroy()
        useCredentialStore.destroy()
    })
    test('test matrix js sdk', async () => {
        const provider = new ZionTestWeb3Provider()
        const chainId = (await provider.getNetwork()).chainId
        // create a new client and sign in
        const xxx = createUserIdFromEthereumAddress(provider.wallet.address, chainId)
        const badAliceAuth: ZionAuth = {
            userId: xxx.matrixUserIdLocalpart,
            accessToken: '5678',
            deviceId: '9111',
        }
        const alice = new ZionTestClient(chainId, 'alice')
        //await expect(alice.startClient(badAliceAuth, chainId)).rejects.toThrow('Unknown token')
        await alice.startClient(badAliceAuth, chainId)
    })
    test('test logging in with a bad auth resolves to good state', async () => {
        const provider = new ZionTestWeb3Provider()
        const chainId = (await provider.getNetwork()).chainId
        // create a new client and sign in
        const xxx = createUserIdFromEthereumAddress(provider.wallet.address, chainId)
        // make a bad auth
        const badAliceAuth: ZionAuth = {
            userId: xxx.matrixUserIdLocalpart,
            accessToken: '5678',
            deviceId: '9111',
        }
        // build a view for alice to render
        const TestComponent = () => {
            const { isConnected } = useWeb3Context()

            return (
                <>
                    <LoginWithAuth auth={badAliceAuth} />
                    <div data-testid="isConnected">{isConnected.toString()}</div>
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
        // start logged in (because we forced auth with LoginWithAuth, hopefully theres no race here)
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn))
        // and we get kicked to logged out, since the auth is bad
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedOut))
        console.log('!!! tests pass !!!')
    }) // end test

    test('test logging out from second source resets browser state', async () => {
        // create a new client and sign in
        const { alice } = await registerAndStartClients(['alice'])
        // grab the auth
        const aliceAuth = alice.auth!
        // stop alice
        alice.stopClient()
        // build a view for alice to render
        const TestComponent = () => {
            const { isConnected } = useWeb3Context()

            return (
                <>
                    <LoginWithAuth auth={aliceAuth} />
                    <div data-testid="isConnected">{isConnected.toString()}</div>
                </>
            )
        }

        // render it
        render(
            <ZionTestApp provider={alice.provider}>
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
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedOut))
    }) // end test
}) // end describe
