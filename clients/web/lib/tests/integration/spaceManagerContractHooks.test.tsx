/**
 * spaceManagerContractHooks.test.tsx
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group core
 *
 */
import React, { useCallback, useEffect, useState } from 'react'
import { fireEvent, prettyDOM, render, screen, waitFor } from '@testing-library/react'

import {
    RegisterWallet,
    TransactionInfo,
} from 'use-zion-client/tests/integration/helpers/TestComponents'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestApp } from 'use-zion-client/tests/integration/helpers/ZionTestApp'
import { ZionTestWeb3Provider } from 'use-zion-client/tests/integration/helpers/ZionTestWeb3Provider'
import { makeUniqueName } from 'use-zion-client/tests/integration/helpers/TestUtils'
import { useCreateSpaceTransactionWithRetries } from 'use-zion-client/src/hooks/use-create-space-transaction'
import { useSpacesFromContract } from 'use-zion-client/src/hooks/use-spaces-from-contract'
import {
    createMembershipStruct,
    getTestGatingNftAddress,
    NoopRuleData,
    Permission,
} from '@river/web3'
import { TSigner } from '../../src/types/web3-types'

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
        const zionTokenAddress = await getTestGatingNftAddress(0)

        const TestComponent = ({ signer }: { signer: TSigner }) => {
            // basic space
            const spaceTransaction = useCreateSpaceTransactionWithRetries()
            const { createSpaceTransactionWithRetries } = spaceTransaction
            // spaces
            const { spaces } = useSpacesFromContract()

            const [createdSpace, setCreatedSpace] = useState<boolean>(false)
            // callback to create a space
            const onClickCreateSpace = useCallback(() => {
                const handleClick = async () => {
                    await createSpaceTransactionWithRetries(
                        {
                            name: spaceName,
                        },
                        createMembershipStruct({
                            name: 'Test Role',
                            permissions: [],
                            requirements: {
                                everyone: true,
                                users: [],
                                ruleData: NoopRuleData,
                            },
                        }),
                        signer,
                    )
                    console.log('spaceManagerContractHooks onClickCreateSpace', spaceName)

                    setCreatedSpace(true)
                }
                void handleClick()
            }, [createSpaceTransactionWithRetries, signer])
            const [createSpaceWithZionMemberRole, setCreateSpaceWithZionMemberRole] =
                useState<boolean>(false)

            // callback to create a space with zion token entitlement
            const onClickCreateSpaceWithZionMemberRole = useCallback(() => {
                const handleClick = async () => {
                    if (!zionTokenAddress) {
                        throw new Error('No zion token address')
                    }
                    await createSpaceTransactionWithRetries(
                        {
                            name: tokenGatedSpaceName,
                        },
                        createMembershipStruct({
                            name: 'Zion Role',
                            permissions: [Permission.Read, Permission.Write],
                            requirements: {
                                everyone: true,
                                users: [],
                                ruleData: NoopRuleData,
                            },
                        }),
                        signer,
                    )
                    console.log(
                        'spaceManagerContractHooks createSpaceTransactionWithRetries',
                        tokenGatedSpaceName,
                    )
                    setCreateSpaceWithZionMemberRole(true)
                }
                void handleClick()
            }, [createSpaceTransactionWithRetries, signer])

            useEffect(() => {
                console.log('TestComponent', 'render', { spaceTransaction })
            }, [spaceTransaction])

            // the view
            return (
                <>
                    <RegisterWallet signer={signer} />
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
                <TestComponent signer={provider.wallet} />
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
