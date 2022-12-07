/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import React, { useCallback } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { Permission } from '../../src/client/web3/ZionContractTypes'
import { RegisterWallet } from 'use-zion-client/tests/integration/helpers/TestComponents'
import { RoomVisibility } from 'use-zion-client/src/types/matrix-types'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from 'use-zion-client/tests/integration/helpers/ZionTestApp'
import { ZionTestWeb3Provider } from 'use-zion-client/tests/integration/helpers/ZionTestWeb3Provider'
import { getZionTokenAddress } from '../../src/client/web3/ZionContracts'
import { makeUniqueName } from 'use-zion-client/tests/integration/helpers/TestUtils'
import { useIntegratedSpaceManagement } from 'use-zion-client/src/hooks/use-integrated-space-management'
import { useSpacesFromContract } from 'use-zion-client/src/hooks/use-spaces-from-contract'
import { useZionClient } from 'use-zion-client/src/hooks/use-zion-client'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('spaceManagerContractHooks', () => {
    jest.setTimeout(TestConstants.DefaultJestTimeout)
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
            const { chainId, createBasicWeb3Space } = useZionClient()
            const zionTokenAddress = chainId ? getZionTokenAddress(chainId) : undefined
            const { createSpaceWithMemberRole: createSpaceWithMemberRole } =
                useIntegratedSpaceManagement()
            // spaces
            const { spaces } = useSpacesFromContract()
            // callback to create a space
            const onClickCreateSpace = useCallback(() => {
                void createBasicWeb3Space({
                    name: spaceName,
                    visibility: RoomVisibility.Public,
                })
            }, [createBasicWeb3Space])
            // callback to create a space with zion token entitlement
            const onClickCreateSpaceWithZionMemberRole = useCallback(() => {
                if (zionTokenAddress) {
                    void createSpaceWithMemberRole(
                        {
                            name: tokenGatedSpaceName,
                            visibility: RoomVisibility.Public,
                        },
                        [zionTokenAddress],
                        [Permission.Read, Permission.Write],
                    )
                }
            }, [createSpaceWithMemberRole, zionTokenAddress])

            // the view
            return (
                <>
                    <RegisterWallet />
                    <button onClick={onClickCreateSpace}>Create Space</button>
                    <button onClick={onClickCreateSpaceWithZionMemberRole}>
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
        const spacesElement = screen.getByTestId('spaces')
        // verify alice name is rendering
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        // click the button
        fireEvent.click(createSpaceButton)
        // did we make a space?
        await waitFor(
            () => within(spacesElement).getByText(spaceName),
            TestConstants.DefaultWaitForTimeout,
        )
        // now with a token
        fireEvent.click(createTokenGatedSpaceButton)
        // did we make a space?
        await waitFor(
            () => within(spacesElement).getByText(tokenGatedSpaceName),
            TestConstants.DefaultWaitForTimeout,
        )
    }) // end test
}) // end describe
