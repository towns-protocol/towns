/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useCallback } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ZionTestApp } from 'use-zion-client/tests/integration/helpers/ZionTestApp'
import { RegisterWallet } from 'use-zion-client/tests/integration/helpers/TestComponents'
import { useZionClient } from 'use-zion-client/src/hooks/use-zion-client'
import { useSpacesFromContract } from 'use-zion-client/src/hooks/use-spaces-from-contract'
import { makeUniqueName } from 'use-zion-client/tests/integration/helpers/TestUtils'
import { RoomVisibility } from 'use-zion-client/src/types/matrix-types'
import { useIntegratedSpaceManagement } from 'use-zion-client/src/hooks/use-integrated-space-management'
import { ZionTestWeb3Provider } from 'use-zion-client/tests/integration/helpers/ZionTestWeb3Provider'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('spaceManagerContractHooks', () => {
    jest.setTimeout(30000)
    test('user can create and list web3 spaces', async () => {
        const provider = new ZionTestWeb3Provider()
        // add funds
        await provider.fundWallet()
        // create a unique space name for this test
        const spaceName = makeUniqueName('alice')
        const tokenGatedSpaceName = makeUniqueName('alice')
        // create a veiw for alice
        const TestComponent = () => {
            // basic space
            const { createWeb3Space } = useZionClient()
            //
            const { createSpaceWithZionTokenEntitlement } = useIntegratedSpaceManagement()
            // spaces
            const spaces = useSpacesFromContract()
            // callback to create a space
            const onClickCreateSpace = useCallback(() => {
                void createWeb3Space({
                    name: spaceName,
                    visibility: RoomVisibility.Public,
                })
            }, [createWeb3Space])
            // callback to create a space with zion token entitlement
            const onClickCreateSpaceWithZionTokenEntitlement = useCallback(() => {
                void createSpaceWithZionTokenEntitlement({
                    name: tokenGatedSpaceName,
                    visibility: RoomVisibility.Public,
                })
            }, [createSpaceWithZionTokenEntitlement])

            // the view
            return (
                <>
                    <RegisterWallet />
                    <button onClick={onClickCreateSpace}>Create Space</button>
                    <button onClick={onClickCreateSpaceWithZionTokenEntitlement}>
                        Create Token-Gated Space
                    </button>
                    <div data-testid="spaces">
                        {spaces.map((element) => (
                            <div key={element.key}>{element.name}</div>
                        ))}
                    </div>
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
        const clientRunning = screen.getByTestId('clientRunning')
        const createSpaceButton = screen.getByRole('button', {
            name: 'Create Space',
        })
        const createTokenGatedSpaceButton = screen.getByRole('button', {
            name: 'Create Token-Gated Space',
        })
        // verify alice name is rendering
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        // click the button
        fireEvent.click(createSpaceButton)
        // did we make a space?
        await waitFor(() => expect(screen.getByTestId('spaces')).toHaveTextContent(spaceName))
        // now with a token
        fireEvent.click(createTokenGatedSpaceButton)
        // did we make a space?
        await waitFor(() =>
            expect(screen.getByTestId('spaces')).toHaveTextContent(tokenGatedSpaceName),
        )
    }) // end test
}) // end describe
