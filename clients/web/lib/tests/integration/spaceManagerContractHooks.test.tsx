/**
 * spaceManagerContractHooks.test.tsx
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group casablanca
 *
 */
import React, { useCallback, useEffect, useState } from 'react'
import { fireEvent, prettyDOM, render, screen, waitFor } from '@testing-library/react'

import {
    RegisterWallet,
    TransactionInfo,
} from 'use-zion-client/tests/integration/helpers/TestComponents'
import { RoomVisibility } from 'use-zion-client/src/types/zion-types'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from 'use-zion-client/tests/integration/helpers/ZionTestApp'
import { ZionTestWeb3Provider } from 'use-zion-client/tests/integration/helpers/ZionTestWeb3Provider'
import { makeUniqueName } from 'use-zion-client/tests/integration/helpers/TestUtils'
import { useCreateSpaceTransaction } from 'use-zion-client/src/hooks/use-create-space-transaction'
import { useSpacesFromContract } from 'use-zion-client/src/hooks/use-spaces-from-contract'
import { useZionClient } from 'use-zion-client/src/hooks/use-zion-client'
import { createMembershipStruct, getMemberNftAddress, Permission } from '@river/web3'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('spaceManagerContractHooks', () => {
    test('user can create and list web3 spaces', async () => {
        const provider = new ZionTestWeb3Provider()
        // add funds
        await provider.fundWallet()
        await provider.mintMockNFT()

        // create a unique space name for this test
        const spaceName = makeUniqueName('alice')
        const tokenGatedSpaceName = makeUniqueName('alice')
        // create a veiw for alice

        const TestComponent = () => {
            // basic space
            const { chainId } = useZionClient()
            const zionTokenAddress = chainId ? getMemberNftAddress(chainId) : undefined
            const spaceTransaction = useCreateSpaceTransaction()
            const { createSpaceTransactionWithRole } = spaceTransaction
            // spaces
            const { spaces } = useSpacesFromContract()

            const [createdSpace, setCreatedSpace] = useState<boolean>(false)
            // callback to create a space
            const onClickCreateSpace = useCallback(() => {
                const handleClick = async () => {
                    await createSpaceTransactionWithRole(
                        {
                            name: spaceName,
                            visibility: RoomVisibility.Public,
                        },
                        createMembershipStruct({
                            name: 'Test Role',
                            permissions: [],
                            tokenAddresses: [],
                        }),
                    )
                    console.log('spaceManagerContractHooks onClickCreateSpace', spaceName)

                    setCreatedSpace(true)
                }
                void handleClick()
            }, [createSpaceTransactionWithRole])
            const [createSpaceWithZionMemberRole, setCreateSpaceWithZionMemberRole] =
                useState<boolean>(false)

            // callback to create a space with zion token entitlement
            const onClickCreateSpaceWithZionMemberRole = useCallback(() => {
                const handleClick = async () => {
                    if (!zionTokenAddress) {
                        throw new Error('No zion token address')
                    }
                    await createSpaceTransactionWithRole(
                        {
                            name: tokenGatedSpaceName,
                            visibility: RoomVisibility.Public,
                        },
                        createMembershipStruct({
                            name: 'Zion Role',
                            permissions: [Permission.Read, Permission.Write],
                            tokenAddresses: [zionTokenAddress],
                        }),
                    )
                    console.log(
                        'spaceManagerContractHooks createSpaceTransactionWithRole',
                        tokenGatedSpaceName,
                    )
                    setCreateSpaceWithZionMemberRole(true)
                }
                void handleClick()
            }, [createSpaceTransactionWithRole, zionTokenAddress])

            useEffect(() => {
                console.log('TestComponent', 'render', { spaceTransaction })
            }, [spaceTransaction])

            // the view
            return (
                <>
                    <RegisterWallet />
                    <button onClick={onClickCreateSpace}>Create Space</button>
                    <button onClick={onClickCreateSpaceWithZionMemberRole}>
                        Create Token-Gated Space
                    </button>
                    <TransactionInfo for={spaceTransaction} label="spaceTransaction" />
                    <div data-testid="createdSpace">{createdSpace ? 'true' : 'false'}</div>
                    <div data-testid="spaceWithZionMemberRole">
                        {createSpaceWithZionMemberRole ? 'true' : 'false'}
                    </div>
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
        const createdSpace = screen.getByTestId('createdSpace')
        const spaceWithZionMemberRole = screen.getByTestId('spaceWithZionMemberRole')
        const spaceElement = screen.getByTestId('spaces')
        // verify alice name is rendering
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        // click the button
        fireEvent.click(createSpaceButton)
        // did the button complete
        await waitFor(
            () => expect(createdSpace).toHaveTextContent('true'),
            TestConstants.DecaDefaultWaitForTimeout,
        )

        // did we make a space?
        await waitFor(
            () => expect(spaceElement).toHaveTextContent(spaceName),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
        // now with a token
        fireEvent.click(createTokenGatedSpaceButton)
        // did the button complete
        await waitFor(
            () => expect(spaceWithZionMemberRole).toHaveTextContent('true'),
            TestConstants.DecaDefaultWaitForTimeout,
        )

        // did we make a space?
        await waitFor(
            () => expect(spaceElement).toHaveTextContent(tokenGatedSpaceName),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        console.log(prettyDOM())
    }) // end test
}) // end describe
