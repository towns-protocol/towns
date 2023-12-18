/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
/**
 * @group dendrite
 */
import React, { useEffect, useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ZionTestApp } from './helpers/ZionTestApp'
import { registerAndStartClients } from './helpers/TestUtils'
import { LoginWithWallet } from './helpers/TestComponents'
import { useZionContext } from '../../src/components/ZionContextProvider'
import { TestConstants } from './helpers/TestConstants'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('onboardedStateHooksTest', () => {
    test("previously onboarded user doesn't get put in onboarding", async () => {
        // create clients
        const { alice } = await registerAndStartClients(['alice'])
        // set display name and avatar
        await alice.setDisplayName("Alice's your aunt")
        await alice.setAvatarUrl('alice.png')
        // stop!
        await alice.stopClients()
        // create a veiw for bob
        const TestComponent = () => {
            const { casablancaOnboardingState: onboardingState } = useZionContext()
            const [seenStates, setSeenStates] = useState<string[]>([])
            useEffect(() => {
                setSeenStates((prev) => [...prev, onboardingState.kind])
            }, [onboardingState])
            return (
                <>
                    <LoginWithWallet signer={alice.provider.wallet} />
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
        await waitFor(
            () => expect(seenStates).toHaveTextContent('none,loading,toast,done'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
    }) // end test with bob
}) // end describe
