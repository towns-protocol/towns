/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ZionTestApp } from './helpers/ZionTestApp'
import { registerAndStartClients } from './helpers/TestUtils'
import { LoginWithWallet } from './helpers/TestComponents'
import { useZionContext } from '../../src/components/ZionContextProvider'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('onboardedStateHooksTest', () => {
    test("previously onboarded user doesn't get put in onboarding", async () => {
        // create clients
        const { alice } = await registerAndStartClients(['alice'])
        // set display name and avatar
        await alice.setDisplayName("Alice's your aunt")
        await alice.setAvatarUrl('alice.png')
        // stop!
        alice.stopClient()
        // create a veiw for bob
        const TestComponent = () => {
            const { onboardingState } = useZionContext()
            const [seenStates, setSeenStates] = useState<string[]>([])
            useEffect(() => {
                setSeenStates((prev) => [...prev, onboardingState.kind])
            }, [onboardingState])
            return (
                <>
                    <LoginWithWallet />
                    <div data-testid="seenStates">{seenStates.join(',')}</div>
                </>
            )
        }
        // render it (alice is logging in again in the browser)
        render(
            <ZionTestApp provider={alice.provider}>
                <TestComponent />
            </ZionTestApp>,
        )
        // get our test elements
        const seenStates = screen.getByTestId('seenStates')
        // wait for client to be running
        await waitFor(() => expect(seenStates).toHaveTextContent('none,loading,toast,done'))
    }) // end test with bob
}) // end describe
