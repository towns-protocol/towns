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
} from 'use-towns-client/tests/integration/helpers/TestComponents'
import { TestConstants } from './helpers/TestConstants'
import { TownsTestApp } from 'use-towns-client/tests/integration/helpers/TownsTestApp'
import { TownsTestWeb3Provider } from 'use-towns-client/tests/integration/helpers/TownsTestWeb3Provider'
import {
    createMembershipStruct,
    makeUniqueName,
} from 'use-towns-client/tests/integration/helpers/TestUtils'
import { useCreateSpaceTransactionWithRetries } from 'use-towns-client/src/hooks/use-create-space-transaction'
import { useSpacesFromContract } from 'use-towns-client/src/hooks/use-spaces-from-contract'
import {
    getTestGatingNftAddress,
    NoopRuleData,
    Permission,
    getDynamicPricingModule,
} from '@river-build/web3'
import { TSigner } from '../../src/types/web3-types'
import { useTownsClient } from '../../src/hooks/use-towns-client'

// TODO Zustand https://docs.pmnd.rs/zustand/testing

describe('spaceManagerContractHooks', () => {
    test('user can create and list web3 spaces', async () => {
        const provider = new TownsTestWeb3Provider()
        // add funds
        await provider.fundWallet()
        await provider.mintMockNFT()

        // create a unique space name for this test
        const spaceName = makeUniqueName('alice')
        const tokenGatedSpaceName = makeUniqueName('alice')
        // create a veiw for alice
        const nftAddress = await getTestGatingNftAddress(0)

        const TestComponent = ({ signer }: { signer: TSigner }) => {
            // basic space
            const spaceTransaction = useCreateSpaceTransactionWithRetries()
            const { createSpaceTransactionWithRetries } = spaceTransaction
            // spaces
            const { spaces } = useSpacesFromContract()
            const { spaceDapp } = useTownsClient()

            const [createdSpace, setCreatedSpace] = useState<boolean>(false)
            // callback to create a space
            const onClickCreateSpace = useCallback(() => {
                const handleClick = async () => {
                    const dynamicPricingModule = await getDynamicPricingModule(spaceDapp)
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
                            pricingModule: dynamicPricingModule.module,
                        }),
                        signer,
                    )
                    console.log('spaceManagerContractHooks onClickCreateSpace', spaceName)

                    setCreatedSpace(true)
                }
                void handleClick()
            }, [spaceDapp, createSpaceTransactionWithRetries, signer])
            const [createSpaceWithMemberRole, setCreateSpaceWithMemberRole] =
                useState<boolean>(false)

            // callback to create a space with towns token entitlement
            const onClickCreateSpaceWithMemberRole = useCallback(() => {
                const handleClick = async () => {
                    if (!nftAddress) {
                        throw new Error('No towns token address')
                    }
                    const dynamicPricingModule = await getDynamicPricingModule(spaceDapp)
                    await createSpaceTransactionWithRetries(
                        {
                            name: tokenGatedSpaceName,
                        },
                        createMembershipStruct({
                            name: 'Member Role',
                            permissions: [Permission.Read, Permission.Write],
                            requirements: {
                                everyone: true,
                                users: [],
                                ruleData: NoopRuleData,
                            },
                            pricingModule: dynamicPricingModule.module,
                        }),
                        signer,
                    )
                    console.log(
                        'spaceManagerContractHooks createSpaceTransactionWithRetries',
                        tokenGatedSpaceName,
                    )
                    setCreateSpaceWithMemberRole(true)
                }
                void handleClick()
            }, [spaceDapp, createSpaceTransactionWithRetries, signer])

            useEffect(() => {
                console.log('TestComponent', 'render', { spaceTransaction })
            }, [spaceTransaction])

            // the view
            return (
                <>
                    <RegisterWallet signer={signer} />
                    <button onClick={onClickCreateSpace}>Create Space</button>
                    <button onClick={onClickCreateSpaceWithMemberRole}>
                        Create Token-Gated Space
                    </button>
                    <TransactionInfo for={spaceTransaction} label="spaceTransaction" />
                    <div data-testid="createdSpace">{createdSpace ? 'true' : 'false'}</div>
                    <div data-testid="spaceWithTownsMemberRole">
                        {createSpaceWithMemberRole ? 'true' : 'false'}
                    </div>
                    <div data-testid="spaces">{spaces.map((x) => x.name).join(', ')}</div>
                </>
            )
        }
        // render it
        render(
            <TownsTestApp provider={provider}>
                <TestComponent signer={provider.wallet} />
            </TownsTestApp>,
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
        const spaceWithTownsMemberRole = screen.getByTestId('spaceWithTownsMemberRole')
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
            () => expect(spaceWithTownsMemberRole).toHaveTextContent('true'),
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
