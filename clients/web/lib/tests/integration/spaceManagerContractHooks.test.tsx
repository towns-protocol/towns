/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import React, { useCallback } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { Permission } from '../../src/client/web3/ContractTypes'
import { RegisterWallet } from 'use-zion-client/tests/integration/helpers/TestComponents'
import { RoomVisibility } from 'use-zion-client/src/types/zion-types'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from 'use-zion-client/tests/integration/helpers/ZionTestApp'
import { ZionTestWeb3Provider } from 'use-zion-client/tests/integration/helpers/ZionTestWeb3Provider'
import { getCouncilNftAddress } from '../../src/client/web3/ContractHelpers'
import { makeUniqueName } from 'use-zion-client/tests/integration/helpers/TestUtils'
import { useCreateSpaceTransaction } from 'use-zion-client/src/hooks/use-create-space-transaction'
import { useSpacesFromContract } from 'use-zion-client/src/hooks/use-spaces-from-contract'
import { useZionClient } from 'use-zion-client/src/hooks/use-zion-client'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('spaceManagerContractHooks', () => {
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
            const { chainId } = useZionClient()
            const zionTokenAddress = chainId ? getCouncilNftAddress(chainId) : undefined
            const {
                createSpaceTransactionWithRole: createSpaceTransactionWithRole,
                isLoading,
                data,
                error,
                transactionStatus,
                transactionHash,
            } = useCreateSpaceTransaction()
            // spaces
            const { spaces } = useSpacesFromContract()
            // callback to create a space
            const onClickCreateSpace = useCallback(() => {
                const handleClick = async () => {
                    await createSpaceTransactionWithRole(
                        {
                            name: spaceName,
                            visibility: RoomVisibility.Public,
                        },
                        'Test Role',
                        [],
                        [],
                    )
                }
                void handleClick()
            }, [createSpaceTransactionWithRole])
            // callback to create a space with zion token entitlement
            const onClickCreateSpaceWithZionMemberRole = useCallback(() => {
                const handleClick = async () => {
                    if (zionTokenAddress) {
                        await createSpaceTransactionWithRole(
                            {
                                name: tokenGatedSpaceName,
                                visibility: RoomVisibility.Public,
                            },
                            'Zion Role',
                            [zionTokenAddress],
                            [Permission.Read, Permission.Write],
                        )
                    }
                }
                void handleClick()
            }, [createSpaceTransactionWithRole, zionTokenAddress])

            console.log('TestComponent', 'render', {
                isLoading,
                data,
                error,
                transactionStatus,
                transactionHash,
            })

            // the view
            return (
                <>
                    <RegisterWallet />
                    <button onClick={onClickCreateSpace}>Create Space</button>
                    <button onClick={onClickCreateSpaceWithZionMemberRole}>
                        Create Token-Gated Space
                    </button>
                    <div data-testid="spaces">{spaces.map((x) => x.name).join(', ')}</div>
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
        const spaceElement = screen.getByTestId('spaces')
        // verify alice name is rendering
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        // click the button
        fireEvent.click(createSpaceButton)
        // did we make a space?
        await waitFor(
            () => expect(spaceElement).toHaveTextContent(spaceName),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
        // now with a token
        fireEvent.click(createTokenGatedSpaceButton)
        // did we make a space?
        await waitFor(
            () => expect(spaceElement).toHaveTextContent(tokenGatedSpaceName),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
    }) // end test
}) // end describe
