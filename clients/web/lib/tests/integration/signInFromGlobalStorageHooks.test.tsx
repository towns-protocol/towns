/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * @group core
 */
import React from 'react'
import { LoginWithWallet } from './helpers/TestComponents'
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import { TownsTestApp } from './helpers/TownsTestApp'
import { createTestSpaceGatedByTownNft, registerAndStartClients } from './helpers/TestUtils'
import { LoginStatus } from '../../src/hooks/login'
import { TownsTestWeb3Provider } from './helpers/TownsTestWeb3Provider'
import { useTownsClient } from '../../src/hooks/use-towns-client'
import { sleep } from '../../src/utils/towns-utils'
import { CREDENTIAL_STORE_NAME, useCredentialStore } from '../../src/store/use-credential-store'
import { useCasablancaStore } from '../../src/store/use-casablanca-store'
import { useTownsContext } from '../../src/components/TownsContextProvider'
import { Permission } from '@river-build/web3'

const initialCasablanacStoreState = useCasablancaStore.getState()
console.log('$$$$ ', { initialCasablanacStoreState })
let provider: TownsTestWeb3Provider
/*
Note: Jest runs tests serially within the collection,
which is important because subsequent tests depend
on the first test registering / starting a client
and setting up session storage.
https://jestjs.io/docs/setup-teardown#order-of-execution-of-describe-and-test-blocks
*/
describe('signInFromGlobalStorageHooks', () => {
    afterEach(() => {
        console.log('$$$$ afterEach - resetting global storage')
        // clear sessionStorage after each test simulating a new browser window
        global.sessionStorage.clear()
        act(() => {
            console.log('$$$$ resetting casablanca store state', { initialCasablanacStoreState })
            useCasablancaStore.setState(initialCasablanacStoreState)
        })
    })
    test('Stage 1 test login using localStorage for auth', async () => {
        console.log('$$$$ #1 test login using localStorage for auth')
        // create a new client and sign in
        const { alice } = await registerAndStartClients(['alice'])

        console.log('$$$$ alice address', alice.provider.wallet.address)
        // create a space so we can create a user stream
        await createTestSpaceGatedByTownNft(alice, [Permission.Read, Permission.Write], {
            name: alice.makeUniqueName(),
        })
        // assign device id for later use
        provider = alice.provider
        // stop alice
        await alice.stopClients()

        // build a view for alice to render
        const TestComponent = () => {
            return (
                <>
                    <LoginWithWallet signer={alice.provider.wallet} />
                </>
            )
        }

        // render it
        render(
            <TownsTestApp provider={alice.provider}>
                <TestComponent />
            </TownsTestApp>,
        )
        // get our test elements
        const isConnected = screen.getByTestId('isConnected')
        const loginStatus = screen.getByTestId('loginStatus')
        const dbs = await indexedDB.databases()
        // one for casablanca crypto, one for persistent storage
        expect(dbs.length).toEqual(2)
        await waitFor(() => expect(isConnected).toHaveTextContent(true.toString()))
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn))
    }) // end test

    test('Stage 2 test reading prior auth objects and logged in state from localStorage', async () => {
        console.log('$$$$ #2 test reading prior auth objects and logged in state from localStorage')
        const environmentId = process.env.RIVER_ENV!
        const credentialSessionStore = JSON.parse(
            global.sessionStorage.getItem(CREDENTIAL_STORE_NAME) || '{}',
        )
        const credentialStore = JSON.parse(
            global.localStorage.getItem(CREDENTIAL_STORE_NAME) || '{}',
        )
        await waitFor(() =>
            expect(credentialStore.state.casablancaCredentialsMap[environmentId]).toHaveProperty(
                'delegateSig',
            ),
        )
        // session storage should be empty, but this is ok b/c we use localStorage for auth instead
        await waitFor(() => expect(Object.keys(credentialSessionStore).length).toEqual(0))
    })

    test('Stage 3 test logging in again using stored auth from localStorage', async () => {
        console.log('$$$$ #3 test logging in again using stored auth from localStorage')
        const environmentId = process.env.RIVER_ENV!
        const credentialStore = JSON.parse(
            global.localStorage.getItem(CREDENTIAL_STORE_NAME) || '{}',
        )
        expect(Object.keys(credentialStore.state).length).toBeGreaterThan(0)
        const dummyProvider = new TownsTestWeb3Provider()

        // build a view for alice to render
        const TestComponent = () => {
            const { environmentId } = useTownsContext()
            const isConnected = Boolean(dummyProvider.wallet.provider)
            const { delegateSig } =
                useCredentialStore().casablancaCredentialsMap[environmentId ?? ''] ?? {}
            const { loginStatus, loginError } = useCasablancaStore()
            const { logout } = useTownsClient()

            return (
                <>
                    <div data-testid="loginStatus">{loginStatus}</div>
                    <div data-testid="loginError">{loginError?.message ?? ''}</div>
                    <div data-testid="isConnected">{isConnected.toString()}</div>
                    <div data-testid="delegateSig">{delegateSig}</div>
                    <button data-testid="logout" onClick={() => void logout()}>
                        logout
                    </button>
                </>
            )
        }

        // render it
        render(
            <TownsTestApp provider={dummyProvider}>
                <TestComponent />
            </TownsTestApp>,
        )
        const isConnected = screen.getByTestId('isConnected')
        const loginStatus = screen.getByTestId('loginStatus')
        const delegateSig = screen.getByTestId('delegateSig')
        const logoutButton = screen.getByRole('button', {
            name: 'logout',
        })
        await waitFor(() => expect(isConnected).toHaveTextContent(true.toString()))
        // check that alice is using stored delegateSig, not a new one
        await waitFor(() =>
            expect(delegateSig).toHaveTextContent(
                credentialStore.state.casablancaCredentialsMap[environmentId].delegateSig,
            ),
        )
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn))
        // logout
        fireEvent.click(logoutButton)
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedOut))
    })
    test('Stage 4 test stores are cleared after logout', async () => {
        console.log('$$$$ #4 test stores are cleared after logout')
        const environmentId = process.env.RIVER_ENV!
        const credentialStore = JSON.parse(
            global.localStorage.getItem(CREDENTIAL_STORE_NAME) || '{}',
        )
        expect(credentialStore.state.casablancaCredentialsMap[environmentId]).toBeNull()
        const dummyProvider = new TownsTestWeb3Provider()

        // build a view for alice to render
        const TestComponent = () => {
            const isConnected = Boolean(dummyProvider.wallet.provider)
            const { loginStatus, loginError } = useCasablancaStore()
            console.log('$$$$ loginStatus', { isConnected, loginStatus })
            const { casablancaCredentialsMap } = useCredentialStore()
            return (
                <>
                    <div data-testid="loginStatus">{loginStatus}</div>
                    <div data-testid="loginError">{loginError?.message ?? ''}</div>
                    <div data-testid="isConnected">{isConnected.toString()}</div>
                    <div data-testid="casablancaCredentialsMap">
                        {JSON.stringify(casablancaCredentialsMap)}
                    </div>
                </>
            )
        }

        // render it
        render(
            <TownsTestApp provider={dummyProvider}>
                <TestComponent />
            </TownsTestApp>,
        )
        const isConnected = screen.getByTestId('isConnected')
        const loginStatus = screen.getByTestId('loginStatus')

        await waitFor(() => expect(isConnected).toHaveTextContent(true.toString()))
        // give it a little time
        await sleep(1000)
        // check that alice does not get logged back in
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedOut))
        console.log('$$$$ stage 4 done')
    })
    test('Stage 5 test logging back in after logout should have a different deviceId', async () => {
        console.log('$$$$ #5 test logging back in after logout should have the same deviceId')
        render(
            <TownsTestApp provider={provider}>
                <LoginWithWallet signer={provider.wallet} />
            </TownsTestApp>,
        )
        // get our test elements
        const isConnected = screen.getByTestId('isConnected')
        const loginStatus = screen.getByTestId('loginStatus')
        await waitFor(() => expect(isConnected).toHaveTextContent(true.toString()))
        await waitFor(() => expect(loginStatus).toHaveTextContent(LoginStatus.LoggedIn))

        const dbs = await indexedDB.databases()
        // should not create an additional db, one for persistent storage
        expect(dbs.length).toEqual(2)
    })
}) // end describe
