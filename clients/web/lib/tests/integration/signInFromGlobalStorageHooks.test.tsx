/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * @group dendrite
 */
import React from 'react'
import { LoginWithAuth, LoginWithWallet } from './helpers/TestComponents'
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import { ZionTestApp } from './helpers/ZionTestApp'
import { registerAndStartClients } from './helpers/TestUtils'
import { useWeb3Context } from '../../src/components/Web3ContextProvider'
import { LoginStatus } from '../../src/hooks/login'

import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { useMatrixStore } from '../../src/store/use-matrix-store'
import { useZionClient } from '../../src/hooks/use-zion-client'
import { sleep } from '../../src/utils/zion-utils'
import { useMatrixCredentials } from '../../src/hooks/use-matrix-credentials'
import { CREDENTIAL_STORE_NAME } from '../../src/store/use-credential-store'
import 'fake-indexeddb/auto'

const initialMatrixStoreState = useMatrixStore.getState()

let deviceId: string
let provider: ZionTestWeb3Provider
/*
Note: Jest runs tests serially within the collection,
which is important because subsequent tests depend
on the first test registering / starting a client
and setting up session storage.
https://jestjs.io/docs/setup-teardown#order-of-execution-of-describe-and-test-blocks
*/
describe('signInFromGlobalStorageHooks', () => {
    afterEach(() => {
        // clear sessionStorage after each test simulating a new browser window
        global.sessionStorage.clear()
        act(() => {
            useMatrixStore.setState(initialMatrixStoreState)
        })
    })
    test('test login using localStorage for auth', async () => {
        // create a new client and sign in
        const { alice } = await registerAndStartClients(['alice'])
        // grab the auth
        const aliceAuth = alice.signerContext!
        // assign device id for later use
        deviceId = '1'
        provider = alice.provider
        // stop alice
        await alice.stopClients()

        // build a view for alice to render
        const TestComponent = () => {
            return (
                <>
                    <LoginWithAuth
                        signerContext={aliceAuth}
                        walletAddress={alice.provider.wallet.address}
                    />
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
        const isConnected = screen.getByTestId('isConnected')
        const loginStatus = screen.getByTestId('loginStatus')
        const dbs = await indexedDB.databases()
        // one for matrix crypto, one for matrix sync
        expect(dbs.length).toEqual(2)
        await waitFor(() => expect(isConnected).toHaveTextContent(true.toString()))
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn))
    }) // end test

    test('test reading prior auth objects and logged in state from localStorage', async () => {
        const hs = process.env.HOMESERVER!
        const credentialSessionStore = JSON.parse(
            global.sessionStorage.getItem(CREDENTIAL_STORE_NAME) || '{}',
        )
        const credentialStore = JSON.parse(
            global.localStorage.getItem(CREDENTIAL_STORE_NAME) || '{}',
        )
        await waitFor(() =>
            expect(credentialStore.state.matrixCredentialsMap[hs]).toHaveProperty('accessToken'),
        )
        // session storage should be empty, but this is ok b/c we use localStorage for auth instead
        await waitFor(() => expect(Object.keys(credentialSessionStore).length).toEqual(0))
    })

    test('test logging in again using stored auth from localStorage', async () => {
        const hs = process.env.HOMESERVER!
        const credentialStore = JSON.parse(
            global.localStorage.getItem(CREDENTIAL_STORE_NAME) || '{}',
        )
        expect(Object.keys(credentialStore.state).length).toBeGreaterThan(0)
        const dummyProvider = new ZionTestWeb3Provider()

        // build a view for alice to render
        const TestComponent = () => {
            const { isConnected } = useWeb3Context()
            const { accessToken } = useMatrixCredentials()
            const { loginStatus, loginError } = useMatrixStore()
            const { logout } = useZionClient()

            return (
                <>
                    <div data-testid="loginStatus">{loginStatus}</div>
                    <div data-testid="loginError">{loginError?.message ?? ''}</div>
                    <div data-testid="isConnected">{isConnected.toString()}</div>
                    <div data-testid="accessToken">{accessToken}</div>
                    <button data-testid="logout" onClick={() => void logout()}>
                        logout
                    </button>
                </>
            )
        }

        // render it
        render(
            <ZionTestApp provider={dummyProvider}>
                <TestComponent />
            </ZionTestApp>,
        )
        const isConnected = screen.getByTestId('isConnected')
        const loginStatus = screen.getByTestId('loginStatus')
        const accessToken = screen.getByTestId('accessToken')
        const logoutButton = screen.getByRole('button', {
            name: 'logout',
        })
        await waitFor(() => expect(isConnected).toHaveTextContent(true.toString()))
        // check that alice is using stored accessToken, not a new one
        await waitFor(() =>
            expect(accessToken).toHaveTextContent(
                credentialStore.state.matrixCredentialsMap[hs].accessToken,
            ),
        )
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn))
        // logout
        fireEvent.click(logoutButton)
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedOut))
    })
    test('test stores are cleared after logout', async () => {
        const hs = process.env.HOMESERVER!
        const credentialStore = JSON.parse(
            global.localStorage.getItem(CREDENTIAL_STORE_NAME) || '{}',
        )
        expect(credentialStore.state.matrixCredentialsMap[hs]).toBeNull()
        const dummyProvider = new ZionTestWeb3Provider()

        // build a view for alice to render
        const TestComponent = () => {
            const { isConnected } = useWeb3Context()
            const { accessToken } = useMatrixCredentials()
            const { loginStatus, loginError } = useMatrixStore()
            return (
                <>
                    <div data-testid="loginStatus">{loginStatus}</div>
                    <div data-testid="loginError">{loginError?.message ?? ''}</div>
                    <div data-testid="isConnected">{isConnected.toString()}</div>
                    <div data-testid="accessToken">{accessToken}</div>
                </>
            )
        }

        // render it
        render(
            <ZionTestApp provider={dummyProvider}>
                <TestComponent />
            </ZionTestApp>,
        )
        const isConnected = screen.getByTestId('isConnected')
        const loginStatus = screen.getByTestId('loginStatus')

        await waitFor(() => expect(isConnected).toHaveTextContent(true.toString()))
        // give it a little time
        await sleep(1000)
        // check that alice does not get logged back in
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedOut))
    })

    test('test logging back in after logout should have the same deviceId', async () => {
        render(
            <ZionTestApp provider={provider}>
                <LoginWithWallet />
            </ZionTestApp>,
        )
        // get our test elements
        const isConnected = screen.getByTestId('isConnected')
        const loginStatus = screen.getByTestId('loginStatus')
        await waitFor(() => expect(isConnected).toHaveTextContent(true.toString()))
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn))

        const hs = process.env.HOMESERVER!
        const credentialStore = JSON.parse(
            global.localStorage.getItem(CREDENTIAL_STORE_NAME) || '{}',
        )

        const dbs = await indexedDB.databases()
        // should not create an additional db
        expect(dbs.length).toEqual(2)

        // we already had a login, so we should have a deviceId
        // our first login deviceId should match the one from matrix auth reponse
        await waitFor(() =>
            expect(deviceId).toBe(credentialStore.state.matrixCredentialsMap[hs].deviceId),
        )
    })
}) // end describe
