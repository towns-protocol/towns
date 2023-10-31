/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
/**
 * @group casablanca
 */
import React, { useCallback, useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ZionTestApp } from './helpers/ZionTestApp'
import { RegisterWallet, TransactionInfo } from './helpers/TestComponents'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
import { makeUniqueName } from './helpers/TestUtils'
import { useSpaceData } from '../../src/hooks/use-space-data'
import { useMyChannels } from '../../src/hooks/use-my-channels'
import { useCreateSpaceTransaction } from '../../src/hooks/use-create-space-transaction'
import { useCreateChannelTransaction } from '../../src/hooks/use-create-channel-transaction'
import { CreateChannelInfo, RoomVisibility } from '../../src/types/zion-types'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
import { createMembershipStruct } from '@river/web3'

/// regression, channels weren't showing in sidebar after they were created
describe('createSpaceChannelHooks', () => {
    test('test that channels render after creation', async () => {
        // create a wallet for bob
        const aliceProvider = new ZionTestWeb3Provider()
        // add funds
        await aliceProvider.fundWallet()
        await aliceProvider.mintMockNFT()

        // create a veiw for bob
        const TestComponent = () => {
            const spaceTransaction = useCreateSpaceTransaction()
            const { createSpaceTransactionWithRole } = spaceTransaction
            const channelTransaction = useCreateChannelTransaction()
            const { createChannelTransaction } = channelTransaction
            const [spaceId, setSpaceId] = useState<RoomIdentifier | undefined>(undefined)
            const spaceData = useSpaceData(spaceId)

            const channelGroups = useMyChannels(spaceData)

            const onClickCreateSpace = useCallback(() => {
                const name = makeUniqueName('aliceSpace')
                void (async () => {
                    const result = await createSpaceTransactionWithRole(
                        {
                            name: name,
                            visibility: RoomVisibility.Public,
                        },
                        createMembershipStruct({
                            name: 'Test Role',
                            permissions: [],
                            tokenAddresses: [],
                        }),
                    )
                    setSpaceId(result?.data?.spaceId)
                    console.log('onClickCreateSpace', { name, result })
                })()
            }, [createSpaceTransactionWithRole])
            const onClickCreateChannel = useCallback(() => {
                const name = makeUniqueName('aliceChannel')
                const parentSpaceId = spaceId
                if (!parentSpaceId) {
                    throw new Error('no spaceId')
                }
                void (async () => {
                    const createRoomInfo: CreateChannelInfo = {
                        name,
                        visibility: RoomVisibility.Public,
                        parentSpaceId,
                        roleIds: [],
                    }

                    await createChannelTransaction(createRoomInfo)
                    console.log('onClickCreateChannel', name)
                })()
            }, [createChannelTransaction, spaceId])
            return (
                <>
                    <RegisterWallet />
                    <button onClick={onClickCreateSpace}>createSpace</button>
                    <button onClick={onClickCreateChannel}>createChannel</button>
                    <div data-testid="seenStates"></div>
                    <div data-testid="spaceId">{JSON.stringify(spaceId)}</div>
                    <div data-testid="spaceData">{JSON.stringify(spaceData)}</div>
                    <div data-testid="channelGroups">{JSON.stringify(channelGroups)}</div>
                    <TransactionInfo for={spaceTransaction} label="spaceTransaction" />
                    <TransactionInfo for={channelTransaction} label="channelTransaction" />
                </>
            )
        }
        // render it
        render(
            <ZionTestApp provider={aliceProvider}>
                <SpaceContextProvider spaceId={undefined}>
                    <TestComponent />
                </SpaceContextProvider>
            </ZionTestApp>,
        )
        // get our test elements
        const clientRunning = screen.getByTestId('clientRunning')
        const loginStatus = screen.getByTestId('loginStatus')
        const spaceData = screen.getByTestId('spaceData')
        const channelGroups = screen.getByTestId('channelGroups')
        const createSpace = screen.getByRole('button', {
            name: 'createSpace',
        })
        const createChannel = screen.getByRole('button', {
            name: 'createChannel',
        })
        await waitFor(() => expect(loginStatus).toHaveTextContent('LoggedIn'))
        await waitFor(() => expect(clientRunning).toHaveTextContent('true'))
        //
        // create a space
        fireEvent.click(createSpace)
        // render?
        await waitFor(
            () => expect(spaceData).toHaveTextContent('aliceSpace'),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        // create a channel
        fireEvent.click(createChannel)
        // the space data should update
        await waitFor(
            () => expect(spaceData).toHaveTextContent('aliceChannel'),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        // and our "members only channel data" should also update
        await waitFor(
            () => expect(channelGroups).toHaveTextContent('aliceChannel'),
            TestConstants.DecaDefaultWaitForTimeout,
        )
    }) // end test with bob
}) // end describe
