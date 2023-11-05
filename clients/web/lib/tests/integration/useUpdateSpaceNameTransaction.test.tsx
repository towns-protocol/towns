/**
 * useUpdateSpaceNameTransaction.test.tsx
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group casablanca
 */

import React, { useCallback, useEffect } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { RegisterWallet, TransactionInfo } from './helpers/TestComponents'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { ZionTestApp } from './helpers/ZionTestApp'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { makeUniqueName } from './helpers/TestUtils'
import { useUpdateSpaceNameTransaction } from '../../src/hooks/use-update-space-name-transaction'
import { useCreateSpaceTransaction } from '../../src/hooks/use-create-space-transaction'
import { TestConstants } from './helpers/TestConstants'
import { TransactionStatus } from '../../src/client/ZionClientTypes'
import { createMembershipStruct, getMemberNftAddress } from '@river/web3'
import { useSpaceName } from '../../src/hooks/use-space-data'

/**
 * This test suite tests the useUpdateSpaceNameTransaction hook.
 */
describe('useUpdateSpaceNameTransaction', () => {
    test('create a new space, and then update its name', async () => {
        /* Arrange */
        const provider = new ZionTestWeb3Provider()
        const spaceName = makeUniqueName('alice')
        const newSpaceName = makeUniqueName('bob')
        const chainId = (await provider.getNetwork()).chainId
        if (!chainId) {
            throw new Error('chainId is undefined')
        }
        const memberNftAddress = getMemberNftAddress(chainId)
        // create a view for alice
        // make sure alice has some funds
        await provider.fundWallet()
        await provider.mintMockNFT()

        render(
            <ZionTestApp provider={provider}>
                <>
                    <RegisterWallet />
                    <TestComponent originalSpaceName={spaceName} newSpaceName={newSpaceName} />
                </>
            </ZionTestApp>,
        )
        const clientRunning = screen.getByTestId('clientRunning')
        // wait for the client to be running
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        if (!memberNftAddress) {
            throw new Error('councilNftAddress is undefined')
        }
        // get our test elements
        const createSpaceButton = screen.getByRole('button', {
            name: 'Create Space',
        })
        const updateSpaceNameButton = screen.getByRole('button', {
            name: 'Update Space Name',
        })
        // click button to create the space
        // this will create the space with a member role
        fireEvent.click(createSpaceButton)

        // wait for space to be created
        const spaceElement = await waitFor(
            () => screen.getByTestId('spacesElement'),
            TestConstants.DecaDefaultWaitForTimeout,
        )

        // wait for the space name to render
        await waitFor(
            () => expect(spaceElement).toHaveTextContent(spaceName),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        /* Act */
        /* Assert */
        await assertSpaceName(spaceElement, spaceName)
        // click button to update the role
        fireEvent.click(updateSpaceNameButton)

        // verify the space name has changed
        await assertSpaceName(spaceElement, newSpaceName)
    }) // end test
}) // end describe

// helper function to create a test component
function TestComponent(args: { originalSpaceName: string; newSpaceName: string }): JSX.Element {
    const spaceTransaction = useCreateSpaceTransaction()
    const {
        createSpaceTransactionWithRole,
        data: txData,
        transactionStatus: spaceTransactionStatus,
    } = spaceTransaction
    const spaceId = txData?.spaceId
    const updateSpaceNameTransactionInfo = useUpdateSpaceNameTransaction()
    const { updateSpaceNameTransaction } = updateSpaceNameTransactionInfo
    const spaceNetworkId = spaceId ? spaceId.networkId : ''

    // handle click to create a space
    const onClickCreateSpace = useCallback(() => {
        const handleClick = async () => {
            await createSpaceTransactionWithRole(
                {
                    name: args.originalSpaceName,
                },
                createMembershipStruct({
                    name: 'Test Role',
                    permissions: [],
                    tokenAddresses: [],
                }),
            )
        }
        void handleClick()
    }, [args.originalSpaceName, createSpaceTransactionWithRole])

    // handle click to update space name
    const onClickUpdateSpaceName = useCallback(() => {
        const handleClick = async () => {
            await updateSpaceNameTransaction(spaceNetworkId, args.newSpaceName)
        }
        void handleClick()
    }, [updateSpaceNameTransaction, spaceNetworkId, args.newSpaceName])
    // the view
    return (
        <>
            <button onClick={onClickCreateSpace}>Create Space</button>
            <button onClick={onClickUpdateSpaceName}>Update Space Name</button>
            <TransactionInfo for={spaceTransaction} label="spaceTransaction" />
            <TransactionInfo
                for={updateSpaceNameTransactionInfo}
                label="updateSpaceNameTransaction"
            />
            {spaceTransactionStatus === TransactionStatus.Success && (
                <SpaceContextProvider spaceId={spaceId}>
                    <>
                        <SpacesComponent spaceId={spaceId?.networkId} />
                    </>
                </SpaceContextProvider>
            )}
        </>
    )
}

function SpacesComponent(args: { spaceId?: string }): JSX.Element {
    // spaces
    const { isLoading: isLoadingSpaceNameTx } = useUpdateSpaceNameTransaction()
    const { spaceName, isLoading: isLoadingSpaceNames } = useSpaceName(args?.spaceId ?? '')
    useEffect(() => {
        console.log({
            isLoadingSpaceNameTx,
            spaceName,
        })
    }, [isLoadingSpaceNameTx, spaceName])

    if (isLoadingSpaceNames || isLoadingSpaceNameTx || !spaceName) {
        return <React.Fragment />
    }
    return (
        <div data-testid="spacesElement">
            {[spaceName].map((element) => (
                <div key={args?.spaceId ?? ''}>spaceName:{element}</div>
            ))}
        </div>
    )
}

/**
 * Assert helper functions
 */
async function assertSpaceName(htmlElement: HTMLElement, spaceName: string) {
    await waitFor(
        () => expect(htmlElement).toHaveTextContent(`spaceName:${spaceName}`),
        TestConstants.DoubleDefaultWaitForTimeout,
    )
}
