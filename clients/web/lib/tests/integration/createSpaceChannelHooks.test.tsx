/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
/**
 * @group core
 */
import React, { useCallback, useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TownsTestApp } from './helpers/TownsTestApp'
import { RegisterWallet, TransactionInfo } from './helpers/TestComponents'
import { TownsTestWeb3Provider } from './helpers/TownsTestWeb3Provider'
import { makeUniqueName } from './helpers/TestUtils'
import { useSpaceDataWithId } from '../../src/hooks/use-space-data'
import { useMyChannels } from '../../src/hooks/use-my-channels'
import { useCreateSpaceTransactionWithRetries } from '../../src/hooks/use-create-space-transaction'
import { useCreateChannelTransaction } from '../../src/hooks/use-create-channel-transaction'
import { CreateChannelInfo } from '../../src/types/towns-types'
import { SpaceContextProvider } from '../../src/components/SpaceContextProvider'
import { TestConstants } from './helpers/TestConstants'
import { NoopRuleData } from '@river-build/web3'
import { getDynamicPricingModule } from '../../src/utils/web3'
import { useTownsClient } from '../../src/hooks/use-towns-client'
import { ethers } from 'ethers'

/// regression, channels weren't showing in sidebar after they were created
describe('createSpaceChannelHooks', () => {
    test('test that channels render after creation', async () => {
        // create a wallet for bob
        const aliceProvider = new TownsTestWeb3Provider()
        // add funds
        await aliceProvider.fundWallet()
        await aliceProvider.mintMockNFT()

        // create a veiw for bob
        const TestComponent = () => {
            const { leaveRoom, spaceDapp } = useTownsClient()
            const spaceTransaction = useCreateSpaceTransactionWithRetries()
            const { createSpaceTransactionWithRetries } = spaceTransaction
            const channelTransaction = useCreateChannelTransaction()
            const { createChannelTransaction } = channelTransaction
            const [spaceId, setSpaceId] = useState<string | undefined>(undefined)
            const spaceData = useSpaceDataWithId(spaceId)

            const channelGroups = useMyChannels(spaceData)

            const onClickCreateSpace = useCallback(() => {
                const name = makeUniqueName('aliceSpace')
                void (async () => {
                    // TODO: hook up pricing module to form pricing options
                    const dynamicPricingModule = await getDynamicPricingModule(spaceDapp)

                    const result = await createSpaceTransactionWithRetries(
                        {
                            name: name,
                        },
                        {
                            settings: {
                                name,
                                symbol: 'MEMBER',
                                price: 0,
                                maxSupply: 1000,
                                duration: 0,
                                currency: ethers.constants.AddressZero,
                                feeRecipient: ethers.constants.AddressZero,
                                freeAllocation: 0,
                                pricingModule: dynamicPricingModule.module,
                            },
                            permissions: [],
                            requirements: {
                                everyone: true,
                                users: [],
                                ruleData: NoopRuleData,
                            },
                        },

                        aliceProvider.wallet,
                    )
                    setSpaceId(result?.data?.spaceId)
                    console.log('onClickCreateSpace', { name, result })
                })()
            }, [createSpaceTransactionWithRetries, spaceDapp])
            const onClickCreateChannel = useCallback(() => {
                const name = makeUniqueName('aliceChannel')
                const parentSpaceId = spaceId
                if (!parentSpaceId) {
                    throw new Error('no spaceId')
                }
                void (async () => {
                    const createRoomInfo: CreateChannelInfo = {
                        name,
                        parentSpaceId,
                        roleIds: [],
                    }

                    await createChannelTransaction(createRoomInfo, aliceProvider.wallet)
                    console.log('onClickCreateChannel', name)
                })()
            }, [createChannelTransaction, spaceId])
            const onClickLeaveChannel = useCallback(() => {
                console.log('onClickLeaveChannel:start')
                const channel = channelGroups
                    ?.at(0)
                    ?.channels?.find((c) => c.label.includes('aliceChannel'))
                if (!channel) {
                    throw new Error('no channel')
                }
                void leaveRoom(channel.id)
                console.log('onClickLeaveChannel:END', channel)
            }, [channelGroups, leaveRoom])

            return (
                <>
                    <RegisterWallet signer={aliceProvider.wallet} />
                    <button onClick={onClickCreateSpace}>createSpace</button>
                    <button onClick={onClickCreateChannel}>createChannel</button>
                    <button onClick={onClickLeaveChannel}>leaveChannel</button>
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
            <TownsTestApp provider={aliceProvider}>
                <SpaceContextProvider spaceId={undefined}>
                    <TestComponent />
                </SpaceContextProvider>
            </TownsTestApp>,
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
        const leaveChannel = screen.getByRole('button', {
            name: 'leaveChannel',
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
        fireEvent.click(leaveChannel)
        // the space data should update
        await waitFor(
            () => expect(channelGroups).not.toHaveTextContent('aliceChannel'),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        // space data remains unchanged
        expect(spaceData).toHaveTextContent('aliceChannel')
    }, 180_000) // end test with bob
}) // end describe
